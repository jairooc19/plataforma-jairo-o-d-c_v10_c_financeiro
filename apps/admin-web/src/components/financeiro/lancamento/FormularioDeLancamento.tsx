"use client";

import Link from "next/link";
import { formatarBRL } from "@jairo/core";
import CampoDinheiro from "../CampoDinheiro";
import IconeFin from "../IconeFin";
import type { useNovoLancamento } from "./useNovoLancamento";

/**
 * ✍️ A COLUNA ESQUERDA: O FORMULÁRIO DO LANÇAMENTO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/lancamento/FormularioDeLancamento.tsx
 *
 * Só desenho. Estado e chamadas ao banco vivem em `useNovoLancamento.ts`.
 *
 * ⚠️ A PORTA DA TRANSFERÊNCIA É AQUI, E SÓ AQUI (decisão do dono do projeto em
 * 13/09/2026). Transferir é um jeito de lançar — duas pernas de lançamento numa
 * operação só (RN-23) —, então o caminho para ela sai de dentro de "Novo
 * Lançamento". Ela não está mais na tela inicial nem no menu OPÇÕES.
 */
export default function FormularioDeLancamento({
  m,
}: {
  m: ReturnType<typeof useNovoLancamento>;
}) {
  const { formulario: f, contaEscolhida, categoriaEscolhida, contas, categorias } = m;
  const { pode } = m.ctx;

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
          <IconeFin nome="novo" tamanho={20} traco={1.75} />
          NOVO LANÇAMENTO
        </h1>
        {m.gravadosNaSessao > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
            <IconeFin nome="ativo" tamanho={13} />
            {m.gravadosNaSessao} NESTA SESSÃO
          </span>
        )}
      </div>

      {/* A TRANSFERÊNCIA, no lugar que o dono do projeto pediu */}
      {pode("transferencia") && (
        <Link
          href="/dashboard/financeiro/transferencia"
          className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50
                     hover:bg-white hover:border-blue-400 transition-all"
        >
          <IconeFin nome="transferencia" tamanho={18} traco={1.75} />
          <span className="flex-1 text-xs font-black uppercase tracking-widest text-slate-700">
            TRANSFERÊNCIA ENTRE CONTAS
          </span>
          <IconeFin nome="abrirNivel" tamanho={16} />
        </Link>
      )}

      {m.erro && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3
                        text-xs font-bold uppercase text-red-800">
          <IconeFin nome="atencao" tamanho={15} />
          <span>{m.erro}</span>
        </div>
      )}
      {m.aviso && (
        <div className="mb-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3
                        text-xs font-bold uppercase text-emerald-800">
          <IconeFin nome="ativo" tamanho={15} />
          <span>{m.aviso}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* CONTA MOVIMENTO + adicionar nova (modal) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="l-conta" className={rotulo.replace(" mb-1.5", "")}>CONTA MOVIMENTO</label>
            {pode("cm_gravar") && (
              <button type="button" onClick={() => m.setModal("movimento")}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                <IconeFin nome="adicionar" tamanho={13} />
                ADICIONAR NOVA
              </button>
            )}
          </div>
          <select id="l-conta" value={f.contaId} onChange={(e) => f.setContaId(e.target.value)}
                  className={`${campo} uppercase font-bold`}>
            <option value="">SELECIONE</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              TIPO: {contaEscolhida?.tipo ?? "—"}
            </span>
            {f.saldoDaConta !== null && (
              <span className="text-[11px] font-black uppercase text-slate-600">
                SALDO ATUAL: {formatarBRL(f.saldoDaConta)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="l-data" className={rotulo}>DATA DO MOVIMENTO</label>
            <input id="l-data" type="date" value={f.data} onChange={(e) => f.setData(e.target.value)} className={campo} />
          </div>
          <div>
            <label htmlFor="l-ordem" className={rotulo}>ORDEM NO EXTRATO</label>
            <input id="l-ordem" type="number" min={1} value={f.ordem}
                   onChange={(e) => f.setOrdem(e.target.value === "" ? "" : Number(e.target.value))}
                   className={campo} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="l-tipo" className={rotulo}>TIPO DO MOVIMENTO</label>
            <select id="l-tipo" value={f.tipoMov} onChange={(e) => f.setTipoMov(e.target.value as "ENTRADA" | "SAIDA")}
                    className={`${campo} font-bold`}>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SAIDA">SAÍDA</option>
            </select>
          </div>
          <div>
            <label htmlFor="l-prop" className={rotulo}>PROPRIEDADE</label>
            <select id="l-prop" value={f.propriedade}
                    onChange={(e) => f.setPropriedade(e.target.value as "PROPRIO" | "TERCEIROS")}
                    className={`${campo} font-bold`}>
              <option value="PROPRIO">PRÓPRIO</option>
              <option value="TERCEIROS">TERCEIROS</option>
            </select>
          </div>
          <div>
            <label htmlFor="l-regime" className={rotulo}>REGIME</label>
            <select id="l-regime" value={f.regime}
                    onChange={(e) => f.setRegime(e.target.value as "CAIXA" | "COMPETENCIA")}
                    className={`${campo} font-bold`}>
              <option value="CAIXA">CAIXA</option>
              <option value="COMPETENCIA">COMPETÊNCIA</option>
            </select>
          </div>
        </div>

        {/* CONTA IDENTIFICADORA + adicionar nova */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="l-cat" className={rotulo.replace(" mb-1.5", "")}>
              CONTA IDENTIFICADORA DO MOVIMENTO
            </label>
            {pode("ci_gravar") && (
              <button type="button" onClick={() => m.setModal("identificadora")}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                <IconeFin nome="adicionar" tamanho={13} />
                ADICIONAR NOVA
              </button>
            )}
          </div>
          <select id="l-cat" value={f.categoriaId} onChange={(e) => f.setCategoriaId(e.target.value)}
                  className={`${campo} uppercase font-bold`}>
            <option value="">SELECIONE</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <span className="text-[11px] font-bold uppercase text-slate-400">
            TIPO: {categoriaEscolhida?.tipo ?? "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="l-valor" className={rotulo}>VALOR DO LANÇAMENTO</label>
            <CampoDinheiro id="l-valor" valorCentavos={f.valor} onChange={f.setValor} />
          </div>
          <div>
            <label htmlFor="l-hist" className={rotulo}>HISTÓRICO DO MOVIMENTO</label>
            <input id="l-hist" type="text" maxLength={200} value={f.historico}
                   onChange={(e) => f.setHistorico(e.target.value.toUpperCase())}
                   className={`${campo} uppercase`} placeholder="OPCIONAL" />
          </div>
        </div>

        <button
          type="button"
          onClick={m.gravar}
          disabled={m.gravando || !f.contaId || !f.categoriaId || !f.data || f.valor <= 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white
                     text-xs font-black uppercase tracking-widest disabled:opacity-40"
        >
          <IconeFin nome="salvar" tamanho={16} />
          {m.gravando ? "GRAVANDO…" : "GRAVAR LANÇAMENTO"}
        </button>
      </div>
    </section>
  );
}
