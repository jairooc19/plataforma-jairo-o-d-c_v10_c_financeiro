"use client";

import React from "react";
import { formatarBRL, formatarDataBR, type LinhaDoExtrato } from "@jairo/core";
import MenuDeLinha, { type AcaoDeLinha } from "./MenuDeLinha";

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
 *
 * ⚠️ 13/09/2026 — DUAS COLUNAS NOVAS, A PEDIDO DO DONO DO PROJETO: USUÁRIO (quem
 * lançou) e OPÇÕES (editar e excluir a linha). A de usuário exigiu mudar a
 * função `fin_extrato` no banco, que não devolvia essa informação.
 *
 * ⚠️ O MENU SÓ APARECE NAS LINHAS DE LANÇAMENTO. "SALDO INICIAL" e "TOTAIS DO
 * PERÍODO" são somas, não registros: não existe o que editar nem o que excluir
 * ali. Um menu naquelas linhas prometeria uma ação impossível.
 *
 * ⚠️ 16/09/2026 — A LINHA INTEIRA ABRIU. Clicar num lançamento mostra a ficha
 * completa dele (`DetalheDoLancamento`). Vale a MESMA regra do menu: só as
 * linhas de LANÇAMENTO respondem — "SALDO INICIAL" e "TOTAIS" não têm ficha.
 *
 * ⚠️ A CÉLULA "OK" E A "AÇÕES" CORTAM A PROPAGAÇÃO, E ISSO NÃO É ENFEITE. Sem
 * o `stopPropagation`, marcar um lançamento como conferido — ou abrir o menu
 * de ações — escalaria até a `<tr>` e abriria a janela de detalhe por cima do
 * que a pessoa quis fazer. O clique é um só; quem estiver mais perto fica com
 * ele.
 */
export default function ExtratoDaConta({
  linhas, carregando, mensagem, podeConciliar, onConferir, onEditar, onExcluir,
  podeEditar = false, podeExcluir = false, onAbrirDetalhe,
}: {
  linhas: LinhaDoExtrato[];
  carregando: boolean;
  mensagem?: string | null;
  podeConciliar: boolean;
  onConferir?: (lancamentoId: string, conferido: boolean) => void;
  onEditar?: (lancamentoId: string) => void;
  onExcluir?: (lancamentoId: string) => void;
  podeEditar?: boolean;
  podeExcluir?: boolean;
  /** Clique na linha: abre a ficha completa do lançamento (16/09/2026). */
  onAbrirDetalhe?: (lancamentoId: string) => void;
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

  const temMenu = podeEditar || podeExcluir;

  const colunas = [
    "DATA", "ORDEM", "CONTA IDENTIFICADORA", "ENTRADA", "SAÍDA", "SALDO",
    "HISTÓRICO", "USUÁRIO",
    ...(podeConciliar ? ["OK"] : []),
    ...(temMenu ? ["AÇÕES"] : []),
  ];

  const acoesDaLinha = (l: LinhaDoExtrato): AcaoDeLinha[] => {
    const lista: AcaoDeLinha[] = [];
    if (podeEditar && onEditar && l.lancamento_id) {
      lista.push({ rotulo: "EDITAR", icone: "editar", aoClicar: () => onEditar(l.lancamento_id!) });
    }
    if (podeExcluir && onExcluir && l.lancamento_id) {
      lista.push({ rotulo: "EXCLUIR", icone: "excluir", destrutiva: true, aoClicar: () => onExcluir(l.lancamento_id!) });
    }
    return lista;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left">
            {colunas.map((c) => (
              <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const ehResumo = l.linha_tipo !== "LANCAMENTO";
            const abrir = !ehResumo && l.lancamento_id && onAbrirDetalhe
              ? () => onAbrirDetalhe(l.lancamento_id!)
              : undefined;
            return (
              <tr
                key={l.lancamento_id ?? `${l.linha_tipo}-${i}`}
                onClick={abrir}
                onKeyDown={abrir ? (e) => { if (e.key === "Enter") abrir(); } : undefined}
                tabIndex={abrir ? 0 : undefined}
                title={abrir ? "VER TODAS AS INFORMAÇÕES DESTE LANÇAMENTO" : undefined}
                className={ehResumo
                  ? "bg-slate-50 font-black"
                  : `hover:bg-blue-50/40 ${abrir ? "cursor-pointer" : ""}`}
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
                {/* Quem lançou. Vazio nas linhas de resumo, que não têm autor. */}
                <td className="px-2 py-2 text-slate-400 border-b border-slate-100 max-w-[150px] truncate"
                    title={l.usuario ?? ""}>
                  {l.usuario ?? ""}
                </td>
                {podeConciliar && (
                  <td className="px-2 py-2 text-center border-b border-slate-100"
                      onClick={(e) => e.stopPropagation()}>
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
                {temMenu && (
                  <td className="px-2 py-2 text-right border-b border-slate-100 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}>
                    {l.linha_tipo === "LANCAMENTO" && l.lancamento_id && (
                      <MenuDeLinha acoes={acoesDaLinha(l)} />
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
