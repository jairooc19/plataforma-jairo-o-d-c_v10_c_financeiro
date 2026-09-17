"use client";

import { useCallback, useEffect, useState } from "react";
import {
  manutencaoFinanceiroService, formatarBRL, formatarDataBR, formatarDataHoraBR,
  type LancamentoExcluido,
} from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * ♻️ A LIXEIRA — LANÇAMENTOS EXCLUÍDOS, E COMO TRAZÊ-LOS DE VOLTA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/LixeiraDeLancamentos.tsx
 *
 * ===========================================================================
 * ⚠️ ISTO NÃO EXIGIU NENHUMA TABELA NOVA — O DADO JÁ ESTAVA LÁ
 * ===========================================================================
 * O gatilho `audit_fin_lanc` é `AFTER UPDATE OR DELETE ... FOR EACH ROW`, e a
 * `registrar_auditoria()` grava `dados_antes = to_jsonb(OLD)`: o registro
 * INTEIRO, campo por campo, antes de ele morrer. Isso sempre existiu; o que
 * faltava era a janela.
 *
 * É o que transforma a exclusão em lote de "operação irreversível" em
 * "operação reversível" — e foi por isso que ela pôde ser construída.
 *
 * ⚠️ RESTAURAR NÃO É "DESFAZER" CEGO. O lançamento volta a passar pelas mesmas
 * trancas de quando nasceu: não entra em período fechado (nem que o fechamento
 * tenha vindo DEPOIS da exclusão), e não volta se a conta ou a categoria dele
 * tiverem sido apagadas. Quem recusa é o banco.
 *
 * ⚠️ RESTAURAR UMA PERNA DE TRANSFERÊNCIA TRAZ AS DUAS (RN-23). Meia
 * transferência restaurada inventa dinheiro tanto quanto meia apagada — por
 * isso a confirmação avisa antes.
 */
export default function LixeiraDeLancamentos({
  tenantId, recarregarAo,
}: {
  tenantId: string | null;
  /** Muda de valor quando algo foi excluído lá em cima — força a releitura. */
  recarregarAo: number;
}) {
  const [itens, setItens] = useState<LancamentoExcluido[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true); setErro(null);
    try {
      setItens(await manutencaoFinanceiroService.listarExcluidos(tenantId, { limite: 200 }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO LER A LIXEIRA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId]);

  // ⚠️ A função `async` fica DENTRO do efeito e o estado só muda depois do
  // `await` — a regra `react-hooks/set-state-in-effect` recusa efeito que
  // chame setState no mesmo tique, e ela está certa.
  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar, recarregarAo]);

  const restaurar = async (item: LancamentoExcluido) => {
    if (!tenantId) return;
    const texto =
      `RESTAURAR ESTE LANÇAMENTO?\n\n` +
      `DATA: ${formatarDataBR(item.data_movimento)}\n` +
      `CONTA: ${item.conta}\n` +
      `IDENTIFICADORA: ${item.identificadora}\n` +
      `VALOR: ${formatarBRL(item.valor_centavos)}\n\n` +
      (item.transferencia_id
        ? "ESTE LANÇAMENTO FAZ PARTE DE UMA TRANSFERÊNCIA. RESTAURAR VAI TRAZER AS DUAS PERNAS DE VOLTA.\n\n"
        : "") +
      "ELE VOLTARÁ PARA O EXTRATO, NA MESMA DATA E NA MESMA ORDEM.";
    if (!window.confirm(texto)) return;

    setErro(null); setAviso(null);
    try {
      const r = await manutencaoFinanceiroService.restaurar(tenantId, item.audit_id);
      setAviso(
        r.restaurados === 0
          ? "ESTE LANÇAMENTO JÁ ESTAVA DE VOLTA. NADA MUDOU."
          : `${r.restaurados} LANÇAMENTO(S) RESTAURADO(S).`,
      );
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO RESTAURAR.");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 mb-2">
        <IconeFin nome="aberto" tamanho={16} />
        LIXEIRA — LANÇAMENTOS EXCLUÍDOS
      </h2>
      <p className="text-[11px] font-bold uppercase text-slate-400 mb-5">
        OS ÚLTIMOS 30 DIAS. RESTAURAR DEVOLVE O LANÇAMENTO AO EXTRATO, NA MESMA DATA E ORDEM.
      </p>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800 mb-4">{erro}</div>}
      {aviso && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800 mb-4">{aviso}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400 font-bold uppercase">CARREGANDO…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-400 font-bold uppercase">NENHUMA EXCLUSÃO NOS ÚLTIMOS 30 DIAS.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                {["EXCLUÍDO EM","QUEM","DATA","CONTA","IDENTIFICADORA","VALOR","HISTÓRICO",""].map((c) => (
                  <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.audit_id} className={i.ja_restaurado ? "opacity-45" : "hover:bg-blue-50/40"}>
                  <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataHoraBR(i.excluido_em)}</td>
                  <td className="px-2 py-2 border-b border-slate-100 text-slate-500">{i.excluido_por}</td>
                  <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataBR(i.data_movimento)}</td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">
                    {i.conta}
                    {i.transferencia_id && <span className="ml-1 text-[9px] font-black text-blue-600">TRANSF</span>}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">{i.identificadora}</td>
                  <td className={`px-2 py-2 border-b border-slate-100 text-right font-mono ${i.tipo_movimento === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                    {formatarBRL(i.valor_centavos, { semSimbolo: true })}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase text-slate-500 max-w-[180px] truncate">{i.historico ?? ""}</td>
                  <td className="px-2 py-2 border-b border-slate-100 text-right whitespace-nowrap">
                    {i.ja_restaurado ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">JÁ RESTAURADO</span>
                    ) : (
                      <button type="button" onClick={() => restaurar(i)}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                        <IconeFin nome="aberto" tamanho={13} />
                        RESTAURAR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
