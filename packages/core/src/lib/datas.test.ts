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
