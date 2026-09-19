/**
 * 🧪 AS TRAVAS DO BOTÃO "VALORES + %" × "SÓ %" (PJODC v10)
 * Local: packages/core/src/modules/financeiro/modoDinheiroRegras.test.ts
 *
 * ⚠️ A TRAVA QUE IMPORTA É A 4: o botão NÃO pode alternar quando o Proprietário
 * bloqueou o Dependente em "só percentual". Ela foi vista FALHAR antes de existir
 * a guarda — com `return { modo: escolha ?? 'VALORES', podeAlternar: true }` como
 * primeira linha da função, as travas 4, 5 e 6 acusam.
 *
 * ⚠️ E CADA TESTE É INDEPENDENTE. Nenhum depende do estado deixado pelo anterior
 * — inserir um no meio não pode quebrar o primeiro.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exibicaoDoDinheiro,
  alternarModoDoDinheiro,
  rotuloDoModo,
  mostraValores,
  modoGravado,
  CHAVE_MODO_DINHEIRO,
  MODOS_DO_DINHEIRO,
} from './modoDinheiroRegras.ts';

// ---------------------------------------------------------------------------
// QUEM VÊ VALORES (Proprietário, ou Dependente sem o bloqueio)
// ---------------------------------------------------------------------------

test('1 · quem vê valores e nunca escolheu começa em VALORES', () => {
  const e = exibicaoDoDinheiro(true, null);
  assert.equal(e.modo, 'VALORES');
  assert.equal(e.podeAlternar, true);
  assert.equal(e.motivo, null);
});

test('2 · quem vê valores e escolheu PERCENTUAL fica em PERCENTUAL, e pode voltar', () => {
  const e = exibicaoDoDinheiro(true, 'PERCENTUAL');
  assert.equal(e.modo, 'PERCENTUAL');
  assert.equal(e.podeAlternar, true, 'esconder por escolha própria tem de ter volta');
  assert.equal(e.motivo, null);
});

test('3 · quem vê valores e escolheu VALORES continua em VALORES', () => {
  assert.equal(exibicaoDoDinheiro(true, 'VALORES').modo, 'VALORES');
});

// ---------------------------------------------------------------------------
// QUEM NÃO VÊ VALORES (Dependente bloqueado pelo Proprietário)
// ---------------------------------------------------------------------------

test('4 · bloqueado no banco: o modo é PERCENTUAL e o botão NÃO alterna', () => {
  const e = exibicaoDoDinheiro(false, null);
  assert.equal(e.modo, 'PERCENTUAL');
  assert.equal(e.podeAlternar, false);
  assert.ok(e.motivo && e.motivo.length > 0, 'botão desligado sem explicação é defeito');
});

test('5 · bloqueado no banco: uma escolha VALORES gravada no aparelho NÃO vale', () => {
  // 🔒 É a trava central do pedido de 19/09/2026: "o botão não pode quebrar
  // este bloqueio". Nem o botão, nem alguém que edite o cofre do telemóvel.
  const e = exibicaoDoDinheiro(false, 'VALORES');
  assert.equal(e.modo, 'PERCENTUAL');
  assert.equal(e.podeAlternar, false);
});

test('6 · bloqueado no banco: o motivo diz que os valores NÃO SÃO ENVIADOS', () => {
  // A frase precisa explicar que não é a tela que está esconder: é o banco que
  // não manda. Quem lê "não são enviados" não vai procurar um botão secreto.
  const e = exibicaoDoDinheiro(false, null);
  assert.match(String(e.motivo), /NÃO SÃO ENVIADOS/);
});

// ---------------------------------------------------------------------------
// ALTERNÂNCIA E RÓTULO
// ---------------------------------------------------------------------------

test('7 · alternar vai e volta', () => {
  assert.equal(alternarModoDoDinheiro('VALORES'), 'PERCENTUAL');
  assert.equal(alternarModoDoDinheiro('PERCENTUAL'), 'VALORES');
  assert.equal(alternarModoDoDinheiro(alternarModoDoDinheiro('VALORES')), 'VALORES');
});

test('8 · o rótulo é o NOME DO ESTADO, nunca o destino do toque', () => {
  // ⚠️ ESTE TESTE AFIRMAVA O CONTRÁRIO ATÉ 19/09/2026, e passava — porque provava
  // fielmente uma decisão errada. O dono do projeto leu o botão "SÓ %" como "estou
  // em SÓ %", viu os valores ao lado e relatou defeito. Teste verde não prova que a
  // decisão é boa; prova que o código faz o que alguém escreveu que ele faria.
  assert.equal(rotuloDoModo('VALORES'), 'VALORES + %');
  assert.equal(rotuloDoModo('PERCENTUAL'), 'SÓ %');
});

test('9 · as duas posições do seletor, na ordem em que aparecem', () => {
  assert.deepEqual([...MODOS_DO_DINHEIRO], ['VALORES', 'PERCENTUAL']);
  // Cada posição sabe se nomear — é o que o seletor desenha.
  assert.deepEqual(MODOS_DO_DINHEIRO.map(rotuloDoModo), ['VALORES + %', 'SÓ %']);
});

// ---------------------------------------------------------------------------
// MOSTRAR OU NÃO MOSTRAR UMA LINHA
// ---------------------------------------------------------------------------

test('10 · no modo PERCENTUAL nunca mostra valor, mesmo que o valor tenha chegado', () => {
  assert.equal(
    mostraValores('PERCENTUAL', { orcado_centavos: 120000, realizado_centavos: 94800 }),
    false,
  );
});

test('11 · no modo VALORES com nulo do banco NÃO mostra valor (evita escrever 0,00)', () => {
  assert.equal(
    mostraValores('VALORES', { orcado_centavos: null, realizado_centavos: null }),
    false,
  );
});

test('12 · no modo VALORES com um dos dois preenchido, mostra', () => {
  assert.equal(mostraValores('VALORES', { orcado_centavos: 0, realizado_centavos: null }), true);
  assert.equal(mostraValores('VALORES', { orcado_centavos: null, realizado_centavos: 500 }), true);
});

// ---------------------------------------------------------------------------
// A PREFERÊNCIA GRAVADA NO APARELHO
// ---------------------------------------------------------------------------

test('13 · modoGravado só aceita os dois valores conhecidos', () => {
  assert.equal(modoGravado('VALORES'), 'VALORES');
  assert.equal(modoGravado('PERCENTUAL'), 'PERCENTUAL');
  assert.equal(modoGravado(null), null);
  assert.equal(modoGravado(undefined), null);
  assert.equal(modoGravado(''), null);
  assert.equal(modoGravado('valores'), null, 'minúsculas não são o mesmo valor');
  assert.equal(modoGravado('{"modo":"VALORES"}'), null, 'lixo no cofre não vira escolha');
});

test('14 · a chave do cofre carrega o prefixo do módulo', () => {
  // Ela é passada por parâmetro ao storageService da plataforma; se um dia
  // alguém a mover para lá, o verificador de LEGO acusa — e este teste explica
  // por que ela nasceu aqui.
  assert.ok(CHAVE_MODO_DINHEIRO.startsWith('fin_'));
});
