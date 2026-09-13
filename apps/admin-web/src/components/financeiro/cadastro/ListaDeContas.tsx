"use client";

import React, { useState } from "react";
import { formatarBRL } from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * 📋 A LISTA DOS CADASTROS, COM OS FILTROS E AS OPÇÕES (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/cadastro/ListaDeContas.tsx
 *
 * Os filtros se cruzam (RN-03) e o botão IMPRIMIR só habilita quando há
 * resultado (RN-05) — as duas coisas que a especificação pede em ambas as
 * telas de cadastro.
 */

export interface ItemDeCadastro {
  id: string;
  nome: string;
  tipo: string;
  is_active: boolean;
  is_sistema?: boolean;
  saldo_abertura_centavos?: number;
}

export default function ListaDeContas({
  variante, itens, carregando, filtroTexto, filtroTipo, ultimos, incluirInativos,
  tiposDisponiveis, podeGravar, podeExcluir,
  onFiltroTexto, onFiltroTipo, onUltimos, onIncluirInativos, onPesquisar,
  onEditar, onExcluir, onAlternarAtivo, onImprimir,
}: {
  variante: "movimento" | "identificadora";
  itens: ItemDeCadastro[];
  carregando: boolean;
  filtroTexto: string;
  filtroTipo: string;
  ultimos: boolean;
  incluirInativos: boolean;
  tiposDisponiveis: string[];
  podeGravar: boolean;
  podeExcluir: boolean;
  onFiltroTexto: (v: string) => void;
  onFiltroTipo: (v: string) => void;
  onUltimos: (v: boolean) => void;
  onIncluirInativos: (v: boolean) => void;
  onPesquisar: () => void;
  onEditar: (item: ItemDeCadastro) => void;
  onExcluir: (item: ItemDeCadastro) => void;
  onAlternarAtivo: (item: ItemDeCadastro) => void;
  onImprimir: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const ehMovimento = variante === "movimento";

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
          <IconeFin nome="filtrar" tamanho={15} />
          PESQUISAR
        </h2>
        <button
          type="button"
          onClick={onImprimir}
          disabled={itens.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-30"
        >
          <IconeFin nome="imprimir" tamanho={14} />
          IMPRIMIR
        </button>
      </div>

      {/* FILTROS — cruzam entre si (RN-03) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <label htmlFor="f-texto" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            NOME
          </label>
          <input
            id="f-texto"
            type="text"
            value={filtroTexto}
            onChange={(e) => onFiltroTexto(e.target.value.toUpperCase())}
            placeholder="TODOS"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 uppercase focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="f-tipo" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            TIPO
          </label>
          <select
            id="f-tipo"
            value={filtroTipo}
            onChange={(e) => onFiltroTipo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 uppercase font-bold focus:border-blue-500 focus:outline-none"
          >
            <option value="">TODOS</option>
            {tiposDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <input type="checkbox" checked={ultimos} onChange={(e) => onUltimos(e.target.checked)} className="w-4 h-4" />
            ÚLTIMOS ADICIONADOS
          </label>
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <input type="checkbox" checked={incluirInativos} onChange={(e) => onIncluirInativos(e.target.checked)} className="w-4 h-4" />
            INCLUIR INATIVOS
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={onPesquisar}
        className="mb-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest"
      >
        <IconeFin nome="pesquisar" tamanho={15} />
        PESQUISAR
      </button>

      {carregando ? (
        <p className="text-sm text-slate-400 font-bold uppercase">CARREGANDO…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-400 font-bold uppercase">NENHUM REGISTRO ENCONTRADO.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {itens.map((item) => (
            <li key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-black uppercase text-slate-800 text-sm truncate">
                  {item.nome}
                  {item.is_sistema && (
                    <span className="ml-2 text-[10px] font-black text-blue-600 uppercase">DO SISTEMA</span>
                  )}
                  {!item.is_active && (
                    <span className="ml-2 text-[10px] font-black text-red-500 uppercase">INATIVA</span>
                  )}
                </p>
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  {item.tipo}
                  {ehMovimento && item.saldo_abertura_centavos !== undefined && (
                    <> · ABERTURA {formatarBRL(item.saldo_abertura_centavos)}</>
                  )}
                </p>
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === item.id ? null : item.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600"
                >
                  <IconeFin nome="menu" tamanho={13} />
                  OPÇÕES
                </button>
                {menuAberto === item.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuAberto(null)} />
                    <div
                      className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {podeGravar && !item.is_sistema && (
                        <button type="button" onClick={() => { setMenuAberto(null); onEditar(item); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase text-slate-700 hover:bg-slate-50">
                          <IconeFin nome="editar" tamanho={14} />
                          EDITAR
                        </button>
                      )}
                      {podeExcluir && !item.is_sistema && (
                        <>
                          <button type="button" onClick={() => { setMenuAberto(null); onAlternarAtivo(item); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase text-slate-700 hover:bg-slate-50">
                            <IconeFin nome={item.is_active ? "inativo" : "ativo"} tamanho={14} />
                            {item.is_active ? "DESATIVAR" : "REATIVAR"}
                          </button>
                          <button type="button" onClick={() => { setMenuAberto(null); onExcluir(item); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase text-red-600 hover:bg-red-50">
                            <IconeFin nome="excluir" tamanho={14} />
                            EXCLUIR
                          </button>
                        </>
                      )}
                      {item.is_sistema && (
                        <p className="px-3 py-2 text-[10px] font-bold uppercase text-slate-400">
                          CADASTRO DO SISTEMA: NÃO PODE SER ALTERADO.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
