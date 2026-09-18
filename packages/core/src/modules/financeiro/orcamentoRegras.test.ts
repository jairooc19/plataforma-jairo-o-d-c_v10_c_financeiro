/**
 * 🧪 TESTES DAS DECISÕES DO ORÇAMENTO E DA BARRA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/orcamentoRegras.test.ts
 *
 * Rode com `npm test` na raiz do repositório.
 *
 * ⚠️ O QUE ELES COBREM: a leitura da barra — a cor, a largura e a frase ao
 * lado. É onde mora a decisão que erra em silêncio: pintar de verde uma receita
 * que não entrou, ou escrever "RESTAM" num orçamento estourado.
 *
 * ⚠️ O QUE ELES **NÃO** COBREM: se os NÚMEROS estão certos. Isso é das travas
 * 42 a 50 do `teste_financeiro.sql`, que rodam contra o banco de verdade — e é
 * lá que está a trava do modo percentual, a mais importante da rodada.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  faixaDeConsumo,
  larguraDaBarra,
  situacaoDaLinha,
  agruparEmBlocos,
  rotuloDoBlocoDeOrcamento,
  temOrcamento,
  orcamentoExistente,
} from './orcamentoRegras.ts';
import type { LinhaDoDinheiro, LinhaDoOrcamento } from './tipos.ts';

/** Formatador simples: 31200 → "312,00". O de verdade é o `formatarBRL`. */
const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',');

const linha = (over: Partial<LinhaDoDinheiro> = {}): LinhaDoDinheiro => ({
  bloco: 'DESPESA',
  linha_tipo: 'CONTA',
  conta_id: 'c1',
  nome: 'ENERGIA ELÉTRICA',
  tipo: 'DESPESA',
  orcado_centavos: 40000,
  realizado_centavos: 31200,
  saldo_centavos: 8800,
  consumo_percentual: 78,
  estourou: false,
  ...over,
});

const orcamento = (over: Partial<LinhaDoOrcamento> = {}): LinhaDoOrcamento => ({
  bloco: 'DESPESA',
  linha_tipo: 'CONTA',
  orcamento_id: 'o1',
  conta_id: 'c1',
  nome: 'ENERGIA ELÉTRICA',
  is_active: true,
  valor_centavos: 40000,
  observacao: null,
  ...over,
});

// ===========================================================================
// A COR DA BARRA
// ===========================================================================

test('na DESPESA, a barra fica vermelha só depois de estourar', () => {
  assert.equal(faixaDeConsumo(0, 'DESPESA'), 'VERDE');
  assert.equal(faixaDeConsumo(79, 'DESPESA'), 'VERDE');
  assert.equal(faixaDeConsumo(80, 'DESPESA'), 'AMBAR');
  assert.equal(faixaDeConsumo(100, 'DESPESA'), 'AMBAR');   // no limite ainda não estourou
  assert.equal(faixaDeConsumo(101, 'DESPESA'), 'VERMELHO');
});

test('na RECEITA o sentido SE INVERTE — 100% é a boa notícia', () => {
  // Usar a mesma escala das despesas pintaria de verde uma receita que não
  // entrou, e de vermelho uma meta cumprida.
  assert.equal(faixaDeConsumo(100, 'RECEITA'), 'VERDE');
  assert.equal(faixaDeConsumo(140, 'RECEITA'), 'VERDE');   // superou a meta: ótimo
  assert.equal(faixaDeConsumo(85, 'RECEITA'), 'AMBAR');
  assert.equal(faixaDeConsumo(40, 'RECEITA'), 'VERMELHO'); // a receita não veio
});

test('OUTRAS segue a escala da despesa, e o tipo ausente também', () => {
  assert.equal(faixaDeConsumo(120, 'OUTRAS'), 'VERMELHO');
  assert.equal(faixaDeConsumo(50, null), 'VERDE');
  assert.equal(faixaDeConsumo(null, 'DESPESA'), 'VERDE');
});

// ===========================================================================
// A LARGURA
// ===========================================================================

test('a barra nunca passa de 100% nem fica negativa', () => {
  // 140% desenharia uma barra vazando para fora da célula e empurrando a tabela
  // inteira; quem conta que estourou é a COR, não o comprimento.
  assert.equal(larguraDaBarra(78), 78);
  assert.equal(larguraDaBarra(140), 100);
  assert.equal(larguraDaBarra(-30), 0);
  assert.equal(larguraDaBarra(null), 0);
});

// ===========================================================================
// A FRASE AO LADO
// ===========================================================================

test('a despesa diz quanto RESTA, e quanto ESTOUROU', () => {
  assert.deepEqual(situacaoDaLinha(linha(), reais), { texto: 'RESTAM 88,00', destaque: false });
  assert.deepEqual(situacaoDaLinha(linha({ saldo_centavos: 0 }), reais),
    { texto: 'SEM FOLGA', destaque: true });
  assert.deepEqual(situacaoDaLinha(linha({ saldo_centavos: -34000, consumo_percentual: 104 }), reais),
    { texto: 'ESTOUROU EM 340,00', destaque: true });
});

test('a receita diz quanto FALTA, e avisa a meta atingida', () => {
  const rec = { bloco: 'RECEITA' as const, tipo: 'RECEITA' as const };
  assert.deepEqual(situacaoDaLinha(linha({ ...rec, saldo_centavos: 210000, consumo_percentual: 85 }), reais),
    { texto: 'FALTAM 2100,00', destaque: false });
  assert.deepEqual(situacaoDaLinha(linha({ ...rec, saldo_centavos: 0, consumo_percentual: 100 }), reais),
    { texto: 'META ATINGIDA', destaque: true });
  // superar a meta também é "atingida", e não "estourou"
  assert.deepEqual(situacaoDaLinha(linha({ ...rec, saldo_centavos: -5000, consumo_percentual: 112 }), reais),
    { texto: 'META ATINGIDA', destaque: true });
});

test('no MODO PERCENTUAL a frase não cita valor nenhum', () => {
  // ⚠️ É a metade visível da trava mais importante da rodada. O banco devolve
  // saldo NULO; se a frase inventasse um número aqui, o sigilo de lá perderia o
  // sentido — e pior, mostraria um valor ERRADO.
  const oculto = { orcado_centavos: null, realizado_centavos: null, saldo_centavos: null };
  const texto = (l: Partial<LinhaDoDinheiro>) => situacaoDaLinha(linha({ ...oculto, ...l }), reais).texto;

  assert.equal(texto({ consumo_percentual: 78 }), '78% CONSUMIDO');
  assert.equal(texto({ consumo_percentual: 112 }), 'ESTOUROU (112%)');
  assert.equal(texto({ bloco: 'RECEITA', tipo: 'RECEITA', consumo_percentual: 85 }), '85% DA META');
  assert.equal(texto({ bloco: 'RECEITA', tipo: 'RECEITA', consumo_percentual: 100 }), 'META ATINGIDA');

  // nenhuma das frases pode conter dígito seguido de vírgula (um valor em reais)
  for (const t of [texto({ consumo_percentual: 78 }), texto({ consumo_percentual: 112 })]) {
    assert.ok(!/\d,\d\d/.test(t), `a frase "${t}" vazou um valor`);
  }
});

test('o bloco FORA diz por que aquela conta está ali', () => {
  const t = situacaoDaLinha(linha({ bloco: 'FORA', orcado_centavos: null, saldo_centavos: null }), reais);
  assert.equal(t.texto, 'SEM ORÇAMENTO NESTA COMPETÊNCIA');
  assert.equal(t.destaque, true);
});

// ===========================================================================
// OS BLOCOS
// ===========================================================================

test('agruparEmBlocos separa contas de totais e preserva a ordem do banco', () => {
  const blocos = agruparEmBlocos([
    orcamento({ bloco: 'RECEITA', nome: 'VENDA', conta_id: 'r1' }),
    orcamento({ bloco: 'RECEITA', linha_tipo: 'TOTAL', conta_id: null, nome: null, valor_centavos: 1400000 }),
    orcamento({ bloco: 'DESPESA', nome: 'ALUGUEL', conta_id: 'd1' }),
    orcamento({ bloco: 'DESPESA', linha_tipo: 'TOTAL', conta_id: null, nome: null, valor_centavos: 250000 }),
  ]);

  assert.deepEqual(blocos.map((b) => b.chave), ['RECEITA', 'DESPESA']);
  assert.equal(blocos[0].rotulo, 'RECEITAS');
  assert.equal(blocos[0].linhas.length, 1);
  assert.equal(blocos[0].total?.valor_centavos, 1400000);
  assert.equal(blocos[1].total?.valor_centavos, 250000);
});

test('um bloco sem total não inventa um', () => {
  // O bloco FORA não tem total: somar "o que não foi orçado" com "o que foi"
  // daria um número sem significado.
  const blocos = agruparEmBlocos([orcamento({ bloco: 'OUTRAS' })]);
  assert.equal(blocos[0].total, null);
});

test('rotuloDoBlocoDeOrcamento traduz, e devolve o próprio nome no que não conhece', () => {
  assert.equal(rotuloDoBlocoDeOrcamento('FORA'), 'GASTO FORA DO ORÇAMENTO');
  assert.equal(rotuloDoBlocoDeOrcamento('RESULTADO'), 'RESULTADO DO MÊS');
  assert.equal(rotuloDoBlocoDeOrcamento('INVENTADO'), 'INVENTADO');
});

// ===========================================================================
// A COMPETÊNCIA TEM ORÇAMENTO?
// ===========================================================================

test('temOrcamento olha as linhas de CONTA, não o tamanho da lista', () => {
  assert.equal(temOrcamento([]), false);
  assert.equal(temOrcamento([orcamento({ linha_tipo: 'TOTAL', conta_id: null })]), false);
  assert.equal(temOrcamento([orcamento()]), true);
});

test('orcamentoExistente acha a linha da conta, para a tela perguntar antes', () => {
  const lista = [orcamento({ conta_id: 'c1' }), orcamento({ conta_id: 'c2', valor_centavos: 9900 })];
  assert.equal(orcamentoExistente(lista, 'c2')?.valor_centavos, 9900);
  assert.equal(orcamentoExistente(lista, 'c9'), null);
  // a linha de TOTAL nunca é confundida com uma conta
  assert.equal(orcamentoExistente([orcamento({ linha_tipo: 'TOTAL', conta_id: null })], 'c1'), null);
});
