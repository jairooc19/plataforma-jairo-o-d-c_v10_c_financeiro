/**
 * 🧪 TESTES DA LEITURA DE CSV/TSV (PJODC v10)
 * Local: packages/core/src/modules/financeiro/importacao.test.ts
 *
 * Rode com `npm test` na raiz do repositório.
 *
 * ⚠️ POR QUE ESTE ARQUIVO EXISTE. Ler arquivo de planilha é a área com mais
 * casos de canto por linha de código deste projeto: separador que muda de país,
 * aspas, quebra de linha DENTRO de aspas, BOM invisível, CRLF do Windows. São
 * todos silenciosos — o arquivo "abre", os nomes aparecem, e um deles entra
 * errado. Testar em tela exigiria fabricar um arquivo para cada caso e olhar
 * com os olhos; aqui cada caso é uma linha.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lerColunaA,
  normalizarComoOBanco,
  montarPrevia,
  NOME_RESERVADO_TRANSFERENCIA,
} from './importacao.ts';

test('TSV simples: uma coluna por TAB', () => {
  const r = lerColunaA('CAIXA\tobs\nBANCO DO BRASIL\toutra\n');
  assert.equal(r.separador, 'TAB');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO DO BRASIL']);
});

test('CSV do Excel brasileiro usa ponto e virgula', () => {
  // ⚠️ Este é o formato que sai do Excel em português. Um leitor que só
  // conhecesse a vírgula devolveria "ALUGUEL;JANEIRO" como um nome só.
  const r = lerColunaA('ALUGUEL;JANEIRO\nENERGIA;FEVEREIRO');
  assert.equal(r.separador, ';');
  assert.deepEqual(r.nomes, ['ALUGUEL', 'ENERGIA']);
});

test('arquivo de uma coluna so: a linha inteira e o nome', () => {
  const r = lerColunaA('CAIXA\nBANCO\nCARTEIRA');
  assert.equal(r.separador, 'NENHUM');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO', 'CARTEIRA']);
});

test('virgula DENTRO de aspas nao parte o nome', () => {
  // O erro clássico do split(','): devolveria '"MERCADO SILVA'.
  const r = lerColunaA('"MERCADO SILVA, LTDA",OUTRA COISA\nPADARIA,X');
  assert.deepEqual(r.nomes, ['MERCADO SILVA, LTDA', 'PADARIA']);
});

test('quebra de linha DENTRO de aspas nao vira duas linhas', () => {
  const r = lerColunaA('"CONTA COM\nDUAS LINHAS",X\nOUTRA,Y');
  assert.equal(r.nomes.length, 2);
  assert.equal(r.nomes[0], 'CONTA COM\nDUAS LINHAS');
  assert.equal(r.nomes[1], 'OUTRA');
});

test('aspas duplicadas viram uma aspa literal', () => {
  const r = lerColunaA('"CONTA ""ESPECIAL""",X');
  assert.deepEqual(r.nomes, ['CONTA "ESPECIAL"']);
});

test('o BOM do Excel some do primeiro nome', () => {
  // ⚠️ Sem isto, o primeiro nome vira "﻿CAIXA": IGUAL na tela, DIFERENTE
  // para o banco. O registro entraria duplicado e ninguém veria por quê.
  const r = lerColunaA('﻿CAIXA\nBANCO');
  assert.equal(r.nomes[0], 'CAIXA');
  assert.equal(r.nomes[0].charCodeAt(0), 'C'.charCodeAt(0));
});

test('CRLF do Windows conta como UMA quebra', () => {
  const r = lerColunaA('CAIXA\r\nBANCO\r\nCARTEIRA\r\n');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO', 'CARTEIRA']);
});

test('CR sozinho (Mac antigo) tambem quebra linha', () => {
  const r = lerColunaA('CAIXA\rBANCO');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO']);
});

test('linhas vazias e so-espaco sao descartadas', () => {
  const r = lerColunaA('CAIXA\n\n   \nBANCO\n');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO']);
});

test('a ultima linha sem quebra no fim nao se perde', () => {
  const r = lerColunaA('CAIXA\nBANCO');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO']);
});

test('pular a primeira linha ignora o cabecalho', () => {
  const r = lerColunaA('NOME;TIPO\nCAIXA;X\nBANCO;Y', true);
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO']);
});

test('coluna A vazia mas linha com conteudo: a linha nao some da contagem', () => {
  // ";ALGO" tem coluna A vazia. O nome é descartado, mas a linha foi lida.
  const r = lerColunaA('CAIXA;X\n;SO A COLUNA B\nBANCO;Y');
  assert.deepEqual(r.nomes, ['CAIXA', 'BANCO']);
  assert.equal(r.linhasLidas, 3);
});

test('normalizar concorda com o banco: sem acento, sem espaco, maiusculas', () => {
  assert.equal(normalizarComoOBanco('  Banco Itaú  '), 'BANCO ITAU');
  assert.equal(normalizarComoOBanco('Água'), 'AGUA');
  assert.equal(normalizarComoOBanco('CAIXA ECONÔMICA'), 'CAIXA ECONOMICA');
  assert.equal(normalizarComoOBanco('São José dos Ãmpos'), 'SAO JOSE DOS AMPOS');
});

test('a previa marca as tres especies de duplicata', () => {
  const previa = montarPrevia(
    ['Banco do Brasil', 'BRADESCO', 'banco do brasil', 'Banco Itaú'],
    ['BANCO ITAU'],   // o que a empresa já tem
  );

  assert.equal(previa[0].repetidoNoArquivo, false);
  assert.equal(previa[0].jaExiste, false);

  assert.equal(previa[1].jaExiste, false);

  // "banco do brasil" repete a linha 1, mesmo escrito diferente.
  assert.equal(previa[2].repetidoNoArquivo, true);

  // "Banco Itaú" já está no cadastro como "BANCO ITAU" — acento não engana.
  assert.equal(previa[3].jaExiste, true);
});

test('a previa grava o nome em maiusculas, como o banco vai gravar', () => {
  const previa = montarPrevia(['  banco do brasil  '], []);
  assert.equal(previa[0].nome, 'BANCO DO BRASIL');
});

test('o nome reservado da transferencia so e marcado nas identificadoras', () => {
  const comoConta = montarPrevia(['Transferência entre contas'], [], false);
  assert.equal(comoConta[0].reservado, false);

  const comoCategoria = montarPrevia(['Transferência entre contas'], [], true);
  assert.equal(comoCategoria[0].reservado, true);
  assert.equal(comoCategoria[0].chave, NOME_RESERVADO_TRANSFERENCIA);
});
