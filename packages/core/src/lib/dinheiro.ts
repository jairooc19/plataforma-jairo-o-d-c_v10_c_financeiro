/**
 * 💰 DINHEIRO EM CENTAVOS — A BASE DO C FINANCEIRO (PJODC v10)
 * Local: packages/core/src/lib/dinheiro.ts
 *
 * ===========================================================================
 * ⚠️ POR QUE NÃO GUARDAR "10,10" COMO 10.10
 * ===========================================================================
 * O computador guarda números quebrados em base 2, e 0,1 não tem representação
 * exata em base 2 — do mesmo jeito que 1/3 não tem representação exata em base
 * 10. O erro é minúsculo, mas ele SOMA. Rodado no Node 24 desta máquina:
 *
 *     0.1 + 0.2   →  0.30000000000000004
 *     10.10 * 3   →  30.299999999999997      (deveria ser 30,30)
 *     1010 * 3    →  3030                    ✅ exato, em centavos
 *
 * Num sistema financeiro isso vira conciliação que não fecha por um centavo,
 * e horas procurando um erro que está na aritmética, não no lançamento.
 *
 * A regra desta plataforma, portanto:
 *
 *   • NO CÓDIGO: todo valor monetário é um NÚMERO INTEIRO DE CENTAVOS.
 *     R$ 10,10  →  1010
 *   • NO BANCO:  `numeric(14,2)` ou `bigint` de centavos. Nunca `real`/`double`.
 *     A documentação do PostgreSQL diz que `numeric` "é especialmente
 *     recomendado para armazenar valores monetários" e que os tipos de ponto
 *     flutuante são inexatos.
 *   • NA TELA:   converte-se para "R$ 10,10" só na hora de exibir.
 *
 * ⚠️ O LIMITE DO INTEIRO SEGURO. O JavaScript garante exatidão até
 * `Number.MAX_SAFE_INTEGER` (9.007.199.254.740.991), que em centavos são cerca
 * de 90 trilhões de reais. Para esta plataforma é folga de sobra; as funções
 * abaixo avisam se algum cálculo passar disso, em vez de devolver um número
 * errado em silêncio.
 */

/** Valor monetário, sempre em centavos inteiros. R$ 1,00 = 100. */
export type Centavos = number;

/** Erro de uso da biblioteca de dinheiro — entrada inválida ou estouro. */
export class ErroDeDinheiro extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeDinheiro';
  }
}

function garantirInteiroSeguro(valor: number, operacao: string): Centavos {
  if (!Number.isFinite(valor)) {
    throw new ErroDeDinheiro(`Resultado inválido em "${operacao}".`);
  }
  if (!Number.isSafeInteger(valor)) {
    throw new ErroDeDinheiro(
      `"${operacao}" passou do limite seguro de centavos (${Number.MAX_SAFE_INTEGER}).`
    );
  }
  return valor;
}

/**
 * 🔢 Converte o que a pessoa digitou em centavos.
 *
 * Aceita as formas que aparecem de verdade num formulário brasileiro:
 *   "10,10"  "10.10"  "R$ 1.234,56"  "1234,5"  "-45,90"  10.1 (número)
 *
 * ⚠️ O PONTO É AMBÍGUO, E A REGRA AQUI É EXPLÍCITA: quando há vírgula, ela é o
 * separador decimal e os pontos são de milhar ("1.234,56"). Quando não há
 * vírgula, o ponto é decimal ("1234.56"). Sem essa decisão escrita, "1.234"
 * poderia virar R$ 1,23 ou R$ 1.234,00 — e as duas leituras já custaram
 * prejuízo em sistema financeiro de verdade.
 */
export function paraCentavos(entrada: string | number): Centavos {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada)) throw new ErroDeDinheiro('Valor numérico inválido.');
    // Math.round trata o 0.5 sempre para cima; com valores negativos isso
    // arredondaria -0,005 para -0,00. `trunc` + ajuste mantém a simetria.
    const sinal = entrada < 0 ? -1 : 1;
    return garantirInteiroSeguro(sinal * Math.round(Math.abs(entrada) * 100), 'paraCentavos');
  }

  const texto = (entrada ?? '').trim();
  if (texto === '') throw new ErroDeDinheiro('Valor vazio.');

  const negativo = /^-/.test(texto) || /\(.*\)/.test(texto);
  let limpo = texto.replace(/[^0-9.,]/g, '');

  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }

  if (limpo === '' || !/^\d*\.?\d*$/.test(limpo)) {
    throw new ErroDeDinheiro(`Valor não reconhecido: "${entrada}".`);
  }

  const [inteira, decimal = ''] = limpo.split('.');
  const centavosDecimais = (decimal + '00').slice(0, 2);
  const total = Number(inteira || '0') * 100 + Number(centavosDecimais);

  return garantirInteiroSeguro(negativo ? -total : total, 'paraCentavos');
}

/** Soma exata. */
export function somar(...valores: Centavos[]): Centavos {
  return garantirInteiroSeguro(
    valores.reduce((total, v) => total + garantirInteiroSeguro(v, 'somar'), 0),
    'somar'
  );
}

/** Subtração exata (a − b). */
export function subtrair(a: Centavos, b: Centavos): Centavos {
  return garantirInteiroSeguro(a - b, 'subtrair');
}

/**
 * ✖️ Multiplica por uma quantidade (3 parcelas, 2,5 horas, 1,08 de reajuste).
 *
 * ⚠️ ARREDONDA MEIO PARA CIMA, EM MÓDULO ("half away from zero"), que é a
 * convenção financeira brasileira e a que a calculadora do dia a dia usa. O
 * `Math.round` do JavaScript arredonda −0,5 para 0 (meio para cima no eixo dos
 * números), e isso faz débito e crédito divergirem em um centavo.
 */
export function multiplicar(valor: Centavos, quantidade: number): Centavos {
  if (!Number.isFinite(quantidade)) throw new ErroDeDinheiro('Quantidade inválida.');
  const bruto = valor * quantidade;
  const sinal = bruto < 0 ? -1 : 1;
  return garantirInteiroSeguro(sinal * Math.round(Math.abs(bruto)), 'multiplicar');
}

/**
 * ➗ Divide um valor em N partes que SOMAM EXATAMENTE O TOTAL.
 *
 * 🎯 É O CASO DO PARCELAMENTO, e o motivo de esta função existir: R$ 100,00 em
 * 3 vezes não é "33,33 três vezes" (isso soma 99,99 e some um centavo). A
 * função devolve [3334, 3333, 3333] — o resto vai para as primeiras parcelas,
 * que é como o mercado faz.
 */
export function dividirEmParcelas(valor: Centavos, partes: number): Centavos[] {
  if (!Number.isInteger(partes) || partes <= 0) {
    throw new ErroDeDinheiro('Número de parcelas inválido.');
  }

  const sinal = valor < 0 ? -1 : 1;
  const absoluto = Math.abs(garantirInteiroSeguro(valor, 'dividirEmParcelas'));
  const base = Math.floor(absoluto / partes);
  const resto = absoluto - base * partes;

  return Array.from({ length: partes }, (_, i) => sinal * (base + (i < resto ? 1 : 0)));
}

/**
 * 🇧🇷 Formata para exibição: 1010 → "R$ 10,10".
 *
 * Usa `Intl.NumberFormat`, que respeita a convenção do português do Brasil
 * (ponto no milhar, vírgula no decimal) sem que ninguém escreva isso à mão.
 */
export function formatarBRL(centavos: Centavos, opcoes?: { semSimbolo?: boolean }): string {
  const formatador = new Intl.NumberFormat('pt-BR', {
    style: opcoes?.semSimbolo ? 'decimal' : 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatador.format(centavos / 100);
}

/** Converte centavos para o número decimal que o banco guarda em `numeric(14,2)`. */
export function paraNumeric(centavos: Centavos): number {
  return garantirInteiroSeguro(centavos, 'paraNumeric') / 100;
}

/** Converte de volta o `numeric(14,2)` lido do banco para centavos. */
export function deNumeric(valor: number | string): Centavos {
  return paraCentavos(typeof valor === 'string' ? valor.replace(',', '.') : valor);
}

/** É zero? Útil porque `-0` existe em JavaScript e confunde comparações. */
export function ehZero(centavos: Centavos): boolean {
  return centavos === 0;
}
