"use client";

import { formatarBRL, formatarDataBR, type LancamentoNaLista } from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * ☑️ A LISTA DE LANÇAMENTOS COM CAIXA DE MARCAR (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/ListaParaExcluir.tsx
 *
 * Pedido do dono do projeto em 17/09/2026 (2ª rodada): *"adicionar listar os
 * registros e cada registro ter caixa para marcar ou desmarcar para excluir,
 * com opções selecionar todos e desmarcar todos"*.
 *
 * ⚠️ ELA SÓ DESENHA E AVISA. Não decide nada, não chama o banco e não sabe o
 * que é período fechado: recebe a lista e devolve cliques. Quem guarda a
 * escolha é o `useExclusaoPorPeriodo`; quem decide se dá para excluir é o
 * `avaliarExclusao`, no Core, com teste.
 *
 * ⚠️ TODAS AS LINHAS NASCEM MARCADAS, por decisão consciente. Era o
 * comportamento anterior desta tela (apagar o período inteiro), e desmarcar
 * duas de trinta é muito mais rápido que marcar vinte e oito.
 */
export default function ListaParaExcluir({
  lista, marcados, cortada, teto,
  aoAlternar, aoMarcarTodos, aoDesmarcarTodos,
}: {
  lista: LancamentoNaLista[];
  marcados: Set<string>;
  /** `true` quando a listagem bateu no teto — ver o aviso vermelho abaixo. */
  cortada: boolean;
  teto: number;
  aoAlternar: (id: string) => void;
  aoMarcarTodos: () => void;
  aoDesmarcarTodos: () => void;
}) {
  const botao =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 " +
    "text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50";

  if (lista.length === 0) {
    return (
      <p className="mt-5 text-sm text-slate-400 font-bold uppercase">
        NENHUM LANÇAMENTO NESTE PERÍODO.
      </p>
    );
  }

  return (
    <div className="mt-5">
      {/*
        ⚠️ ESTE AVISO É UM PORTÃO, NÃO UM ENFEITE. Ao bater no teto, a lista
        mostra um PEDAÇO do período — e marcar "todos" marcaria só o pedaço. O
        número da conferência viria do período inteiro e não corresponderia a
        nada do que está na tela. Melhor recusar e pedir um período menor do que
        trabalhar sobre um recorte em silêncio.
      */}
      {cortada && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">
          A LISTA FOI CORTADA EM {teto} REGISTROS — HÁ MAIS LANÇAMENTOS NESTE PERÍODO DO QUE
          CABE MARCAR DE UMA VEZ. REDUZA O PERÍODO (OU ESCOLHA UMA CONTA) E LISTE DE NOVO.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" onClick={aoMarcarTodos} className={botao}>
          <IconeFin nome="ativo" tamanho={13} />
          SELECIONAR TODOS
        </button>
        <button type="button" onClick={aoDesmarcarTodos} className={botao}>
          <IconeFin nome="inativo" tamanho={13} />
          DESMARCAR TODOS
        </button>
        <span className="ml-auto text-[11px] font-black uppercase tracking-widest text-slate-500">
          {marcados.size} DE {lista.length} MARCADO(S)
        </span>
      </div>

      <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left">
              {["", "DATA", "CONTA", "IDENTIFICADORA", "TIPO", "VALOR", "HISTÓRICO"].map((c, i) => (
                <th key={c || `c${i}`}
                    className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => {
              const marcado = marcados.has(l.id);
              return (
                /*
                  ⚠️ A LINHA INTEIRA ALTERNA A CAIXA, e a caixa NÃO corta a
                  propagação — aqui é o contrário do resto do módulo, e é de
                  propósito: os dois gestos querem a MESMA coisa. Se a célula da
                  caixa cortasse o clique, clicar exatamente nela funcionaria e
                  clicar ao lado dela também, mas clicar na caixa e na linha ao
                  mesmo tempo (o que acontece de fato) alternaria DUAS vezes e
                  pareceria não funcionar. Por isso o `<input>` é `readOnly`: quem
                  manda é o clique da linha, um só.
                */
                <tr key={l.id}
                    onClick={() => aoAlternar(l.id)}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); aoAlternar(l.id); } }}
                    tabIndex={0}
                    title={marcado ? "MARCADO PARA EXCLUIR — CLIQUE PARA DESMARCAR" : "CLIQUE PARA MARCAR"}
                    className={`cursor-pointer ${marcado ? "bg-red-50/60" : "hover:bg-slate-50"}`}>
                  <td className="px-2 py-2 border-b border-slate-100">
                    <input type="checkbox" checked={marcado} readOnly tabIndex={-1}
                           aria-label={`MARCAR O LANÇAMENTO DE ${formatarDataBR(l.data_movimento)}`}
                           className="w-4 h-4 pointer-events-none" />
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataBR(l.data_movimento)}</td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">
                    {l.conta_movimento?.nome ?? ""}
                    {l.transferencia_id && <span className="ml-1 text-[9px] font-black text-blue-600">TRANSF</span>}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">{l.conta_identificadora?.nome ?? ""}</td>
                  <td className={`px-2 py-2 border-b border-slate-100 font-black ${l.tipo_movimento === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                    {l.tipo_movimento === "ENTRADA" ? "ENTRADA" : "SAÍDA"}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 text-right font-mono">
                    {formatarBRL(l.valor_centavos, { semSimbolo: true })}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase text-slate-500 max-w-[180px] truncate">
                    {l.historico ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
        ⚠️ ESTE LEMBRETE NÃO É REDUNDANTE COM O RELATÓRIO DA CONFERÊNCIA. Ao
        marcar UMA perna de transferência, a outra sai junto (RN-23) mesmo sem
        aparecer marcada — e pode nem estar nesta lista, se for de outra conta.
        Quem só olha as caixas não teria como adivinhar isso.
      */}
      {lista.some((l) => l.transferencia_id) && (
        <p className="mt-3 text-[11px] font-bold uppercase text-amber-800">
          ⚠️ HÁ TRANSFERÊNCIAS NA LISTA (MARCADAS COM &ldquo;TRANSF&rdquo;). MARCAR UMA PERNA
          LEVA A OUTRA JUNTO, AINDA QUE ELA ESTEJA EM OUTRA CONTA. A CONFERÊNCIA MOSTRA O
          TOTAL DE VERDADE.
        </p>
      )}
    </div>
  );
}
