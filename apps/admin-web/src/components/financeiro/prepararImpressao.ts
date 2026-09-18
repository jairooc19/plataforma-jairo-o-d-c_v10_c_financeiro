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
  /**
   * 📄 A ORIENTAÇÃO DO PAPEL (18/09/2026).
   *
   * ⚠️ AUSENTE = RETRATO, QUE É EXATAMENTE O QUE SEMPRE FOI. Este campo nasceu
   * para os dashboards, e a medida é objetiva: uma tabela de 13 ou 14 colunas
   * num A4 em pé sobra **1,20 cm por mês** (21 cm de papel, menos 1,6 cm de
   * margem, menos 5 cm do nome da conta, dividido por 12). "27.650,00" não cabe
   * em 1,20 cm. Deitado sobram 1,92 cm, e cabe com folga.
   *
   * Quem não passa o campo não sente diferença nenhuma — a CONFERÊNCIA DA CONTA
   * e a PESQUISAR continuam saindo em pé, como sempre saíram.
   */
  orientacao?: 'retrato' | 'paisagem';
  /**
   * 🔠 As linhas que saem em NEGRITO (índice base 0 dentro de `linhas`).
   *
   * ⚠️ SEM ISSO, O TOTAL SAI COM A MESMA CARA DE UMA CONTA QUALQUER. Num
   * relatório de duas páginas, procurar o total no meio de trinta linhas iguais
   * é o tipo de atrito que faz alguém preferir a calculadora ao relatório.
   * Quem monta a lista é `montarRelatorio`, no Core, junto com as próprias
   * linhas — nunca a tela contando de novo.
   */
  linhasDestaque?: number[];
}

export function abrirImpressao(conteudo: ConteudoParaImpressao) {
  try {
    localStorage.setItem(CHAVE_IMPRESSAO, JSON.stringify({ ...conteudo, emitidoEm: new Date().toISOString() }));
  } catch {
    // Navegador com armazenamento bloqueado: a guia avisa que não há o que imprimir.
  }
  window.open("/dashboard/financeiro/imprimir", "_blank");
}
