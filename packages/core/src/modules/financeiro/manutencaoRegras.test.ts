/**
 * 🧪 TESTES DAS DECISÕES DA TELA DE EXCLUSÃO EM LOTE (PJODC v10)
 * Local: packages/core/src/modules/financeiro/manutencaoRegras.test.ts
 *
 * Rode com `npm test` na raiz do repositório.
 *
 * ⚠️ POR QUE ESTE ARQUIVO EXISTE. A exclusão em lote é a operação mais
 * destrutiva do módulo, e a parte dela que o banco NÃO protege é a tela: o
 * banco garante que só sai o que pode sair, mas não garante que a pessoa
 * entendeu QUANTO ia sair. Essa parte erra em silêncio — nada quebra, nada
 * acusa, e o número na confirmação simplesmente não corresponde ao que está na
 * tela.
 *
 * Cada teste aqui é um jeito de esse silêncio acontecer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  avaliarExclusao,
  mesmoFiltro,
  resumirExclusao,
  linhaAbreFicha,
  recadoDeExclusao,
  fraseDeReversibilidade,
  type FiltroDeExclusao,
  type SimulacaoFeita,
} from './manutencaoRegras.ts';
import type { RelatorioDeExclusao } from './manutencaoService.ts';

const filtro = (over: Partial<FiltroDeExclusao> = {}): FiltroDeExclusao => ({
  contaMovimentoId: 'conta-1',
  dataInicial: '2026-09-01',
  dataFinal: '2026-09-30',
  idsSelecionados: null,
  ...over,
});

const relatorio = (over: Partial<RelatorioDeExclusao> = {}): RelatorioDeExclusao => ({
  simulacao: true,
  lancamentos: 137,
  foraDoFiltro: 0,
  transferencias: 0,
  contas: ['CAIXA'],
  apagados: 0,
  ...over,
});

const simulacao = (
  f: FiltroDeExclusao = filtro(),
  r: RelatorioDeExclusao = relatorio(),
): SimulacaoFeita => ({ filtro: f, relatorio: r });

// ---------------------------------------------------------------------------
// A PORTA DA EXCLUSÃO
// ---------------------------------------------------------------------------

test('sem datas, o botao fica desligado e diz o porque', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ dataInicial: '', dataFinal: '' }),
    simulacao: null,
    textoDigitado: '',
  });
  assert.equal(v.podeExcluir, false);
  assert.equal(v.motivo, 'SEM_DATAS');
  assert.match(v.aviso ?? '', /DATA INICIAL/);
});

test('data final antes da inicial e recusada antes de qualquer viagem ao banco', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ dataInicial: '2026-09-30', dataFinal: '2026-09-01' }),
    simulacao: null,
    textoDigitado: '',
  });
  assert.equal(v.motivo, 'DATAS_INVERTIDAS');
});

test('sem ter conferido antes, nao da para excluir', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro(),
    simulacao: null,
    textoDigitado: '137',
  });
  assert.equal(v.motivo, 'SEM_SIMULACAO');
});

/**
 * ⚠️ ESTE É O TESTE MAIS IMPORTANTE DO ARQUIVO.
 *
 * O defeito que ele impede: a pessoa confere setembro (137 registros), depois
 * troca a data para janeiro e clica em EXCLUIR. Sem esta trava, o botão
 * continuaria dizendo "137" — um número que não tem mais nenhuma relação com o
 * que está na tela — e a exclusão sairia com o filtro NOVO.
 *
 * É a mesma classe de defeito da sugestão de ordem presa a `[contaId, data]`,
 * de 16/09/2026: resultado calculado com parâmetro que já mudou.
 */
test('mexer no filtro DEPOIS de conferir invalida a conferencia', () => {
  const feita = simulacao(filtro({ dataInicial: '2026-09-01', dataFinal: '2026-09-30' }));

  const v = avaliarExclusao({
    filtroAtual: filtro({ dataInicial: '2026-01-01', dataFinal: '2026-01-31' }),
    simulacao: feita,
    textoDigitado: '137',
  });

  assert.equal(v.podeExcluir, false);
  assert.equal(v.motivo, 'SIMULACAO_VENCIDA');
  // O aviso passou a citar tambem os MARCADOS em 17/09/2026 (2a rodada), porque
  // mexer nas caixas invalida a conferencia pelo mesmo motivo que mexer na data.
  assert.match(v.aviso ?? '', /MUDARAM DEPOIS DA CONFER/);
});

test('trocar so a CONTA tambem invalida a conferencia', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ contaMovimentoId: 'conta-2' }),
    simulacao: simulacao(filtro({ contaMovimentoId: 'conta-1' })),
    textoDigitado: '137',
  });
  assert.equal(v.motivo, 'SIMULACAO_VENCIDA');
});

test('trocar de uma conta para TODAS as contas invalida a conferencia', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ contaMovimentoId: null }),
    simulacao: simulacao(filtro({ contaMovimentoId: 'conta-1' })),
    textoDigitado: '137',
  });
  assert.equal(v.motivo, 'SIMULACAO_VENCIDA');
});

test('conferencia que nao achou nada nao libera o botao', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro(),
    simulacao: simulacao(filtro(), relatorio({ lancamentos: 0, contas: [] })),
    textoDigitado: '0',
  });
  assert.equal(v.motivo, 'NADA_A_EXCLUIR');
});

test('numero digitado diferente do conferido nao libera', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro(),
    simulacao: simulacao(),
    textoDigitado: '13',
  });
  assert.equal(v.motivo, 'CONFIRMACAO_NAO_CONFERE');
});

test('numero certo com espaco em volta e aceito (colar traz espaco)', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro(),
    simulacao: simulacao(),
    textoDigitado: '  137 ',
  });
  assert.equal(v.podeExcluir, true);
  assert.equal(v.motivo, null);
});

test('tudo certo libera o botao', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro(),
    simulacao: simulacao(),
    textoDigitado: '137',
  });
  assert.equal(v.podeExcluir, true);
  assert.equal(v.aviso, null);
});

test('mesmoFiltro trata null e undefined como a mesma coisa (TODAS as contas)', () => {
  assert.equal(
    mesmoFiltro(
      { contaMovimentoId: null, dataInicial: '2026-09-01', dataFinal: '2026-09-30', idsSelecionados: null },
      { contaMovimentoId: null, dataInicial: '2026-09-01', dataFinal: '2026-09-30', idsSelecionados: null },
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// A SELECAO POR REGISTRO (17/09/2026, 2a rodada)
// ---------------------------------------------------------------------------

/**
 * ⚠️ `null` e `[]` NAO PODEM SER A MESMA COISA.
 *
 * `null` = "nao estou escolhendo, leve o periodo inteiro".
 * `[]`   = "desmarquei tudo, nao leve nada".
 *
 * Se os dois fossem iguais, DESMARCAR TODOS e confirmar apagaria justamente o
 * mes inteiro - o contrario exato do que a pessoa pediu.
 */
test('selecao vazia NAO e o mesmo que selecao ausente', () => {
  assert.equal(
    mesmoFiltro(filtro({ idsSelecionados: null }), filtro({ idsSelecionados: [] })),
    false,
  );
});

test('desmarcar tudo bloqueia o botao com o motivo certo', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ idsSelecionados: [] }),
    simulacao: null,
    textoDigitado: '',
  });
  assert.equal(v.podeExcluir, false);
  assert.equal(v.motivo, 'NADA_MARCADO');
  assert.match(v.aviso ?? '', /MARQUE AO MENOS UM/);
});

test('a ordem dos marcados nao muda a identidade da selecao', () => {
  assert.equal(
    mesmoFiltro(filtro({ idsSelecionados: ['a', 'b', 'c'] }),
                filtro({ idsSelecionados: ['c', 'a', 'b'] })),
    true,
  );
});

/**
 * ⭐ A trava irma da "simulacao vencida": conferir, e DEPOIS mexer nas
 * caixas. O numero na confirmacao passaria a nao ter relacao com o que esta
 * marcado na tela.
 */
test('marcar ou desmarcar DEPOIS de conferir invalida a conferencia', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ idsSelecionados: ['a', 'b'] }),
    simulacao: simulacao(filtro({ idsSelecionados: ['a', 'b', 'c'] })),
    textoDigitado: '137',
  });
  assert.equal(v.podeExcluir, false);
  assert.equal(v.motivo, 'SIMULACAO_VENCIDA');
});

test('selecao identica mantem a conferencia valida', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ idsSelecionados: ['a', 'b'] }),
    simulacao: simulacao(filtro({ idsSelecionados: ['b', 'a'] })),
    textoDigitado: '137',
  });
  assert.equal(v.podeExcluir, true);
});

test('trocar um marcado por outro, mantendo a quantidade, invalida a conferencia', () => {
  const v = avaliarExclusao({
    filtroAtual: filtro({ idsSelecionados: ['a', 'z'] }),
    simulacao: simulacao(filtro({ idsSelecionados: ['a', 'b'] })),
    textoDigitado: '137',
  });
  assert.equal(v.motivo, 'SIMULACAO_VENCIDA');
});

// ---------------------------------------------------------------------------
// O RESUMO QUE A PESSOA LÊ ANTES DE CONFIRMAR
// ---------------------------------------------------------------------------

test('resumo sem transferencia nao inventa aviso de outras contas', () => {
  const frases = resumirExclusao(relatorio({ lancamentos: 5 }));
  assert.match(frases[0], /5 LANÇAMENTO/);
  assert.equal(frases.some((f) => f.includes('FORA DO FILTRO')), false);
});

/**
 * ⚠️ O aviso das OUTRAS CONTAS é a informação que separa uma exclusão
 * consciente de uma surpresa no saldo. Se esta frase sumir, a tela deixa de
 * dizer que apagar o CAIXA vai mexer no BANCO.
 */
test('resumo AVISA quando lancamentos de outras contas vao sair junto', () => {
  const frases = resumirExclusao(
    relatorio({ lancamentos: 10, foraDoFiltro: 4, transferencias: 4, contas: ['CAIXA', 'BANCO'] }),
  );
  assert.equal(frases.some((f) => f.includes('FORA DO FILTRO')), true);
  assert.equal(frases.some((f) => f.includes('4 TRANSFERÊNCIA')), true);
  assert.equal(frases.some((f) => f.includes('CAIXA, BANCO')), true);
});

test('resumo de periodo vazio diz que nada sera excluido', () => {
  const frases = resumirExclusao(relatorio({ lancamentos: 0, contas: [] }));
  assert.equal(frases.length, 1);
  assert.match(frases[0], /NADA SERÁ EXCLUÍDO/);
});

test('resumo sempre lembra que da para restaurar', () => {
  const frases = resumirExclusao(relatorio({ lancamentos: 3 }));
  assert.equal(frases.some((f) => f.includes('LIXEIRA')), true);
});

// ---------------------------------------------------------------------------
// QUAL LINHA DA TABELA ABRE A FICHA
// ---------------------------------------------------------------------------

test('linha de lancamento do extrato abre a ficha', () => {
  assert.equal(linhaAbreFicha({ linha_tipo: 'LANCAMENTO', lancamento_id: 'abc' }), true);
});

test('SALDO INICIAL e TOTAIS nao abrem ficha (sao somas, nao registros)', () => {
  assert.equal(linhaAbreFicha({ linha_tipo: 'INICIAL', lancamento_id: null }), false);
  assert.equal(linhaAbreFicha({ linha_tipo: 'TOTAL', lancamento_id: null }), false);
});

test('linha da PESQUISAR abre pelo proprio id, sem linha_tipo', () => {
  assert.equal(linhaAbreFicha({ id: 'abc' }), true);
});

test('linha sem id nenhum nao abre (nao ha ficha para buscar)', () => {
  assert.equal(linhaAbreFicha({ linha_tipo: 'LANCAMENTO', lancamento_id: null }), false);
  assert.equal(linhaAbreFicha({}), false);
});

// ===========================================================================
// O RECADO DEPOIS DE EXCLUIR — 18/09/2026
// ===========================================================================
// A tela dizia "ESTA AÇÃO NÃO PODE SER DESFEITA", o que deixou de ser verdade
// quando a lixeira nasceu. Estes testes fixam as duas coisas que não podem
// voltar a acontecer: a frase nunca mais pode negar a lixeira, e nunca pode
// prometer a restauração a quem não tem a permissão de restaurar.

test('o recado NUNCA diz que a exclusao nao tem volta', () => {
  for (const podeRestaurar of [true, false]) {
    const r = recadoDeExclusao({ apagados: 1, eraTransferencia: false, podeRestaurar });
    assert.ok(r.texto.includes('LIXEIRA'), 'o recado tem de citar a lixeira');
    assert.ok(!r.texto.includes('NÃO PODE SER DESFEITA'));
    assert.ok(!fraseDeReversibilidade(podeRestaurar).includes('NÃO PODE SER DESFEIT'));
  }
});

test('quem nao pode restaurar nao recebe promessa nem atalho', () => {
  const semPermissao = recadoDeExclusao({ apagados: 1, eraTransferencia: false, podeRestaurar: false });
  // Ele precisa saber que o registro existe — e a quem pedir.
  assert.ok(semPermissao.texto.includes('PROPRIETÁRIO'));
  // E não pode receber um atalho para uma tela que vai recusá-lo.
  assert.equal(semPermissao.ofereceLixeira, false);

  const comPermissao = recadoDeExclusao({ apagados: 1, eraTransferencia: false, podeRestaurar: true });
  assert.equal(comPermissao.ofereceLixeira, true);
  assert.ok(!comPermissao.texto.includes('PROPRIETÁRIO'));
});

test('a transferencia e anunciada com o numero de pernas que sairam', () => {
  const r = recadoDeExclusao({ apagados: 2, eraTransferencia: true, podeRestaurar: true });
  assert.ok(r.texto.startsWith('TRANSFERÊNCIA EXCLUÍDA: 2 LANÇAMENTO(S)'));

  const comum = recadoDeExclusao({ apagados: 1, eraTransferencia: false, podeRestaurar: true });
  assert.ok(comum.texto.startsWith('LANÇAMENTO EXCLUÍDO.'));
});
