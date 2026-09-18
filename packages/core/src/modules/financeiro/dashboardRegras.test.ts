/**
 * 🧪 TESTES DAS DECISÕES DOS DOIS DASHBOARDS (PJODC v10)
 * Local: packages/core/src/modules/financeiro/dashboardRegras.test.ts
 *
 * Rode com `npm test` na raiz do repositório.
 *
 * ⚠️ O QUE ESTES TESTES COBREM, E O QUE ELES NÃO COBREM. Eles cobrem a
 * ARRUMAÇÃO: pegar as linhas "longas" do banco (uma por conta e por mês) e
 * montar a grade de doze colunas, com os totais no lugar certo e a coluna do
 * ano existindo só onde somar faz sentido. Eles NÃO cobrem clique, foco nem
 * propagação de evento — o `node --test` não lê JSX, e fingir que cobre seria
 * pior do que dizer o que falta.
 *
 * As travas 35 a 40 do `teste_financeiro.sql` cobrem a outra metade: se os
 * NÚMEROS que chegam aqui estão certos.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ehMesFuturo,
  montarGradeDeSaldos,
  montarGradeDeMovimentos,
  rotuloDoBloco,
} from './dashboardRegras.ts';
import { montarRelatorio, colunasDoRelatorio, colunasNumericas } from './dashboardRelatorio.ts';
import type { LinhaSaldoMensal, LinhaMovimentoMensal } from './tipos.ts';

const ctx = { ano: 2026, hoje: '2026-09-18' };

/** Os mesmos rótulos que a tela passa — `MESES_CURTOS`, de `lib/datas.ts`. */
const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

/** Doze linhas de uma conta, com os saldos que vierem (o resto repete o último). */
function saldos(
  nome: string,
  bloco: 'CAIXA_BANCO' | 'OUTRAS',
  valores: number[],
  extra: Partial<LinhaSaldoMensal> = {},
): LinhaSaldoMensal[] {
  return valores.map((v, i) => ({
    bloco,
    linha_tipo: 'CONTA',
    conta_id: `id-${nome}`,
    nome,
    tipo: bloco === 'OUTRAS' ? 'OUTRAS' : 'CAIXA',
    is_active: true,
    mes: i + 1,
    saldo_centavos: v,
    entradas_centavos: 0,
    saidas_centavos: 0,
    fechado: false,
    ...extra,
  }));
}

function movimentos(
  nome: string,
  bloco: 'RECEITA' | 'DESPESA' | 'OUTRAS' | 'RESULTADO',
  valores: number[],
  extra: Partial<LinhaMovimentoMensal> = {},
): LinhaMovimentoMensal[] {
  return valores.map((v, i) => ({
    bloco,
    linha_tipo: 'CONTA',
    conta_id: `id-${nome}`,
    nome,
    tipo: bloco === 'RESULTADO' ? 'OUTRAS' : bloco,
    is_active: true,
    is_sistema: false,
    mes: i + 1,
    entradas_centavos: 0,
    saidas_centavos: 0,
    liquido_centavos: v,
    ...extra,
  }));
}

// ===========================================================================
// A GRADE DE SALDOS
// ===========================================================================

test('a grade sempre tem 12 colunas, mesmo com o banco devolvendo menos meses', () => {
  // Se um mês sumisse e a tela mostrasse 11 colunas, ninguém contaria os meses
  // para perceber — e o ano pareceria ter acabado em novembro.
  const grade = montarGradeDeSaldos(saldos('CAIXA', 'CAIXA_BANCO', [100, 200, 300]), ctx);
  assert.equal(grade[0].linhas[0].celulas.length, 12);
  assert.equal(grade[0].linhas[0].celulas[11].mes, 12);
  assert.equal(grade[0].linhas[0].celulas[11].valorCentavos, 0);
});

test('o saldo NÃO ganha coluna de total do ano — somar 12 saldos não significa nada', () => {
  const grade = montarGradeDeSaldos(saldos('CAIXA', 'CAIXA_BANCO', [125000, 98000, 260000]), ctx);
  assert.equal(grade[0].linhas[0].totalDoAnoCentavos, null);
  assert.deepEqual(colunasDoRelatorio(MESES, false).length, 13);
});

test('a conta desativada continua na grade, marcada como inativa', () => {
  const grade = montarGradeDeSaldos(
    saldos('BANCO ENCERRADO', 'CAIXA_BANCO', [680000], { is_active: false }),
    ctx,
  );
  assert.equal(grade[0].linhas[0].inativa, true);
  assert.equal(grade[0].linhas[0].celulas[0].valorCentavos, 680000);
});

test('a linha de TOTAL vai para o fim do bloco, mesmo chegando no meio', () => {
  const linhas: LinhaSaldoMensal[] = [
    ...saldos('A CONTA', 'CAIXA_BANCO', [100]),
    {
      bloco: 'CAIXA_BANCO', linha_tipo: 'TOTAL', conta_id: null, nome: null, tipo: null,
      is_active: null, mes: 1, saldo_centavos: 300, entradas_centavos: 0,
      saidas_centavos: 0, fechado: false,
    },
    ...saldos('Z CONTA', 'CAIXA_BANCO', [200]),
  ];
  const bloco = montarGradeDeSaldos(linhas, ctx)[0];
  assert.equal(bloco.linhas.length, 3);
  assert.equal(bloco.linhas[2].ehTotal, true);
  assert.equal(bloco.linhas[2].nome, 'TOTAL CAIXA E BANCO');
  assert.equal(bloco.linhas[2].celulas[0].valorCentavos, 300);
});

test('bloco sem nenhuma linha não aparece', () => {
  // Uma empresa que só tem conta de CAIXA não deve ver uma tabela "OUTRAS" vazia.
  const grade = montarGradeDeSaldos(saldos('CAIXA', 'CAIXA_BANCO', [100]), ctx);
  assert.equal(grade.length, 1);
  assert.equal(grade[0].chave, 'CAIXA_BANCO');
});

// ===========================================================================
// O MÊS FUTURO — a previsão que se parece com fato
// ===========================================================================

test('o mês CORRENTE não é futuro; os seguintes são', () => {
  assert.equal(ehMesFuturo(2026, 9, '2026-09-18'), false);  // em curso
  assert.equal(ehMesFuturo(2026, 8, '2026-09-18'), false);  // passado
  assert.equal(ehMesFuturo(2026, 10, '2026-09-18'), true);  // à frente
  assert.equal(ehMesFuturo(2027, 1, '2026-09-18'), true);   // outro ano
  assert.equal(ehMesFuturo(2025, 12, '2026-09-18'), false); // ano anterior
});

// ===========================================================================
// A GRADE DE MOVIMENTOS
// ===========================================================================

test('o movimento GANHA a coluna de total do ano — fluxo se soma', () => {
  const grade = montarGradeDeMovimentos(movimentos('ENERGIA', 'DESPESA', [38000, 41200, 35000]), ctx);
  assert.equal(grade[0].linhas[0].totalDoAnoCentavos, 114200);
  assert.equal(colunasDoRelatorio(MESES, true).length, 14);
});

test('a ordem dos blocos é receitas, despesas, resultado e outras', () => {
  const grade = montarGradeDeMovimentos([
    ...movimentos('OUTRA COISA', 'OUTRAS', [500]),
    ...movimentos('ENERGIA', 'DESPESA', [380]),
    ...movimentos('VENDA', 'RECEITA', [1000]),
    ...movimentos('', 'RESULTADO', [620], { linha_tipo: 'TOTAL', conta_id: null, nome: null }),
  ], ctx);
  assert.deepEqual(grade.map((b) => b.chave), ['RECEITA', 'DESPESA', 'RESULTADO', 'OUTRAS']);
});

test('ocultar a transferência esconde a linha e NÃO mexe no total', () => {
  // O total vem do banco contando tudo — é ele que tem de bater com a
  // conferência. Recalcular aqui criaria uma segunda conta do mesmo número.
  const linhas: LinhaMovimentoMensal[] = [
    ...movimentos('APORTE', 'OUTRAS', [500000]),
    ...movimentos('TRANSFERÊNCIA ENTRE CONTAS', 'OUTRAS', [0], { is_sistema: true }),
    {
      bloco: 'OUTRAS', linha_tipo: 'TOTAL', conta_id: null, nome: null, tipo: null,
      is_active: null, is_sistema: null, mes: 1,
      entradas_centavos: 0, saidas_centavos: 0, liquido_centavos: 500000,
    },
  ];

  const com = montarGradeDeMovimentos(linhas, ctx);
  const sem = montarGradeDeMovimentos(linhas, { ...ctx, ocultarTransferencias: true });

  assert.equal(com[0].linhas.length, 3);
  assert.equal(sem[0].linhas.length, 2);
  assert.ok(!sem[0].linhas.some((l) => l.ehSistema));
  // o total continua idêntico nos dois casos
  assert.equal(com[0].linhas.at(-1)!.celulas[0].valorCentavos, 500000);
  assert.equal(sem[0].linhas.at(-1)!.celulas[0].valorCentavos, 500000);
});

test('rotuloDoBloco traduz os blocos e devolve o próprio nome no que não conhece', () => {
  assert.equal(rotuloDoBloco('CAIXA_BANCO'), 'CAIXA E BANCO');
  assert.equal(rotuloDoBloco('RECEITA'), 'RECEITAS');
  assert.equal(rotuloDoBloco('INVENTADO'), 'INVENTADO');
});

// ===========================================================================
// O RELATÓRIO — a mesma grade virando papel e planilha
// ===========================================================================

const formatar = (c: number) => (c / 100).toFixed(2).replace('.', ',');

test('o relatório escreve o título do bloco e destaca títulos e totais', () => {
  const grade = montarGradeDeSaldos([
    ...saldos('CAIXA', 'CAIXA_BANCO', [125000]),
    {
      bloco: 'CAIXA_BANCO', linha_tipo: 'TOTAL', conta_id: null, nome: null, tipo: null,
      is_active: null, mes: 1, saldo_centavos: 125000, entradas_centavos: 0,
      saidas_centavos: 0, fechado: false,
    },
  ], ctx);

  const r = montarRelatorio(grade, { meses: MESES, formatarValor: formatar, comTotalDoAno: false });

  assert.equal(r.linhas[0][0], 'CAIXA E BANCO');       // título do bloco
  assert.equal(r.linhas[1][0], 'CAIXA');               // a conta
  assert.equal(r.linhas[1][1], '1250,00');             // janeiro
  assert.equal(r.linhas[2][0], 'TOTAL CAIXA E BANCO'); // o total
  assert.deepEqual(r.destaques, [0, 2]);               // título e total em negrito
});

test('toda linha do relatório tem exatamente a largura do cabeçalho', () => {
  // Uma linha mais curta que o cabeçalho desalinha a tabela inteira dali para
  // baixo, no papel e na planilha — e não quebra nada que acuse.
  const grade = montarGradeDeMovimentos(movimentos('VENDA', 'RECEITA', [1000, 2000]), ctx);
  const r = montarRelatorio(grade, { meses: MESES, formatarValor: formatar, comTotalDoAno: true });
  assert.equal(r.colunas.length, 14);
  for (const linha of r.linhas) assert.equal(linha.length, 14);
});

test('a conta inativa leva a marca para o papel', () => {
  const grade = montarGradeDeSaldos(
    saldos('BANCO ENCERRADO', 'CAIXA_BANCO', [680000], { is_active: false }),
    ctx,
  );
  const r = montarRelatorio(grade, { meses: MESES, formatarValor: formatar, comTotalDoAno: false });
  assert.equal(r.linhas[1][0], 'BANCO ENCERRADO (INATIVA)');
});

test('as colunas de dinheiro são todas menos a primeira', () => {
  assert.deepEqual(colunasNumericas(MESES, false), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(colunasNumericas(MESES, true),  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
});
