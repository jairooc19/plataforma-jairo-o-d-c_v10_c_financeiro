"use client";

import {
  formatarBRL, montarRelatorio, colunasNumericas, MESES_CURTOS,
  type BlocoDaGrade,
} from "@jairo/core";
import IconeFin from "../IconeFin";
import { abrirImpressao } from "../prepararImpressao";
import { baixarTSVGenerico } from "../exportarTSV";

/**
 * 🖨️ IMPRIMIR E EXPORTAR .TSV — os dois botões dos dashboards (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/dashboard/AcoesDoDashboard.tsx
 *
 * ⚠️ AS DUAS SAÍDAS PARTEM DA MESMA LISTA. `montarRelatorio`, no Core, monta as
 * linhas uma vez; uma cópia vai para a guia de impressão e a outra para o
 * arquivo. Montadas em dois lugares, seriam duas chances de divergir — e a
 * segunda é sempre a que esquece uma coluna.
 *
 * ⚠️ O PAPEL SAI DEITADO, e a medida é objetiva: num A4 em pé, 12 colunas de
 * mês sobram 1,20 cm cada, e "27.650,00" não cabe em 1,20 cm. Deitado sobram
 * 1,92 cm. O campo `orientacao` é novo e opcional — quem não o passa (a
 * CONFERÊNCIA e a PESQUISAR) continua saindo em pé, exatamente como antes.
 *
 * ⚠️ OS BOTÕES FICAM VISÍVEIS E APAGADOS quando não há o que imprimir, em vez
 * de sumirem. É o padrão adotado no módulo em 13/09/2026, com o motivo escrito:
 * botão que some confunde; botão apagado ensina que falta algo.
 */
export default function AcoesDoDashboard({
  blocos, comTotalDoAno, titulo, empresa, ano, podeImprimir, nomeDoArquivo,
  avisos = [], ocultarSemLancamento = false,
}: {
  blocos: BlocoDaGrade[];
  comTotalDoAno: boolean;
  titulo: string;
  empresa: string;
  ano: number;
  podeImprimir: boolean;
  /** Sem extensão: "saldos-por-conta-movimento". O ano entra aqui dentro. */
  nomeDoArquivo: string;
  /** Linhas extras no cabeçalho do papel (o regime, um filtro ligado…). */
  avisos?: string[];
  /**
   * Mês sem lançamento em conta nenhuma sai zerado, como na tela.
   *
   * ⚠️ O PAPEL TEM DE CONCORDAR COM A TELA. Célula zerada no monitor e cheia na
   * impressão faz a pessoa deixar de confiar nas duas — e não há como saber
   * qual estava certa olhando só uma.
   */
  ocultarSemLancamento?: boolean;
}) {
  if (!podeImprimir) return null;

  const vazio = blocos.length === 0;

  const relatorio = () => montarRelatorio(blocos, {
    meses: MESES_CURTOS,
    formatarValor: (c) => formatarBRL(c, { semSimbolo: true }),
    comTotalDoAno,
    ocultarSemLancamento,
  });

  const imprimir = () => {
    const r = relatorio();
    abrirImpressao({
      titulo,
      empresa,
      filtros: [`EXERCÍCIO DE ${ano}`, "REGIME CAIXA (COMPETÊNCIA NÃO ENTRA — RN-19)", ...avisos],
      colunas: r.colunas,
      colunasNumericas: colunasNumericas(MESES_CURTOS, comTotalDoAno),
      linhas: r.linhas,
      linhasDestaque: r.destaques,
      orientacao: "paisagem",
      rodape: `${titulo} · ${ano} · VALORES EM REAIS`,
    });
  };

  const exportar = () => {
    const r = relatorio();
    baixarTSVGenerico(`${nomeDoArquivo}-${ano}`, r.colunas, r.linhas);
  };

  const botao = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30";

  return (
    <>
      <button type="button" onClick={imprimir} disabled={vazio}
              title={vazio ? "NÃO HÁ NADA PARA IMPRIMIR NESTE ANO" : "IMPRIMIR A GRADE EXIBIDA (A4 DEITADO)"}
              className={`${botao} bg-slate-800 text-white`}>
        <IconeFin nome="imprimir" tamanho={15} />
        IMPRIMIR
      </button>

      <button type="button" onClick={exportar} disabled={vazio}
              title={vazio ? "NÃO HÁ NADA PARA EXPORTAR NESTE ANO" : "BAIXAR A GRADE EM .TSV (ABRE NO EXCEL)"}
              className={`${botao} bg-white border border-slate-300 text-slate-700`}>
        <IconeFin nome="exportar" tamanho={15} />
        EXPORTAR TSV
      </button>
    </>
  );
}
