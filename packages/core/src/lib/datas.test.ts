/**
 * 🧪 TESTES DE DATA (PJODC v10)
 * Local: packages/core/src/lib/datas.test.ts
 *
 * Rode com `npm test` na raiz do repositório.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dataLocalISO,
  hojeISO,
  deDataISO,
  formatarDataBR,
  deDataBR,
  formatarDataHoraBR,
  somarDias,
  diferencaEmDias,
  estaVencida,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  mesInteiro,
  deslocarMes,
  mesAnterior,
  mesSeguinte,
  rotuloDoMes,
  anoAtual,
  anoDe,
  anoInteiro,
  mesDoAno,
  MESES_CURTOS,
  MESES_POR_EXTENSO,
  competenciaDe,
  competenciaAtual,
  competenciaDoMes,
  deslocarCompetencia,
  ehDataNaCompetencia,
  dataPadraoNaCompetencia,
  ritmoDoMes,
} from './datas.ts';

test('dataLocalISO usa o calendário local, não UTC', () => {
  // 10/10/2026 às 22:00 no fuso da máquina. Em UTC-3 isso é 11/10 em UTC:
  // um `toISOString()` devolveria o dia seguinte.
  const noite = new Date(2026, 9, 10, 22, 0, 0);
  assert.equal(dataLocalISO(noite), '2026-10-10');

  const madrugada = new Date(2026, 9, 10, 1, 0, 0);
  assert.equal(dataLocalISO(madrugada), '2026-10-10');
});

test('deDataISO devolve meia-noite local', () => {
  const data = deDataISO('2026-10-10');
  assert.equal(data.getFullYear(), 2026);
  assert.equal(data.getMonth(), 9); // outubro
  assert.equal(data.getDate(), 10);
  assert.equal(data.getHours(), 0);
});

test('ida e volta entre ISO e o formato brasileiro', () => {
  assert.equal(formatarDataBR('2026-10-10'), '10/10/2026');
  assert.equal(deDataBR('10/10/2026'), '2026-10-10');
  assert.equal(deDataBR('01/01/2027'), '2027-01-01');
});

test('deDataBR recusa data que não existe', () => {
  assert.equal(deDataBR('31/02/2026'), null); // fevereiro não tem 31
  assert.equal(deDataBR('10-10-2026'), null); // formato errado
  assert.equal(deDataBR(''), null);
});

test('somarDias atravessa o fim do mês e o ano', () => {
  assert.equal(somarDias('2026-10-30', 3), '2026-11-02');
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
});

test('diferencaEmDias conta dias de calendário', () => {
  assert.equal(diferencaEmDias('2026-10-10', '2026-10-13'), 3);
  assert.equal(diferencaEmDias('2026-10-13', '2026-10-10'), -3);
  assert.equal(diferencaEmDias('2026-10-10', '2026-10-10'), 0);
  // Atravessa a virada do horário de verão sem perder ou ganhar um dia.
  assert.equal(diferencaEmDias('2026-02-10', '2026-11-10'), 273);
});

test('estaVencida compara datas de calendário', () => {
  assert.equal(estaVencida('2026-10-09', '2026-10-10'), true);
  assert.equal(estaVencida('2026-10-10', '2026-10-10'), false); // vence hoje: não está vencida
  assert.equal(estaVencida('2026-10-11', '2026-10-10'), false);
});

test('formatarDataHoraBR mostra o horário de Brasília', () => {
  // 10/10/2026 às 15:00 UTC = 12:00 em São Paulo (UTC-3).
  assert.equal(formatarDataHoraBR('2026-10-10T15:00:00Z'), '10/10/2026 12:00');
  assert.equal(formatarDataHoraBR('valor inválido'), '—');
});

test('hojeISO devolve uma data de calendário bem formada', () => {
  assert.match(hojeISO(), /^\d{4}-\d{2}-\d{2}$/);
});

// ===========================================================================
// 📅 OS MESES INTEIROS (atalhos MÊS ATUAL / ANTERIOR / SEGUINTE)
// ===========================================================================

test('primeiroDiaDoMes e ultimoDiaDoMes acertam os meses de 28, 29, 30 e 31 dias', () => {
  assert.equal(primeiroDiaDoMes('2026-09-14'), '2026-09-01');
  assert.equal(ultimoDiaDoMes('2026-09-14'), '2026-09-30');  // setembro: 30
  assert.equal(ultimoDiaDoMes('2026-08-01'), '2026-08-31');  // agosto: 31
  assert.equal(ultimoDiaDoMes('2026-02-10'), '2026-02-28');  // fevereiro comum
  assert.equal(ultimoDiaDoMes('2024-02-10'), '2024-02-29');  // fevereiro bissexto
  assert.equal(ultimoDiaDoMes('2000-02-01'), '2000-02-29');  // 2000 é bissexto (divisível por 400)
  assert.equal(ultimoDiaDoMes('1900-02-01'), '1900-02-28');  // 1900 NÃO é (divisível por 100)
});

test('mesAnterior NÃO transborda a partir de um dia 31 — a armadilha do setMonth', () => {
  // ⚠️ ESTE É O TESTE QUE JUSTIFICA O ARQUIVO INTEIRO.
  // `new Date(2026, 2, 31).setMonth(mes - 1)` devolveria 3 de MARÇO: o
  // JavaScript tenta montar "31 de fevereiro" e transborda. Ancorando no dia 1,
  // o mês anterior a março é fevereiro, como qualquer pessoa espera.
  assert.deepEqual(mesAnterior('2026-03-31'), { de: '2026-02-01', ate: '2026-02-28' });
  assert.deepEqual(mesAnterior('2026-05-31'), { de: '2026-04-01', ate: '2026-04-30' });
  assert.deepEqual(mesAnterior('2026-07-31'), { de: '2026-06-01', ate: '2026-06-30' });
  assert.deepEqual(mesAnterior('2024-03-30'), { de: '2024-02-01', ate: '2024-02-29' });
});

test('mesAnterior vira o ano ao passar de janeiro', () => {
  assert.deepEqual(mesAnterior('2026-01-15'), { de: '2025-12-01', ate: '2025-12-31' });
  assert.deepEqual(mesAnterior('2026-01-01'), { de: '2025-12-01', ate: '2025-12-31' });
});

test('mesSeguinte vira o ano ao passar de dezembro', () => {
  assert.deepEqual(mesSeguinte('2025-12-20'), { de: '2026-01-01', ate: '2026-01-31' });
  assert.deepEqual(mesSeguinte('2026-01-31'), { de: '2026-02-01', ate: '2026-02-28' });
});

test('cliques repetidos andam mês a mês, sem repetir nenhum', () => {
  // É o uso real do botão: clicar quatro vezes a partir de setembro.
  let periodo = mesInteiro('2026-09-14');
  assert.deepEqual(periodo, { de: '2026-09-01', ate: '2026-09-30' });

  const visitados: string[] = [];
  for (let i = 0; i < 4; i++) {
    periodo = mesAnterior(periodo.de);
    visitados.push(periodo.de);
  }
  assert.deepEqual(visitados, ['2026-08-01', '2026-07-01', '2026-06-01', '2026-05-01']);
  assert.equal(periodo.ate, '2026-05-31');

  // E doze cliques a partir de janeiro descem um ano inteiro, sem emperrar.
  let p = mesInteiro('2026-01-10');
  for (let i = 0; i < 12; i++) p = mesAnterior(p.de);
  assert.deepEqual(p, { de: '2025-01-01', ate: '2025-01-31' });
});

test('deslocarMes anda vários meses de uma vez, para os dois lados', () => {
  assert.deepEqual(deslocarMes('2026-09-14', 0), { de: '2026-09-01', ate: '2026-09-30' });
  assert.deepEqual(deslocarMes('2026-09-14', -9), { de: '2025-12-01', ate: '2025-12-31' });
  assert.deepEqual(deslocarMes('2026-09-14', 5), { de: '2027-02-01', ate: '2027-02-28' });
});

test('rotuloDoMes escreve o mês por extenso, em português', () => {
  assert.equal(rotuloDoMes('2026-09-14'), 'SETEMBRO / 2026');
  assert.equal(rotuloDoMes('2026-01-01'), 'JANEIRO / 2026');
  assert.equal(rotuloDoMes('2025-12-31'), 'DEZEMBRO / 2025');
});

test('sem argumento, os atalhos partem de hoje', () => {
  // Não se pode fixar a data de hoje num teste, então a verificação é de
  // coerência: o mês atual contém hoje, e o anterior termina na véspera dele.
  const hoje = hojeISO();
  const atual = mesInteiro();
  assert.equal(atual.de, primeiroDiaDoMes(hoje));
  assert.equal(atual.ate, ultimoDiaDoMes(hoje));
  assert.equal(somarDias(mesAnterior().ate, 1), atual.de);
  assert.equal(somarDias(atual.ate, 1), mesSeguinte().de);
});

// ===========================================================================
// O ANO INTEIRO — 18/09/2026 (os dashboards de janeiro a dezembro)
// ===========================================================================

test('anoInteiro vai de 1º de janeiro a 31 de dezembro', () => {
  assert.deepEqual(anoInteiro(2026), { de: '2026-01-01', ate: '2026-12-31' });
  assert.deepEqual(anoInteiro(2024), { de: '2024-01-01', ate: '2024-12-31' });
});

test('mesDoAno acerta fevereiro, inclusive no ano bissexto', () => {
  // É o caso em que a conta feita à mão erra, e erra em silêncio.
  assert.deepEqual(mesDoAno(2026, 2), { de: '2026-02-01', ate: '2026-02-28' });
  assert.deepEqual(mesDoAno(2024, 2), { de: '2024-02-01', ate: '2024-02-29' });
});

test('mesDoAno acerta os meses de 30 e de 31 dias', () => {
  assert.deepEqual(mesDoAno(2026, 1),  { de: '2026-01-01', ate: '2026-01-31' });
  assert.deepEqual(mesDoAno(2026, 4),  { de: '2026-04-01', ate: '2026-04-30' });
  assert.deepEqual(mesDoAno(2026, 12), { de: '2026-12-01', ate: '2026-12-31' });
});

test('mesDoAno recusa mês fora de 1 a 12, em vez de devolver outro ano', () => {
  // `new Date(2026, 12, 1)` seria JANEIRO DE 2027, sem erro nenhum — e a tela
  // mostraria o mês errado com o rótulo certo. Recusar é a única saída honesta.
  assert.throws(() => mesDoAno(2026, 0),  /Mês inválido/);
  assert.throws(() => mesDoAno(2026, 13), /Mês inválido/);
  assert.throws(() => mesDoAno(2026, 1.5), /Mês inválido/);
});

test('anoDe lê o ano da data de calendário, sem passar por UTC', () => {
  assert.equal(anoDe('2026-01-01'), 2026);
  // 31/12 é o caso que o fuso estragaria: em UTC viraria 1º de janeiro de 2027.
  assert.equal(anoDe('2026-12-31'), 2026);
});

test('anoAtual concorda com hojeISO', () => {
  assert.equal(anoAtual(), anoDe(hojeISO()));
});

test('MESES_CURTOS tem os 12 meses, em três letras e sem ponto', () => {
  assert.equal(MESES_CURTOS.length, 12);
  assert.equal(MESES_CURTOS[0], 'JAN');
  assert.equal(MESES_CURTOS[11], 'DEZ');
  // O ponto de "set." do Intl é justamente o que esta lista existe para evitar.
  assert.ok(MESES_CURTOS.every((m) => m.length === 3 && m === m.toUpperCase()));
});

// ===========================================================================
// COMPETÊNCIA — 18/09/2026 (o orçamento e o dinheiro do período)
// ===========================================================================

test('a competência é sempre o primeiro dia do mês', () => {
  assert.equal(competenciaDe('2026-09-17'), '2026-09-01');
  assert.equal(competenciaDe('2026-09-01'), '2026-09-01');
  assert.equal(competenciaDe('2026-02-28'), '2026-02-01');
  assert.equal(competenciaDoMes(2026, 9), '2026-09-01');
  assert.equal(competenciaAtual(), competenciaDe(hojeISO()));
});

test('deslocarCompetencia anda mês a mês e vira o ano sozinho', () => {
  assert.equal(deslocarCompetencia('2026-09-01', 1), '2026-10-01');
  assert.equal(deslocarCompetencia('2026-01-01', -1), '2025-12-01');
  assert.equal(deslocarCompetencia('2026-12-01', 1), '2027-01-01');
  // partindo de um dia qualquer, ainda assim ancora no dia 1
  assert.equal(deslocarCompetencia('2026-03-31', -1), '2026-02-01');
});

test('ehDataNaCompetencia separa o que entra na barra do que não entra', () => {
  // É o furo silencioso: lançar 03/10 no orçamento de setembro produz um
  // lançamento válido que NÃO mexe na barra de setembro.
  assert.equal(ehDataNaCompetencia('2026-09-30', '2026-09-01'), true);
  assert.equal(ehDataNaCompetencia('2026-10-03', '2026-09-01'), false);
  assert.equal(ehDataNaCompetencia('2026-08-31', '2026-09-01'), false);
});

test('dataPadraoNaCompetencia usa HOJE quando hoje cabe, e o dia 1 quando não', () => {
  assert.equal(dataPadraoNaCompetencia('2026-09-01', '2026-09-18'), '2026-09-18');
  assert.equal(dataPadraoNaCompetencia('2026-07-01', '2026-09-18'), '2026-07-01');
  assert.equal(dataPadraoNaCompetencia('2027-01-01', '2026-09-18'), '2027-01-01');
});

test('ritmoDoMes diz quanto do mês já passou', () => {
  // 18 de 30 dias = 60%
  assert.equal(ritmoDoMes('2026-09-01', '2026-09-18'), 60);
  // 15 de 31 = 48,4% → 48
  assert.equal(ritmoDoMes('2026-01-01', '2026-01-15'), 48);
  // o último dia é sempre 100%, em mês de 28, 30 ou 31
  assert.equal(ritmoDoMes('2026-02-01', '2026-02-28'), 100);
});

test('ritmoDoMes é absoluto fora da competência', () => {
  // Mês passado está 100% vencido; mês futuro, 0%. Sem isto, a marca do ritmo
  // apareceria no meio da barra de um mês que já acabou.
  assert.equal(ritmoDoMes('2026-08-01', '2026-09-18'), 100);
  assert.equal(ritmoDoMes('2026-11-01', '2026-09-18'), 0);
});

test('MESES_POR_EXTENSO tem os 12 meses, em caixa alta', () => {
  assert.equal(MESES_POR_EXTENSO.length, 12);
  assert.equal(MESES_POR_EXTENSO[0], 'JANEIRO');
  assert.equal(MESES_POR_EXTENSO[2], 'MARÇO');
  assert.equal(MESES_POR_EXTENSO[11], 'DEZEMBRO');
  assert.ok(MESES_POR_EXTENSO.every((m) => m === m.toUpperCase()));
});
