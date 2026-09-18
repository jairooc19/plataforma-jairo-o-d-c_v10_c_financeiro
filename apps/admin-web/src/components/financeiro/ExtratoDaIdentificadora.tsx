"use client";

import { formatarBRL, formatarDataBR, type LinhaDoExtratoIdentificadora } from "@jairo/core";

/**
 * 📊 A CONFERÊNCIA DA CONTA IDENTIFICADORA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/ExtratoDaIdentificadora.tsx
 *
 * Nos moldes do `ExtratoDaConta.tsx`, como o dono do projeto pediu — com duas
 * diferenças que não são escolha, e sim consequência do que a identificadora é.
 *
 * ===========================================================================
 * ⚠️ 1. NÃO HÁ LINHA DE "SALDO INICIAL"
 * ===========================================================================
 * No extrato de uma conta movimento, a primeira linha diz quanto havia ANTES do
 * período — o dinheiro estava lá. Aqui não existe "quanto havia de energia
 * elétrica em 28 de fevereiro": a identificadora não acumula, ela explica.
 * Inventar essa linha somando todos os anos anteriores daria um número que
 * ninguém pediu e que só confundiria.
 *
 * ===========================================================================
 * ⚠️ 2. A COLUNA SE CHAMA "ACUMULADO", E NÃO "SALDO"
 * ===========================================================================
 * Ela começa em ZERO na primeira linha e fecha igual ao total do período.
 * Chamá-la de saldo ensinaria a coisa errada — e um dia alguém levaria esse
 * número para um balanço. O acumulado segue a direção natural do tipo: numa
 * DESPESA ele soma as saídas e desconta as entradas, de modo que o rodapé desta
 * tela seja IDÊNTICO à célula do mês no dashboard. É isso que faz dela uma
 * conferência, e não uma segunda opinião.
 *
 * ⚠️ E A COLUNA DO MEIO É O ESPELHO: onde o extrato comum mostra a
 * IDENTIFICADORA, aqui aparece a CONTA MOVIMENTO — onde o dinheiro andou.
 *
 * ⚠️ NADA É CALCULADO AQUI. Tudo vem de `fin_extrato_identificadora`.
 */
export default function ExtratoDaIdentificadora({
  linhas, carregando, mensagem,
}: {
  linhas: LinhaDoExtratoIdentificadora[];
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

  const colunas = ["DATA", "ORDEM", "CONTA MOVIMENTO", "ENTRADA", "SAÍDA",
                   "ACUMULADO", "HISTÓRICO", "USUÁRIO", "OK"];

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
                <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-emerald-700">
                  {l.entrada_centavos != null ? formatarBRL(l.entrada_centavos, { semSimbolo: true }) : ""}
                </td>
                <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-red-700">
                  {l.saida_centavos != null ? formatarBRL(l.saida_centavos, { semSimbolo: true }) : ""}
                </td>
                <td className={`px-2 py-2 text-right font-mono border-b border-slate-100 ${
                  l.acumulado_centavos < 0 ? "text-red-700" : "text-slate-800"
                }`}>
                  {formatarBRL(l.acumulado_centavos, { semSimbolo: true })}
                </td>
                <td className="px-2 py-2 uppercase text-slate-500 border-b border-slate-100 max-w-[180px] truncate">
                  {l.historico ?? ""}
                </td>
                <td className="px-2 py-2 text-slate-400 border-b border-slate-100 max-w-[150px] truncate"
                    title={l.usuario ?? ""}>
                  {l.usuario ?? ""}
                </td>
                {/* ⚠️ SÓ MOSTRA se já foi conferido; não deixa MARCAR. Marcar
                    como conferido exige a permissão `conciliar` e pertence ao
                    extrato da CONTA MOVIMENTO, que é onde a conferência contra
                    o extrato do banco acontece. */}
                <td className="px-2 py-2 text-center border-b border-slate-100">
                  {l.linha_tipo === "LANCAMENTO" && l.conferido ? "✓" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
