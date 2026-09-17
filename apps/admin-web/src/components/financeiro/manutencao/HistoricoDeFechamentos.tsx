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
 * ⚠️ O PRIMEIRO FECHAMENTO DE UMA CONTA NÃO APARECE AQUI, e isso é esperado: o
 * gatilho cobre UPDATE e DELETE, não INSERT. Quem responde "está fechado até
 * quando?" é a lista de fechamentos vigentes, logo acima nesta mesma tela.
 * Esta é a lista do que MUDOU.
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
              NENHUMA ALTERAÇÃO OU EXCLUSÃO DE FECHAMENTO REGISTRADA.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    {["QUANDO","O QUE","QUEM","CONTA","ESTAVA FECHADO ATÉ","OBSERVAÇÃO"].map((c) => (
                      <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e, i) => (
                    <tr key={`${e.quando}-${i}`} className="hover:bg-blue-50/40">
                      <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataHoraBR(e.quando)}</td>
                      <td className={`px-2 py-2 border-b border-slate-100 font-black ${e.operacao.startsWith("EXCLUIU") ? "text-red-700" : "text-slate-600"}`}>
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
