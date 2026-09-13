"use client";

import { useState } from "react";
import { cadastroFinanceiroService } from "@jairo/core";
import CampoDinheiro from "@/components/financeiro/CampoDinheiro";

/**
 * ➕ O "+ ADICIONAR NOVA" DO FORMULÁRIO DE LANÇAMENTO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/ModalNovoCadastro.tsx
 *
 * ⚠️ É MODAL, E NÃO NAVEGAÇÃO, POR UM MOTIVO CONCRETO (RN-09): o usuário está
 * no meio de um lançamento, já preencheu data, valor e histórico. Se a página
 * trocasse, tudo isso se perderia — e ele teria de digitar de novo. Com o
 * modal, a tela de lançamento continua atrás, e a conta nova já volta
 * selecionada.
 *
 * Só os campos do cadastro: sem pesquisa, sem impressão. Quem precisa da tela
 * inteira vai por CADASTROS no menu.
 */
export default function ModalNovoCadastro({
  variante, tenantId, onFechar, onGravado,
}: {
  variante: "movimento" | "identificadora";
  tenantId: string;
  onFechar: () => void;
  onGravado: (id: string) => void;
}) {
  const ehMovimento = variante === "movimento";
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState(ehMovimento ? "BANCO" : "DESPESA");
  const [saldo, setSaldo] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const gravar = async () => {
    setGravando(true);
    setErro(null);
    try {
      const id = ehMovimento
        ? await cadastroFinanceiroService.gravarContaMovimento({
            tenantId, nome, tipo: tipo as "CAIXA" | "BANCO" | "OUTRAS", saldoAberturaCentavos: saldo,
          })
        : await cadastroFinanceiroService.gravarIdentificadora({
            tenantId, nome, tipo: tipo as "DESPESA" | "RECEITA" | "OUTRAS",
          });
      onGravado(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR.");
    } finally {
      setGravando(false);
    }
  };

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onFechar}>
      <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black uppercase tracking-tight text-slate-800 mb-5">
          {ehMovimento ? "NOVA CONTA MOVIMENTO" : "NOVA CONTA IDENTIFICADORA"}
        </h2>

        {erro && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-red-800">{erro}</div>}

        <div className="space-y-4">
          <div>
            <label htmlFor="m-nome" className={rotulo}>NOME</label>
            <input id="m-nome" type="text" maxLength={60} value={nome} autoFocus
                   onChange={(e) => setNome(e.target.value.toUpperCase())}
                   className={`${campo} uppercase`} />
          </div>
          <div>
            <label htmlFor="m-tipo" className={rotulo}>TIPO</label>
            <select id="m-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${campo} font-bold uppercase`}>
              {(ehMovimento ? ["CAIXA", "BANCO", "OUTRAS"] : ["DESPESA", "RECEITA", "OUTRAS"]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {ehMovimento && (
            <div>
              <label htmlFor="m-saldo" className={rotulo}>SALDO DE ABERTURA</label>
              <CampoDinheiro id="m-saldo" valorCentavos={saldo} onChange={setSaldo} permitirNegativo />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={gravar} disabled={gravando || nome.trim() === ""}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
            {gravando ? "GRAVANDO…" : "GRAVAR E USAR"}
          </button>
          <button type="button" onClick={onFechar}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-600">
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}
