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

// ===========================================================================
// O ANO INTEIRO — 18/09/2026, para os dashboards de janeiro a dezembro
// ===========================================================================
//
// ⚠️ POR QUE UMA CONTA TÃO SIMPLES MORA AQUI, E NÃO NA TELA. É a mesma regra
// que trouxe os atalhos de mês para cá, e ela está escrita no CLAUDE.md:
// "nunca escrever cálculo de data dentro de um componente de tela — no Core ele
// é testável pelo `npm test`; na tela, só clicando".
//
// Parece exagero para "1º de janeiro a 31 de dezembro" — até lembrar que o
// `setMonth` de fevereiro já custou um defeito a este projeto. O que é trivial
// hoje é o que ninguém confere amanhã.

/**
 * Os 12 meses em três letras, na ordem, para o cabeçalho das colunas.
 *
 * ⚠️ É UMA LISTA FIXA, E NÃO `Intl`, DE PROPÓSITO. O `Intl.DateTimeFormat` com
 * `month: 'short'` devolve "set." em pt-BR — com ponto, minúsculo e com largura
 * variável entre os meses. Numa grade de 12 colunas isso desalinha o cabeçalho,
 * e o ponto vira sujeira no papel impresso.
 */
export const MESES_CURTOS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
] as const;

/** O ano de hoje. */
export function anoAtual(): number {
  return new Date().getFullYear();
}

/** O ano de uma data de calendário: "2026-03-10" → 2026. */
export function anoDe(iso: DataISO = hojeISO()): number {
  return deDataISO(iso).getFullYear();
}

/**
 * O ano inteiro: de 1º de janeiro a 31 de dezembro.
 *
 * É o período que o clique no NOME DA CONTA, no dashboard, leva para a
 * conferência.
 */
export function anoInteiro(ano: number = anoAtual()): PeriodoDoMes {
  return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
}

/**
 * Um mês específico de um ano, inteiro: `mesDoAno(2026, 3)` → 01/03 a 31/03.
 *
 * É o período que o clique NA CÉLULA leva para a conferência — e é por isso que
 * ele não pode errar fevereiro. O último dia vem do "dia 0 do mês seguinte",
 * que acerta 28, 29, 30 e 31 sem nenhuma tabela escrita à mão.
 *
 * ⚠️ O MÊS AQUI É DE 1 A 12, COMO A PESSOA CONTA — e não de 0 a 11, como o
 * `Date` do JavaScript conta. A conversão acontece uma vez, aqui dentro; fora
 * daqui ninguém precisa saber que ela existe.
 */
export function mesDoAno(ano: number, mes: number): PeriodoDoMes {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error(`Mês inválido: ${mes}. Use 1 a 12.`);
  }
  return {
    de: dataLocalISO(new Date(ano, mes - 1, 1)),
    ate: dataLocalISO(new Date(ano, mes, 0)),
  };
}

// ===========================================================================
// COMPETÊNCIA — 18/09/2026, para o orçamento e o dinheiro do período
// ===========================================================================
//
// ⚠️ COMPETÊNCIA É UM MÊS, E ELA É GUARDADA COMO O PRIMEIRO DIA DELE.
// "SETEMBRO / 2026" mora no banco como `2026-09-01`, numa coluna `date` com um
// `CHECK` que exige o dia 1. As três alternativas foram pesadas no estudo:
// texto "09/2026" não ordena (01/2027 viria antes de 09/2026) e dois inteiros
// obrigam todo filtro de intervalo a usar os dois campos com um OR no meio.
//
// ⚠️ E A CONVERSÃO MORA AQUI, NÃO NA TELA. É a mesma regra que trouxe os
// atalhos de mês para este arquivo: no Core ela é testável pelo `npm test`; na
// tela, só clicando.

/**
 * Os doze meses por extenso, para o campo de escolher a competência.
 *
 * ⚠️ LISTA FIXA, E NÃO `Intl`, pelo mesmo motivo de `MESES_CURTOS`: o
 * `Intl.DateTimeFormat` devolve "setembro" em minúsculas, e o módulo escreve
 * tudo em caixa alta. Converter a cada renderização é trabalho para nada.
 */
export const MESES_POR_EXTENSO = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
] as const;

/** A competência de uma data qualquer: "2026-09-17" → "2026-09-01". */
export function competenciaDe(iso: DataISO = hojeISO()): DataISO {
  return primeiroDiaDoMes(iso);
}

/** A competência do mês atual — o padrão das duas telas. */
export function competenciaAtual(): DataISO {
  return competenciaDe(hojeISO());
}

/** `competenciaDoMes(2026, 9)` → "2026-09-01". O mês é de 1 a 12. */
export function competenciaDoMes(ano: number, mes: number): DataISO {
  return mesDoAno(ano, mes).de;
}

/** Anda `passos` meses a partir de uma competência. Negativo anda para trás. */
export function deslocarCompetencia(competencia: DataISO, passos: number): DataISO {
  return deslocarMes(competencia, passos).de;
}

/**
 * A data está dentro da competência?
 *
 * ⚠️ ELA EXISTE POR UM FURO SILENCIOSO. Abrir o orçamento de SETEMBRO, clicar
 * numa conta e lançar com data 03/10 produz um lançamento válido que **não
 * entra na barra de setembro** — a barra não se mexe e a pessoa conclui que a
 * gravação falhou. A tela usa isto para avisar antes de gravar.
 */
export function ehDataNaCompetencia(data: DataISO, competencia: DataISO): boolean {
  return competenciaDe(data) === competenciaDe(competencia);
}

/**
 * A data que o lançamento deve sugerir dentro de uma competência: HOJE, se hoje
 * cair nela; senão o primeiro dia dela.
 *
 * Sugerir sempre o dia 1 dataria errado o lançamento do mês corrente, que é o
 * caso comum; sugerir sempre hoje dataria fora da competência ao trabalhar num
 * mês passado, que é o furo descrito acima.
 */
export function dataPadraoNaCompetencia(competencia: DataISO, hoje: DataISO = hojeISO()): DataISO {
  return ehDataNaCompetencia(hoje, competencia) ? hoje : competenciaDe(competencia);
}

/**
 * 🎁 O "RITMO DO MÊS" — quanto do mês já passou, em percentual.
 *
 * ⚠️ ELE MUDA A LEITURA DA BARRA INTEIRA. Consumir 78% do orçamento no dia 18
 * de setembro (quando 60% do mês passou) é diferente de consumir 78% no dia 30.
 * A barra sozinha não conta isso; a marca do ritmo conta.
 *
 * Fora da competência a resposta é absoluta, e tem de ser: um mês passado está
 * 100% vencido, e um mês futuro, 0%.
 */
export function ritmoDoMes(competencia: DataISO, hoje: DataISO = hojeISO()): number {
  const inicio = competenciaDe(competencia);
  if (hoje < inicio) return 0;

  const fim = ultimoDiaDoMes(inicio);
  if (hoje > fim) return 100;

  const diaDeHoje = deDataISO(hoje).getDate();
  const diasDoMes = deDataISO(fim).getDate();
  return Math.round((diaDeHoje / diasDoMes) * 100);
}
