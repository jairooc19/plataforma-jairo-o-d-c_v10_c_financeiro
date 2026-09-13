"use client";

/**
 * 🖨️ PASSAGEM DOS DADOS PARA A GUIA DE IMPRESSÃO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/prepararImpressao.ts
 *
 * A especificação pede que IMPRIMIR abra uma NOVA GUIA com o layout de papel.
 * Isso cria um problema prático: como a guia nova recebe o que está na tela?
 *
 * ⚠️ NÃO DÁ PARA USAR `sessionStorage`: ele é POR ABA — a guia nova nasceria
 * com o armazenamento vazio. E passar tudo pela URL estouraria o limite de
 * tamanho com poucas dezenas de linhas.
 *
 * A saída é o `localStorage`, que é compartilhado entre as guias da mesma
 * origem: a tela grava o conteúdo, abre a guia, e a guia lê e apaga. A chave é
 * temporária e some depois de lida — não fica dado financeiro guardado no
 * navegador à toa.
 */

export const CHAVE_IMPRESSAO = "fin_impressao";

export interface ConteudoParaImpressao {
  titulo: string;
  empresa?: string;
  filtros: string[];
  colunas: string[];
  /** Cada linha é um vetor de textos já formatados — a guia de impressão não calcula nada. */
  linhas: string[][];
  /** Alinha à direita as colunas de dinheiro. */
  colunasNumericas?: number[];
  rodape?: string;
}

export function abrirImpressao(conteudo: ConteudoParaImpressao) {
  try {
    localStorage.setItem(CHAVE_IMPRESSAO, JSON.stringify({ ...conteudo, emitidoEm: new Date().toISOString() }));
  } catch {
    // Navegador com armazenamento bloqueado: a guia avisa que não há o que imprimir.
  }
  window.open("/dashboard/financeiro/imprimir", "_blank");
}
