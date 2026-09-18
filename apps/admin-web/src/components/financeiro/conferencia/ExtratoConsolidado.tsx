"use client";

import { formatarBRL, formatarDataBR, type LinhaDoExtratoConsolidado } from "@jairo/core";

/**
 * 📊 O EXTRATO DE VÁRIAS CONTAS SOMADAS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/conferencia/ExtratoConsolidado.tsx
 *
 * É o destino do clique na linha de TOTAL do dashboard 1: "de onde vem este
 * total de CAIXA + BANCO?".
 *
 * ⚠️ A DIFERENÇA PARA O EXTRATO COMUM É UMA COLUNA: aqui aparece de QUAL conta
 * é cada lançamento. Sem ela, a lista seria um amontoado de linhas sem dono, e
 * o saldo correndo no meio não se explicaria.
 *
 * ⚠️ ELE NÃO CALCULA NADA — nem o saldo inicial, nem o saldo linha a linha, nem
 * os totais. Tudo vem de `fin_extrato_consolidado`, que soma as aberturas das
 * contas escolhidas e tudo o que é anterior ao período. É o mesmo desenho do
 * `ExtratoDaConta`, e pelo mesmo motivo.
 *
 * ⚠️ AQUI A LINHA NÃO ABRE A FICHA DO LANÇAMENTO, e é decisão consciente: esta
 * é uma tela de CONFERÊNCIA de totais, alcançada a partir de um total. Quem
 * quer a ficha de um lançamento específico tem a CONFERÊNCIA DA CONTA e a
 * PESQUISAR, que já fazem isso. Oferecer um terceiro caminho para a mesma ficha
 * seria a "terceira resposta para a mesma pergunta" que o menu evita.
 */
export default function ExtratoConsolidado({
  linhas, carregando, mensagem,
}: {
  linhas: LinhaDoExtratoConsolidado[];
  carregando: boolean;
  mensagem?: string | null;
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

  const colunas = ["DATA", "ORDEM", "CONTA MOVIMENTO", "CONTA IDENTIFICADORA",
                   "ENTRADA", "SAÍDA", "SALDO", "HISTÓRICO", "USUÁRIO"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left">
            {colunas.map((c) => (
              <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400
                                     border-b border-slate-200 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const ehResumo = l.linha_tipo !== "LANCAMENTO";
            return (
              <tr key={l.lancamento_id ?? `${l.linha_tipo}-${i}`}
                  className={ehResumo ? "bg-slate-50 font-black" : ""}>
                <td className="px-2 py-2 whitespace-nowrap border-b border-slate-100">{formatarDataBR(l.data_movimento)}</td>
                <td className="px-2 py-2 text-center border-b border-slate-100">{l.ordem_extrato ?? ""}</td>
                <td className="px-2 py-2 uppercase border-b border-slate-100">{l.conta_movimento}</td>
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
                <td className="px-2 py-2 text-slate-400 border-b border-slate-100 max-w-[150px] truncate"
                    title={l.usuario ?? ""}>
                  {l.usuario ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
