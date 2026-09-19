"use client";

import { useCallback, useEffect, useState } from "react";
import {
  manutencaoFinanceiroService, formatarDataBR, formatarDataHoraBR,
  type EventoDeFechamento,
} from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * 📜 HISTÓRICO DE FECHAMENTOS DE PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/HistoricoDeFechamentos.tsx
 *
 * ===========================================================================
 * ⚠️ POR QUE ISTO PRECISOU EXISTIR — a tabela não guarda histórico
 * ===========================================================================
 * `fin_fechamentos` tem a restrição `UNIQUE (tenant_id, conta_movimento_id)`:
 * **uma linha por conta**, e só. Isso significa que, ao excluir um fechamento
 * (o botão "REABRIR"), some da tela qualquer vestígio de que aquele período
 * esteve fechado, de quem o fechou e de quando.
 *
 * Num sistema financeiro isso importa: "este mês foi conferido e trancado, e
 * depois alguém destrancou" é exatamente o tipo de evento que se precisa poder
 * mostrar depois.
 *
 * ⚠️ E A SAÍDA NÃO FOI MEXER NA TABELA. O dado já existia: o gatilho
 * `audit_fin_fech` grava cada UPDATE e cada DELETE de `fin_fechamentos`. Isto
 * aqui é só a janela para ele — nenhuma tabela nova, nenhuma alteração em
 * tabela da plataforma (a regra R5 do `MODULOS.md` proíbe o módulo de mexer em
 * estrutura alheia).
 *
 * ===========================================================================
 * ⚠️ CORRIGIDO EM 18/09/2026 — O PRIMEIRO FECHAMENTO SUMIA DAQUI
 * ===========================================================================
 * Este comentário dizia, até hoje: "o primeiro fechamento de uma conta não
 * aparece aqui, e isso é esperado". Era verdade sobre o código e **ruim para
 * quem usa**: quem fechou setembro uma única vez lia "NENHUMA ALTERAÇÃO
 * REGISTRADA" e concluía que o sistema não guardara nada.
 *
 * A causa: o gatilho da plataforma cobre `UPDATE` e `DELETE`, não `INSERT`.
 * A saída NÃO foi mexer nesse gatilho — ele serve a todas as tabelas do
 * sistema, e mudá-lo a pedido de um módulo é o que o LEGO proíbe. A saída foi
 * perceber que **o primeiro fechamento não está na auditoria porque ainda está
 * VIVO na tabela**: a função do banco passou a unir as duas fontes.
 *
 * Hoje a lista tem dois tipos de linha, e a coluna "O QUE" diz qual é qual:
 *   • `em_vigor: true`  → FECHAMENTO EM VIGOR — o que vale agora, da tabela
 *   • `em_vigor: false` → ALTEROU / EXCLUIU  — um evento passado, da auditoria
 */
export default function HistoricoDeFechamentos({ tenantId }: { tenantId: string | null }) {
  const [eventos, setEventos] = useState<EventoDeFechamento[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!tenantId || !aberto) return;
    setCarregando(true); setErro(null);
    try {
      setEventos(await manutencaoFinanceiroService.historicoDeFechamentos(tenantId, 100));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO LER O HISTÓRICO.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, aberto]);

  // ⚠️ O `if` fica DENTRO do efeito (e dentro do `carregar`), nunca antes dele:
  // a contagem de hooks tem de ser a mesma em toda renderização.
  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar]);

  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      {/*
        ⚠️ NASCE FECHADO, E SÓ BUSCA QUANDO ABRE. O histórico é consulta
        eventual — carregá-lo junto com a tela custaria uma viagem ao banco em
        toda abertura de CONFIGURAÇÕES, para uma lista que quase ninguém abre.
        É a mesma lição da ficha do lançamento: buscar sob demanda, por id.
      */}
      <button type="button" onClick={() => setAberto((v) => !v)}
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <IconeFin nome={aberto ? "fecharNivel" : "abrirNivel"} tamanho={14} />
        HISTÓRICO DE FECHAMENTOS {aberto ? "" : "(VER)"}
      </button>

      {aberto && (
        <div className="mt-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800 mb-3">
              {erro}
            </div>
          )}

          {carregando ? (
            <p className="text-xs text-slate-400 font-bold uppercase">CARREGANDO…</p>
          ) : eventos.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold uppercase">
              NENHUM PERÍODO FECHADO, E NENHUMA ALTERAÇÃO OU EXCLUSÃO REGISTRADA.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">
                AS LINHAS EM VERDE SÃO OS FECHAMENTOS QUE ESTÃO VALENDO AGORA. AS DEMAIS SÃO
                EVENTOS JÁ PASSADOS — ALTERAÇÕES E REABERTURAS.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    {/* "FECHADO ATÉ" serve às duas espécies de linha; "ESTAVA
                        FECHADO ATÉ" (o rótulo antigo) ficaria errado justamente
                        na linha do fechamento que ainda está em vigor. */}
                    {["QUANDO","O QUE","QUEM","CONTA","FECHADO ATÉ","OBSERVAÇÃO"].map((c) => (
                      <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e, i) => (
                    <tr key={`${e.quando}-${i}`}
                        className={e.em_vigor ? "bg-emerald-50/50" : "hover:bg-blue-50/40"}>
                      <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataHoraBR(e.quando)}</td>
                      {/*
                        ⚠️ A COR VEM DE `em_vigor`, QUE É UM DADO, e não de uma
                        comparação com o texto da coluna. Ler o rótulo para
                        decidir a cor funcionaria hoje e quebraria em silêncio
                        no dia em que alguém reescrevesse a frase no banco.
                      */}
                      <td className={`px-2 py-2 border-b border-slate-100 font-black ${
                        e.em_vigor ? "text-emerald-700"
                        : e.operacao.startsWith("EXCLUIU") ? "text-red-700"
                        : "text-slate-600"}`}>
                        {e.operacao}
                      </td>
                      <td className="px-2 py-2 border-b border-slate-100 text-slate-500">{e.quem}</td>
                      <td className="px-2 py-2 border-b border-slate-100 uppercase">{e.conta}</td>
                      <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">
                        {e.fechado_ate ? formatarDataBR(e.fechado_ate) : "—"}
                      </td>
                      <td className="px-2 py-2 border-b border-slate-100 uppercase text-slate-500">{e.observacao ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
