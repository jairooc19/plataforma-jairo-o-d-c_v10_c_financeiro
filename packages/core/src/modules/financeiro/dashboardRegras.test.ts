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
    // ⚠️ Uma entrada simbólica para `temLancamento` ser verdadeiro nos meses
    // que o teste descreve. Quem quiser um mês SEM movimento monta a linha à
    // mão, com entradas e saídas em zero.
    entradas_centavos: 1,
    saidas_centavos: 0,
    fechado: false,
    ...extra,
  }));
}

function movimentos(
  nome: string,
  bloco: 'RECEITA_PROPRIO' | 'RECEITA_TERCEIROS' | 'DESPESA' | 'OUTRAS' | 'RESULTADO',
  valores: number[],
  extra: Partial<LinhaMovimentoMensal> = {},
): LinhaMovimentoMensal[] {
  const tipo = bloco.startsWith('RECEITA') ? 'RECEITA' : bloco === 'DESPESA' ? 'DESPESA' : 'OUTRAS';
  return valores.map((v, i) => ({
    bloco,
    linha_tipo: 'CONTA',
    conta_id: `id-${nome}`,
    nome,
    tipo,
    propriedade: bloco === 'RECEITA_TERCEIROS' ? 'TERCEIROS' : 'PROPRIO',
    is_active: true,
    is_sistema: false,
    mes: i + 1,
    // ⚠️ As entradas existem para o `temLancamento` ser verdadeiro; o líquido é
    // que carrega o valor conferido. Os testes que precisam de um mês SEM
    // lançamento passam entradas e saídas zeradas de propósito.
    entradas_centavos: Math.abs(v),
    saidas_centavos: 0,
    liquido_centavos: v,
    ...extra,
  }));
}


/**
 * Uma célula de saldo escrita à mão — é o jeito de descrever um mês PARADO
 * (entradas e saídas em zero) sem depender do helper `saldos`, que sempre
 * inventa uma entrada simbólica.
 */
function saldoDe(
  nome: string, mes: number, saldo: number, entradas: number, saidas = 0,
  over: Partial<LinhaSaldoMensal> = {},
): LinhaSaldoMensal {
  return {
    bloco: 'CAIXA_BANCO', linha_tipo: 'CONTA', conta_id: `id-${nome}`, nome,
    tipo: 'CAIXA', is_active: true, mes,
    saldo_centavos: saldo, entradas_centavos: entradas, saidas_centavos: saidas,
    fechado: false, ...over,
  };
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

test('a ordem dos blocos é receitas próprias, de terceiros, despesas, resultado e outras', () => {
  const grade = montarGradeDeMovimentos([
    ...movimentos('OUTRA COISA', 'OUTRAS', [500]),
    ...movimentos('ENERGIA', 'DESPESA', [380]),
    ...movimentos('VENDA', 'RECEITA_PROPRIO', [1000]),
    ...movimentos('COBRANÇA DE TERCEIRO', 'RECEITA_TERCEIROS', [200]),
    ...movimentos('', 'RESULTADO', [620], { linha_tipo: 'TOTAL', conta_id: null, nome: null }),
  ], ctx);
  assert.deepEqual(grade.map((b) => b.chave),
    ['RECEITA_PROPRIO', 'RECEITA_TERCEIROS', 'DESPESA', 'RESULTADO', 'OUTRAS']);
});

test('a MESMA conta aparece nos dois blocos de receita, sem uma comer a outra', () => {
  // A divisão é por PROPRIEDADE DO LANÇAMENTO, não do cadastro: quem vendeu à
  // vista e também cobrou por conta de terceiro tem a mesma identificadora nos
  // dois lugares, com valores diferentes. Se as duas linhas tivessem a mesma
  // identidade, uma sumiria levando os valores junto.
  const grade = montarGradeDeMovimentos([
    ...movimentos('VENDA', 'RECEITA_PROPRIO', [710000]),
    ...movimentos('VENDA', 'RECEITA_TERCEIROS', [200000]),
  ], ctx);

  assert.equal(grade.length, 2);
  assert.equal(grade[0].linhas[0].nome, 'VENDA');
  assert.equal(grade[1].linhas[0].nome, 'VENDA');
  assert.equal(grade[0].linhas[0].celulas[0].valorCentavos, 710000);
  assert.equal(grade[1].linhas[0].celulas[0].valorCentavos, 200000);
  assert.notEqual(grade[0].linhas[0].chave, grade[1].linhas[0].chave);
});

test('os rótulos separam as duas receitas, na tela e no total', () => {
  assert.equal(rotuloDoBloco('RECEITA_PROPRIO'), 'RECEITAS PRÓPRIAS');
  assert.equal(rotuloDoBloco('RECEITA_TERCEIROS'), 'RECEITAS DE TERCEIROS');
});

test('ocultar a transferência esconde a linha e NÃO mexe no total', () => {
  // O total vem do banco contando tudo — é ele que tem de bater com a
  // conferência. Recalcular aqui criaria uma segunda conta do mesmo número.
  const linhas: LinhaMovimentoMensal[] = [
    ...movimentos('APORTE', 'OUTRAS', [500000]),
    ...movimentos('TRANSFERÊNCIA ENTRE CONTAS', 'OUTRAS', [0], { is_sistema: true }),
    {
      bloco: 'OUTRAS', linha_tipo: 'TOTAL', conta_id: null, nome: null, tipo: null,
      propriedade: null, is_active: null, is_sistema: null, mes: 1,
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
  assert.equal(rotuloDoBloco('DESPESA'), 'DESPESAS');
  assert.equal(rotuloDoBloco('INVENTADO'), 'INVENTADO');
});

// ===========================================================================
// O MÊS SEM LANÇAMENTO — pedido do dono do projeto em 18/09/2026
// ===========================================================================

test('temLancamento vem de entradas + saidas, não do valor da célula', () => {
  // Um mês em que entrou 100 e saiu 100 tem LÍQUIDO ZERO e teve movimento.
  // Olhar só o valor confundiria "nada aconteceu" com "aconteceu e empatou".
  const grade = montarGradeDeSaldos([
    saldoDe('CAIXA', 1, 5000, 10000, 10000),
    saldoDe('CAIXA', 2, 5000, 0, 0),
  ], ctx);

  const celulas = grade[0].linhas[0].celulas;
  assert.equal(celulas[0].temLancamento, true);   // entrou e saiu: houve movimento
  assert.equal(celulas[0].valorCentavos, 5000);   // o saldo continua sendo o saldo
  assert.equal(celulas[1].temLancamento, false);  // fevereiro parado nesta conta
  assert.equal(celulas[1].valorCentavos, 5000);   // e o saldo dele AINDA acumula
});

test('o mês que o banco não devolveu nasce sem lançamento', () => {
  const grade = montarGradeDeSaldos(saldos('CAIXA', 'CAIXA_BANCO', [100]), ctx);
  assert.equal(grade[0].linhas[0].celulas[0].temLancamento, true);
  assert.equal(grade[0].linhas[0].celulas[5].temLancamento, false);
});

test('QUEM DECIDE É A COLUNA: um lançamento em qualquer conta acende o mês inteiro', () => {
  // O pedido: "se existir um ou mais lançamentos em QUALQUER das contas
  // movimento, apresentar os saldos finais para TODAS as contas
  // individualmente, mesmo se a conta neste mês não existir lançamento".
  //
  // Em janeiro só o CAIXA se mexeu. O BANCO ficou parado — e mesmo assim o
  // saldo dele tem de aparecer, senão a soma do que se vê não bate com o total.
  const grade = montarGradeDeSaldos([
    saldoDe('CAIXA', 1, 5000, 10000),
    saldoDe('BANCO', 1, 70000, 0, 0),
    saldoDe('CAIXA', 2, 5000, 0, 0),
    saldoDe('BANCO', 2, 70000, 0, 0),
  ], ctx);

  const caixa = grade[0].linhas.find((l) => l.nome === 'CAIXA')!.celulas;
  const banco = grade[0].linhas.find((l) => l.nome === 'BANCO')!.celulas;

  // JANEIRO: o CAIXA se mexeu, então a COLUNA inteira aparece
  assert.equal(caixa[0].temLancamento, true);
  assert.equal(banco[0].temLancamento, false);        // esta conta ficou parada
  assert.equal(banco[0].mesTeveLancamento, true);     // mas o MÊS teve movimento
  assert.equal(caixa[0].mesTeveLancamento, true);

  // FEVEREIRO: ninguém se mexeu — a coluna inteira some
  assert.equal(caixa[1].mesTeveLancamento, false);
  assert.equal(banco[1].mesTeveLancamento, false);
});

test('a conta de OUTRAS acende o mês também para o bloco CAIXA E BANCO', () => {
  // As duas tabelas são a mesma tela: se elas discordassem sobre um mês, uma
  // mostraria saldos e a outra zeros para o mesmo período.
  const grade = montarGradeDeSaldos([
    saldoDe('CAIXA', 3, 5000, 0, 0),
    saldoDe('CARTEIRA', 3, 900, 900, 0, { bloco: 'OUTRAS', tipo: 'OUTRAS', conta_id: 'id-CARTEIRA' }),
  ], ctx);

  const caixaBanco = grade.find((b) => b.chave === 'CAIXA_BANCO')!;
  const outras = grade.find((b) => b.chave === 'OUTRAS')!;

  assert.equal(caixaBanco.linhas[0].celulas[2].temLancamento, false);
  assert.equal(caixaBanco.linhas[0].celulas[2].mesTeveLancamento, true);
  assert.equal(outras.linhas[0].celulas[2].mesTeveLancamento, true);
});

test('a linha de TOTAL segue a mesma coluna das contas', () => {
  // É o que faz 0+0+0 = 0 no mês parado, e a soma bater no mês com movimento.
  const grade = montarGradeDeSaldos([
    saldoDe('CAIXA', 1, 5000, 10000),
    {
      bloco: 'CAIXA_BANCO', linha_tipo: 'TOTAL', conta_id: null, nome: null, tipo: null,
      is_active: null, mes: 1, saldo_centavos: 5000,
      entradas_centavos: 10000, saidas_centavos: 0, fechado: false,
    },
    {
      bloco: 'CAIXA_BANCO', linha_tipo: 'TOTAL', conta_id: null, nome: null, tipo: null,
      is_active: null, mes: 2, saldo_centavos: 5000,
      entradas_centavos: 0, saidas_centavos: 0, fechado: false,
    },
  ], ctx);

  const total = grade[0].linhas.find((l) => l.ehTotal)!.celulas;
  assert.equal(total[0].mesTeveLancamento, true);
  assert.equal(total[1].mesTeveLancamento, false);
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

test('o relatório zera o mês parado e mostra o mês com movimento, como a tela', () => {
  // O papel tem de concordar com o monitor. Célula zerada numa ponta e cheia na
  // outra faz a pessoa deixar de confiar nas duas.
  //
  // Janeiro: o CAIXA se mexeu e o BANCO não → OS DOIS aparecem.
  // Fevereiro: ninguém se mexeu → a coluna inteira sai 0,00.
  const grade = montarGradeDeSaldos([
    saldoDe('CAIXA', 1, 125000, 500000, 475000),
    saldoDe('BANCO', 1, 70000, 0, 0),
    saldoDe('CAIXA', 2, 125000, 0, 0),
    saldoDe('BANCO', 2, 70000, 0, 0),
  ], ctx);

  const com = montarRelatorio(grade, {
    meses: MESES, formatarValor: formatar, comTotalDoAno: false, ocultarSemLancamento: true,
  });
  const sem = montarRelatorio(grade, {
    meses: MESES, formatarValor: formatar, comTotalDoAno: false,
  });

  const linhaDe = (r: typeof com, nome: string) => r.linhas.find((l) => l[0] === nome)!;

  // JANEIRO — as duas contas aparecem, inclusive a que ficou parada
  assert.equal(linhaDe(com, 'CAIXA')[1], '1250,00');
  assert.equal(linhaDe(com, 'BANCO')[1], '700,00');
  // FEVEREIRO — mês parado: a coluna inteira sai zerada
  assert.equal(linhaDe(com, 'CAIXA')[2], '0,00');
  assert.equal(linhaDe(com, 'BANCO')[2], '0,00');
  // sem a opção, o saldo real aparece nos dois meses
  assert.equal(linhaDe(sem, 'CAIXA')[2], '1250,00');
  // a largura não muda: a célula é ZERADA, ela não some
  assert.equal(linhaDe(com, 'CAIXA').length, com.colunas.length);
});
