/**
 * 📅 DATAS COM FUSO DO BRASIL (PJODC v10)
 * Local: packages/core/src/lib/datas.ts
 *
 * ===========================================================================
 * ⚠️ EXISTEM DUAS COISAS DIFERENTES CHAMADAS "DATA", E MISTURÁ-LAS É O BUG
 * ===========================================================================
 *
 *   1. DATA DE CALENDÁRIO — vencimento, competência, emissão.
 *      "10/10/2026" é o mesmo dia para todo mundo, em qualquer fuso. No banco
 *      é `date`; no código é a string "2026-10-10".
 *
 *   2. INSTANTE — quando algo aconteceu (criação, alteração, login).
 *      No banco é `timestamptz`, gravado com `now()`. O fuso entra só na hora
 *      de exibir.
 *
 * O erro clássico é guardar vencimento como instante: um boleto marcado para
 * 10/10 às 00:00 no horário de Brasília é 10/10 às 03:00 em UTC, e um relatório
 * que converta de volta sem cuidado mostra 09/10. O dia "anda" sozinho.
 *
 * ⚠️ POR ISSO O CLAUDE.md PROÍBE `toISOString()` PARA DATAS DE CALENDÁRIO:
 * aquele método converte para UTC antes de escrever. Num aparelho em Brasília,
 * `new Date(2026, 9, 10).toISOString()` devolve "2026-10-10T03:00:00.000Z" — e
 * quem corta os 10 primeiros caracteres pode acabar com o dia errado dependendo
 * da hora. `dataLocalISO()` abaixo monta a string a partir dos componentes
 * locais, sem passar por UTC.
 */

/** Data de calendário no formato que o banco espera: "AAAA-MM-DD". */
export type DataISO = string;

/** Fuso oficial do negócio. Uma constante, não uma string repetida. */
export const FUSO_BRASIL = 'America/Sao_Paulo';

function doisDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * 📆 Converte um `Date` para "AAAA-MM-DD" usando os componentes LOCAIS.
 *
 * Sem `toISOString()`, e é esse o ponto do arquivo inteiro.
 */
export function dataLocalISO(data: Date = new Date()): DataISO {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** Hoje, como data de calendário. */
export function hojeISO(): DataISO {
  return dataLocalISO(new Date());
}

/**
 * 🔄 Lê "AAAA-MM-DD" como meia-noite LOCAL.
 *
 * ⚠️ `new Date("2026-10-10")` NÃO faz isso: a especificação do JavaScript manda
 * interpretar a string só com data como UTC, então num aparelho em Brasília ela
 * vira 09/10 às 21:00. Construindo com os três números, a data nasce local.
 */
export function deDataISO(iso: DataISO): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  if (!ano || !mes || !dia) throw new Error(`Data inválida: "${iso}".`);
  return new Date(ano, mes - 1, dia);
}

/** "2026-10-10" → "10/10/2026". Aceita `Date` também. */
export function formatarDataBR(valor: DataISO | Date): string {
  const data = typeof valor === 'string' ? deDataISO(valor) : valor;
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

/** "10/10/2026" → "2026-10-10". Devolve `null` quando não reconhece. */
export function deDataBR(texto: string): DataISO | null {
  const m = (texto ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  // Rejeita 31/02: o construtor "vira" o mês silenciosamente.
  if (data.getMonth() !== Number(mes) - 1 || data.getDate() !== Number(dia)) return null;
  return `${ano}-${mes}-${dia}`;
}

/**
 * 🕐 Exibe um INSTANTE no horário de Brasília: "10/10/2026 14:32".
 *
 * Aceita o que o banco devolve (string ISO com fuso) ou um `Date`. A conversão
 * é feita pelo `Intl`, que conhece o fuso e o horário de verão — cálculo à mão
 * com "menos 3 horas" quebra quando a regra muda.
 */
export function formatarDataHoraBR(instante: string | Date): string {
  const data = typeof instante === 'string' ? new Date(instante) : instante;
  if (Number.isNaN(data.getTime())) return '—';

  const texto = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_BRASIL,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);

  // ⚠️ O `Intl` do pt-BR separa data e hora por VÍRGULA ("10/10/2026, 12:00").
  // Quem lê um extrato espera "10/10/2026 12:00". Tirar a vírgula aqui, num
  // lugar só, evita que cada tela invente o próprio ajuste — e foi o teste
  // `datas.test.ts` que flagrou a diferença.
  return texto.replace(', ', ' ');
}

/** Soma dias a uma data de calendário, sem passar por fuso nenhum. */
export function somarDias(iso: DataISO, dias: number): DataISO {
  const data = deDataISO(iso);
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

/** Diferença em dias inteiros entre duas datas de calendário (b − a). */
export function diferencaEmDias(a: DataISO, b: DataISO): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  // `Date.UTC` com os componentes locais elimina o efeito do horário de verão:
  // aqui só interessa a distância entre dois dias do calendário.
  const dataA = deDataISO(a);
  const dataB = deDataISO(b);
  const utcA = Date.UTC(dataA.getFullYear(), dataA.getMonth(), dataA.getDate());
  const utcB = Date.UTC(dataB.getFullYear(), dataB.getMonth(), dataB.getDate());
  return Math.round((utcB - utcA) / MS_POR_DIA);
}

/** A data de calendário já passou? Útil para "vencido". */
export function estaVencida(vencimento: DataISO, referencia: DataISO = hojeISO()): boolean {
  return diferencaEmDias(referencia, vencimento) < 0;
}

// ===========================================================================
// 📅 MESES INTEIROS — os atalhos "MÊS ATUAL", "MÊS ANTERIOR" e "MÊS SEGUINTE"
// ===========================================================================
//
// ⚠️ TODO CÁLCULO DE MÊS AQUI ANCORA NO DIA 1, E ISSO NÃO É ESTILO — É A
// CORREÇÃO DE UM ERRO QUE NÃO ACUSA NADA.
//
// A forma "óbvia" de voltar um mês é subtrair 1 do mês da data que se tem:
//
//   const d = new Date(2026, 2, 31);   // 31 de MARÇO
//   d.setMonth(d.getMonth() - 1);      // "um mês atrás"
//   // resultado: 3 de MARÇO (!) — o JavaScript tenta montar "31 de fevereiro",
//   // não encontra, e transborda três dias para a frente.
//
// Nenhum erro é levantado. Num botão "MÊS ANTERIOR", isso significa que, a
// partir de um dia 31, clicar não sai do lugar — e o defeito parece "o botão
// não funciona", quando a conta é que está errada. Ancorar no dia 1 elimina o
// transbordo, porque todo mês tem dia 1.
//
// ⚠️ O ÚLTIMO DIA VEM DO "DIA 0 DO MÊS SEGUINTE". `new Date(ano, mes + 1, 0)` é
// o último dia deste mês, e acerta 28, 29 (bissexto), 30 e 31 sem nenhuma
// tabela escrita à mão — que é a outra forma clássica de errar fevereiro.

/** Um mês inteiro, do primeiro ao último dia — o que os campos DE/ATÉ esperam. */
export interface PeriodoDoMes {
  de: DataISO;
  ate: DataISO;
}

/** "2026-09-14" → "2026-09-01". */
export function primeiroDiaDoMes(iso: DataISO = hojeISO()): DataISO {
  const data = deDataISO(iso);
  return dataLocalISO(new Date(data.getFullYear(), data.getMonth(), 1));
}

/** "2026-02-10" → "2026-02-28"; em ano bissexto, "2024-02-10" → "2024-02-29". */
export function ultimoDiaDoMes(iso: DataISO = hojeISO()): DataISO {
  const data = deDataISO(iso);
  return dataLocalISO(new Date(data.getFullYear(), data.getMonth() + 1, 0));
}

/**
 * O mês INTEIRO em que a data cai. Sem argumento, o mês de hoje.
 *
 * É o que responde ao botão "MÊS ATUAL": não importa o que havia nos campos,
 * o resultado é sempre do dia 1 ao último dia.
 */
export function mesInteiro(iso: DataISO = hojeISO()): PeriodoDoMes {
  return { de: primeiroDiaDoMes(iso), ate: ultimoDiaDoMes(iso) };
}

/**
 * Anda `passos` meses a partir do mês de `iso` e devolve o mês inteiro.
 *
 * Negativo anda para trás. Janeiro − 1 vira dezembro do ano anterior: o mês −1
 * é entendido corretamente pelo `Date`, e o ano acompanha sozinho.
 */
export function deslocarMes(iso: DataISO = hojeISO(), passos = 0): PeriodoDoMes {
  const data = deDataISO(iso);
  // Dia 1 SEMPRE — ver a explicação no topo deste bloco.
  const alvo = new Date(data.getFullYear(), data.getMonth() + passos, 1);
  return mesInteiro(dataLocalISO(alvo));
}

/** O mês anterior ao da data informada, inteiro. Sem argumento, o mês passado. */
export function mesAnterior(iso: DataISO = hojeISO()): PeriodoDoMes {
  return deslocarMes(iso, -1);
}

/** O mês seguinte ao da data informada, inteiro. */
export function mesSeguinte(iso: DataISO = hojeISO()): PeriodoDoMes {
  return deslocarMes(iso, 1);
}

/**
 * "2026-09-14" → "SETEMBRO / 2026".
 *
 * Quem lê "01/05/2026 a 31/05/2026" precisa de um instante para traduzir. O
 * rótulo poupa esse instante depois do quarto clique no botão de mês.
 */
export function rotuloDoMes(iso: DataISO = hojeISO()): string {
  const data = deDataISO(iso);
  const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(data);
  return `${mes.toUpperCase()} / ${data.getFullYear()}`;
}
