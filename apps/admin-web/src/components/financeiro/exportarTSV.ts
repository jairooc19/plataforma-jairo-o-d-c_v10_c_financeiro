"use client";

import { formatarBRL, formatarDataBR } from "@jairo/core";

/**
 * 📤 EXPORTAÇÃO EM TSV (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/exportarTSV.ts
 *
 * ⚠️ TSV, E NÃO CSV — decisão sua, e ela resolve dois problemas reais do CSV
 * no Brasil:
 *   1. O VALOR TEM VÍRGULA. "1.234,56" num CSV colide com o separador, e a
 *      solução (aspas em tudo) ainda falha em alguma configuração.
 *   2. O SEPARADOR DO EXCEL MUDA COM O IDIOMA DO WINDOWS: em português ele
 *      espera ponto-e-vírgula; em inglês, vírgula. O mesmo arquivo abre certo
 *      numa máquina e embaralhado na outra. A tabulação é igual em todo lugar.
 *
 * ⚠️ DUAS PRECAUÇÕES QUE PARECEM PARANOIA E NÃO SÃO:
 *   • tabulação ou quebra de linha digitadas no histórico partiriam a linha ao
 *     meio — viram espaço;
 *   • texto começando com `=`, `+`, `-` ou `@` é interpretado como FÓRMULA pelo
 *     Excel. O apóstrofo à frente neutraliza.
 */

interface LinhaExportavel {
  data_movimento: string;
  conta_movimento?: { nome: string } | null;
  tipo_conta_movimento: string;
  conta_identificadora?: { nome: string } | null;
  tipo_conta_identificadora: string;
  tipo_movimento: string;
  propriedade: string;
  regime: string;
  valor_centavos: number;
  historico: string | null;
  usuario?: { email: string } | null;
  conferido: boolean;
  ordem_extrato: number | null;
}

/** Limpa o texto para caber numa célula e não virar fórmula. */
function celula(valor: string | null | undefined): string {
  const limpo = (valor ?? "").replace(/[\t\r\n]+/g, " ").trim();
  return /^[=+\-@]/.test(limpo) ? `'${limpo}` : limpo;
}

export function montarTSV(linhas: LinhaExportavel[], nomeDaEmpresa: string): string {
  const cabecalho = [
    "EMPRESA", "DATA", "CONTA MOVIMENTO", "TIPO DA CONTA MOVIMENTO",
    "CONTA IDENTIFICADORA", "TIPO DA CONTA IDENTIFICADORA", "TIPO DO MOVIMENTO",
    "PROPRIEDADE", "REGIME", "VALOR", "HISTORICO", "USUARIO", "CONFERIDO", "ORDEM NO EXTRATO",
  ].join("\t");

  const corpo = linhas.map((l) => [
    celula(nomeDaEmpresa),
    formatarDataBR(l.data_movimento),
    celula(l.conta_movimento?.nome),
    l.tipo_conta_movimento,
    celula(l.conta_identificadora?.nome),
    l.tipo_conta_identificadora,
    l.tipo_movimento === "SAIDA" ? "SAIDA" : "ENTRADA",
    l.propriedade,
    l.regime,
    formatarBRL(l.valor_centavos, { semSimbolo: true }),
    celula(l.historico),
    celula(l.usuario?.email),
    l.conferido ? "SIM" : "NAO",
    l.ordem_extrato != null ? String(l.ordem_extrato) : "",
  ].join("\t"));

  return [cabecalho, ...corpo].join("\r\n");
}

/** Gera o arquivo e entrega ao navegador. */
export function baixarTSV(linhas: LinhaExportavel[], nomeDaEmpresa = "") {
  const conteudo = montarTSV(linhas, nomeDaEmpresa);
  // ⚠️ O BOM (﻿) é o que faz o Excel mostrar os acentos corretamente.
  const blob = new Blob(["﻿" + conteudo], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.tsv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
