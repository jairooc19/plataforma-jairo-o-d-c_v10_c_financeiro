/**
 * 🧠 AS DECISÕES DO ORÇAMENTO E DA BARRA — FORA DA TELA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/orcamentoRegras.ts
 *
 * O banco devolve as linhas prontas. O que sobra são DECISÕES de leitura — a
 * cor da barra, o que a barra escreve ao lado, a largura dela — e decisão
 * dentro de componente `.tsx` não tem como ser testada por `npm test`, porque o
 * `node --test` não lê JSX.
 *
 * ⚠️ ESTE ARQUIVO NÃO IMPORTA NADA EM TEMPO DE EXECUÇÃO, e isso é regra do
 * projeto: o `node --test` não resolve caminho sem extensão, e o `.ts`
 * explícito quebraria o `next build` (TS5097). Arquivo com teste é arquivo sem
 * dependência — o que vier de fora entra por parâmetro.
 */

import type { LinhaDoDinheiro, LinhaDoOrcamento } from './tipos';

/** As três faixas da barra de consumo. */
export type FaixaDeConsumo = 'VERDE' | 'AMBAR' | 'VERMELHO';

/**
 * A cor da barra.
 *
 * ===========================================================================
 * ⚠️ NAS RECEITAS O SENTIDO SE INVERTE, E ISSO NÃO É DETALHE
 * ===========================================================================
 * Bater 100% de uma DESPESA é ruim — não sobrou folga. Bater 100% de uma
 * RECEITA é **bom** — a meta entrou. Usar a mesma escala nos dois pintaria de
 * verde uma receita que não chegou, e de vermelho uma meta cumprida.
 *
 *   DESPESA / OUTRAS   < 80 verde · 80 a 100 âmbar · > 100 vermelho
 *   RECEITA           >= 100 verde · 80 a 99 âmbar · < 80 vermelho
 */
export function faixaDeConsumo(
  consumo: number | null,
  tipo: string | null,
): FaixaDeConsumo {
  const c = consumo ?? 0;
  if (tipo === 'RECEITA') {
    if (c >= 100) return 'VERDE';
    if (c >= 80) return 'AMBAR';
    return 'VERMELHO';
  }
  if (c > 100) return 'VERMELHO';
  if (c >= 80) return 'AMBAR';
  return 'VERDE';
}

/**
 * A largura da barra, de 0 a 100.
 *
 * ⚠️ ELA É LIMITADA A 100 DE PROPÓSITO. Um consumo de 140% desenharia uma barra
 * que vaza para fora da célula e empurra a tabela inteira. Quem conta que
 * estourou é a COR e o texto ao lado — não o comprimento.
 */
export function larguraDaBarra(consumo: number | null): number {
  return Math.max(0, Math.min(100, consumo ?? 0));
}

/**
 * O que a tela escreve ao lado da barra.
 *
 * ⚠️ AS QUATRO FRASES SÃO DIFERENTES DE PROPÓSITO. "100%" quer dizer coisas
 * opostas numa receita e numa despesa, e um rótulo único ("100% consumido")
 * deixaria a pessoa traduzir de cabeça em toda linha.
 *
 * No modo percentual não há valor para escrever — e a frase não pode inventar
 * um. Ela então fala só do percentual.
 *
 * ⚠️ O FORMATADOR CHEGA POR PARÂMETRO, e não por import: este arquivo tem teste,
 * e arquivo com teste é arquivo sem dependência (ver o topo). A tela passa o
 * `formatarBRL` do Core; o teste passa o que quiser.
 */
export function situacaoDaLinha(
  linha: LinhaDoDinheiro,
  formatar: (centavos: number) => string,
): {
  texto: string;
  /** `true` quando merece destaque visual (estouro ou meta atingida). */
  destaque: boolean;
} {
  const receita = linha.tipo === 'RECEITA';
  const consumo = linha.consumo_percentual ?? 0;
  const saldo = linha.saldo_centavos;

  if (linha.bloco === 'FORA') {
    return { texto: 'SEM ORÇAMENTO NESTA COMPETÊNCIA', destaque: true };
  }

  // Modo percentual: não há valor para citar, e inventar um seria mentir.
  if (saldo === null) {
    if (receita) {
      return consumo >= 100
        ? { texto: 'META ATINGIDA', destaque: true }
        : { texto: `${consumo}% DA META`, destaque: false };
    }
    return consumo > 100
      ? { texto: `ESTOUROU (${consumo}%)`, destaque: true }
      : { texto: `${consumo}% CONSUMIDO`, destaque: false };
  }

  if (receita) {
    if (saldo <= 0) return { texto: 'META ATINGIDA', destaque: true };
    return { texto: `FALTAM ${formatar(saldo)}`, destaque: false };
  }

  if (saldo < 0) return { texto: `ESTOUROU EM ${formatar(-saldo)}`, destaque: true };
  if (saldo === 0) return { texto: 'SEM FOLGA', destaque: true };
  return { texto: `RESTAM ${formatar(saldo)}`, destaque: false };
}

/** Um bloco da tela do orçamento ou do dinheiro do período. */
export interface BlocoDeLinhas<T> {
  chave: string;
  rotulo: string;
  linhas: T[];
  total: T | null;
}

const ROTULO: Record<string, string> = {
  RECEITA: 'RECEITAS',
  DESPESA: 'DESPESAS',
  OUTRAS: 'OUTRAS',
  RESULTADO: 'RESULTADO DO MÊS',
  FORA: 'GASTO FORA DO ORÇAMENTO',
};

/** O nome do bloco como ele aparece no cabeçalho. */
export function rotuloDoBlocoDeOrcamento(bloco: string): string {
  return ROTULO[bloco] ?? bloco;
}

/**
 * Arruma as linhas em blocos, preservando a ordem que o BANCO devolveu.
 *
 * ⚠️ A ORDEM NÃO É RECALCULADA AQUI. Ela vem de `fin_listar_orcamento` e de
 * `fin_dinheiro_do_periodo`, que já ordenam RECEITA → DESPESA → (RESULTADO) →
 * OUTRAS → FORA. Reordenar de novo criaria uma segunda regra que um dia
 * discordaria da primeira sobre acento.
 */
export function agruparEmBlocos<T extends { bloco: string; linha_tipo: 'CONTA' | 'TOTAL' }>(
  linhas: T[],
): BlocoDeLinhas<T>[] {
  const blocos: BlocoDeLinhas<T>[] = [];
  const porChave = new Map<string, BlocoDeLinhas<T>>();

  for (const l of linhas) {
    let bloco = porChave.get(l.bloco);
    if (!bloco) {
      bloco = { chave: l.bloco, rotulo: rotuloDoBlocoDeOrcamento(l.bloco), linhas: [], total: null };
      porChave.set(l.bloco, bloco);
      blocos.push(bloco);
    }
    if (l.linha_tipo === 'TOTAL') bloco.total = l;
    else bloco.linhas.push(l);
  }

  return blocos;
}

/**
 * A competência já tem orçamento?
 *
 * ⚠️ ELA OLHA AS LINHAS DE **CONTA**, e não o tamanho da lista. Uma resposta
 * só com linhas de TOTAL (que não acontece hoje, mas custa nada prever) diria
 * "tem orçamento" sobre uma competência vazia.
 */
export function temOrcamento(linhas: LinhaDoOrcamento[]): boolean {
  return linhas.some((l) => l.linha_tipo === 'CONTA');
}

/**
 * Já existe orçamento desta conta nesta competência? Devolve a linha, ou `null`.
 *
 * ⚠️ É O QUE PERMITE A TELA PERGUNTAR "SUBSTITUIR?" EM VEZ DE DEIXAR O BANCO
 * RECUSAR. A recusa continua lá (o índice único), e é ela que vale — isto aqui
 * é só a cortesia de avisar antes.
 */
export function orcamentoExistente(
  linhas: LinhaDoOrcamento[],
  contaId: string,
): LinhaDoOrcamento | null {
  return linhas.find((l) => l.linha_tipo === 'CONTA' && l.conta_id === contaId) ?? null;
}
