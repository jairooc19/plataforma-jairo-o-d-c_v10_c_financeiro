/**
 * 🧪 TESTES DE DINHEIRO (PJODC v10)
 * Local: packages/core/src/lib/dinheiro.test.ts
 *
 * Rode com `npm test` na raiz do repositório.
 *
 * ⚠️ SEM BIBLIOTECA DE TESTE. Isto usa o `node:test`, que já vem no Node, e o
 * suporte nativo do Node 24 a TypeScript. Zero dependências novas — o que
 * importa num projeto que até agora não tinha teste nenhum: a desculpa mais
 * comum para não começar é a instalação.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  paraCentavos,
  somar,
  subtrair,
  multiplicar,
  dividirEmParcelas,
  formatarBRL,
  paraNumeric,
  deNumeric,
  ErroDeDinheiro,
} from './dinheiro.ts';

test('o problema que esta biblioteca existe para resolver', () => {
  // A aritmética "normal" erra:
  assert.notEqual(0.1 + 0.2, 0.3);
  assert.notEqual(10.1 * 3, 30.3);

  // Em centavos, não:
  assert.equal(somar(paraCentavos('0,10'), paraCentavos('0,20')), 30);
  assert.equal(multiplicar(paraCentavos('10,10'), 3), 3030);
});

test('paraCentavos aceita os formatos que aparecem num formulário', () => {
  assert.equal(paraCentavos('10,10'), 1010);
  assert.equal(paraCentavos('10.10'), 1010);
  assert.equal(paraCentavos('R$ 1.234,56'), 123456);
  assert.equal(paraCentavos('1234,5'), 123450);
  assert.equal(paraCentavos('0,01'), 1);
  assert.equal(paraCentavos('-45,90'), -4590);
  assert.equal(paraCentavos(10.1), 1010);
  assert.equal(paraCentavos(0), 0);
});

test('paraCentavos recusa o que não é valor', () => {
  assert.throws(() => paraCentavos(''), ErroDeDinheiro);
  assert.throws(() => paraCentavos('abc'), ErroDeDinheiro);
  assert.throws(() => paraCentavos(Number.NaN), ErroDeDinheiro);
});

test('soma e subtração são exatas mesmo com muitas parcelas', () => {
  const cem = Array.from({ length: 100 }, () => paraCentavos('0,07'));
  assert.equal(somar(...cem), 700); // R$ 7,00 — sem sobra de ponto flutuante
  assert.equal(subtrair(paraCentavos('100,00'), paraCentavos('33,33')), 6667);
});

test('multiplicar arredonda meio para cima, em módulo', () => {
  // 1,005 * 1 = 100,5 centavos -> 101 (e não 100)
  assert.equal(multiplicar(1005, 0.1), 101);
  // O negativo espelha o positivo: -100,5 -> -101
  assert.equal(multiplicar(-1005, 0.1), -101);
});

test('dividirEmParcelas devolve parcelas que somam o total', () => {
  const parcelas = dividirEmParcelas(paraCentavos('100,00'), 3);
  assert.deepEqual(parcelas, [3334, 3333, 3333]);
  assert.equal(somar(...parcelas), paraCentavos('100,00'));

  const doze = dividirEmParcelas(paraCentavos('1.000,00'), 12);
  assert.equal(somar(...doze), 100000);
  assert.equal(doze.length, 12);
});

test('dividirEmParcelas recusa número de parcelas inválido', () => {
  assert.throws(() => dividirEmParcelas(1000, 0), ErroDeDinheiro);
  assert.throws(() => dividirEmParcelas(1000, 2.5), ErroDeDinheiro);
});

test('formatarBRL escreve como o brasileiro lê', () => {
  // O Intl usa espaço não separável depois de "R$": comparamos sem ele.
  const normalizar = (s: string) => s.replace(/ /g, ' ');
  assert.equal(normalizar(formatarBRL(1010)), 'R$ 10,10');
  assert.equal(normalizar(formatarBRL(123456)), 'R$ 1.234,56');
  assert.equal(normalizar(formatarBRL(0)), 'R$ 0,00');
  assert.equal(normalizar(formatarBRL(-4590)), '-R$ 45,90');
  assert.equal(normalizar(formatarBRL(1010, { semSimbolo: true })), '10,10');
});

test('ida e volta para o formato do banco (numeric 14,2)', () => {
  assert.equal(paraNumeric(123456), 1234.56);
  assert.equal(deNumeric(1234.56), 123456);
  assert.equal(deNumeric('1234.56'), 123456);
  assert.equal(deNumeric(paraNumeric(999)), 999);
});

test('estouro do inteiro seguro vira erro, não número errado', () => {
  assert.throws(() => multiplicar(Number.MAX_SAFE_INTEGER, 10), ErroDeDinheiro);
});
