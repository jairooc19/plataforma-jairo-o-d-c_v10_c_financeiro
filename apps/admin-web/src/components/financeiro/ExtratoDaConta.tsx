"use client";

import React from "react";
import { formatarBRL, formatarDataBR, type LinhaDoExtrato } from "@jairo/core";

/**
 * 📊 A CONFERÊNCIA DA CONTA — o extrato com saldo (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/ExtratoDaConta.tsx
 *
 * ⚠️ ESTE COMPONENTE NÃO CALCULA NADA. As três colunas de dinheiro e o saldo
 * vêm prontos da função `fin_extrato`. É o que garante que a tela, o relatório
 * impresso e a exportação mostrem o MESMO número — os três chamam a mesma
 * função. Se a soma morasse aqui, o relatório teria a sua própria cópia da
 * lógica, e o dia em que uma fosse corrigida e a outra não, apareceriam dois
 * saldos para o mesmo mês.
 *
 * As três espécies de linha (saldo inicial, lançamento, totais) chegam na mesma
 * lista, distinguidas por `linha_tipo`.
 */
export default function ExtratoDaConta({
  linhas, carregando, mensagem, podeConciliar, onConferir,
}: {
  linhas: LinhaDoExtrato[];
  carregando: boolean;
  mensagem?: string | null;
  podeConciliar: boolean;
  onConferir?: (lancamentoId: string, conferido: boolean) => void;
}) {
  if (mensagem) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{mensagem}</p>
      </div>
    );
  }

  if (carregando) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left">
            {["DATA", "ORDEM", "CONTA IDENTIFICADORA", "ENTRADA", "SAÍDA", "SALDO", "HISTÓRICO", podeConciliar ? "OK" : ""].map((c) => (
              <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const ehResumo = l.linha_tipo !== "LANCAMENTO";
            return (
              <tr
                key={l.lancamento_id ?? `${l.linha_tipo}-${i}`}
                className={ehResumo ? "bg-slate-50 font-black" : "hover:bg-blue-50/40"}
              >
                <td className="px-2 py-2 whitespace-nowrap border-b border-slate-100">{formatarDataBR(l.data_movimento)}</td>
                <td className="px-2 py-2 text-center border-b border-slate-100">{l.ordem_extrato ?? ""}</td>
                <td className="px-2 py-2 uppercase border-b border-slate-100">{l.identificadora}</td>
                <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-emerald-700">
                  {l.entrada_centavos != null ? formatarBRL(l.entrada_centavos, { semSimbolo: true }) : ""}
                </td>
                <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-red-700">
                  {l.saida_centavos != null ? formatarBRL(l.saida_centavos, { semSimbolo: true }) : ""}
                </td>
                <td className={`px-2 py-2 text-right font-mono border-b border-slate-100 ${
                  l.saldo_centavos < 0 ? "text-red-700" : "text-slate-800"
                }`}>
                  {formatarBRL(l.saldo_centavos, { semSimbolo: true })}
                </td>
                <td className="px-2 py-2 uppercase text-slate-500 border-b border-slate-100 max-w-[180px] truncate">
                  {l.historico ?? ""}
                </td>
                {podeConciliar && (
                  <td className="px-2 py-2 text-center border-b border-slate-100">
                    {l.linha_tipo === "LANCAMENTO" && l.lancamento_id && (
                      <input
                        type="checkbox"
                        checked={l.conferido === true}
                        onChange={(e) => onConferir?.(l.lancamento_id!, e.target.checked)}
                        className="w-4 h-4"
                        title="MARCAR COMO CONFERIDO"
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
