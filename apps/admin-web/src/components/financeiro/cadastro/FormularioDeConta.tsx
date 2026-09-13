"use client";

import React from "react";
import CampoDinheiro from "@/components/financeiro/CampoDinheiro";
import IconeFin from "@/components/financeiro/IconeFin";

/**
 * 📝 O FORMULÁRIO DOS DOIS CADASTROS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/cadastro/FormularioDeConta.tsx
 *
 * As telas de Conta Movimento e Conta Identificadora são gêmeas de propósito
 * (especificação, seção 11): mesmos campos nos mesmos lugares, mesmas
 * mensagens. Quem aprendeu uma sabe a outra — e no código isso significa
 * metade dos arquivos e metade dos defeitos.
 *
 * ⚠️ O NOME SOBE PARA MAIÚSCULAS ENQUANTO SE DIGITA, e é o que vai ao banco.
 * Rótulo em maiúscula é CSS; dado em maiúscula é conversão de verdade — a
 * especificação pede as duas coisas.
 */

export interface SugestaoDeConta {
  id: string;
  nome: string;
  tipo: string;
  is_active: boolean;
}

export default function FormularioDeConta({
  variante, nome, tipo, saldoAberturaCentavos, ativo, editandoId,
  sugestoes, gravando, tiposDisponiveis, tipoBloqueado,
  onNome, onTipo, onSaldo, onAtivo, onEscolherSugestao, onGravar, onCancelar,
}: {
  variante: "movimento" | "identificadora";
  nome: string;
  tipo: string;
  saldoAberturaCentavos: number;
  ativo: boolean;
  editandoId: string | null;
  sugestoes: SugestaoDeConta[];
  gravando: boolean;
  tiposDisponiveis: string[];
  tipoBloqueado: boolean;
  onNome: (v: string) => void;
  onTipo: (v: string) => void;
  onSaldo: (v: number) => void;
  onAtivo: (v: boolean) => void;
  onEscolherSugestao: (s: SugestaoDeConta) => void;
  onGravar: () => void;
  onCancelar: () => void;
}) {
  const ehMovimento = variante === "movimento";
  const rotuloNome = ehMovimento ? "NOME DA CONTA MOVIMENTO" : "NOME DA CONTA IDENTIFICADORA DO MOVIMENTO";
  const rotuloTipo = ehMovimento ? "TIPO DA CONTA MOVIMENTO" : "TIPO DA CONTA IDENTIFICADORA DO MOVIMENTO";

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">
        {editandoId ? "EDITAR CADASTRO" : "NOVO CADASTRO"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* NOME, com as até 4 sugestões vindas do banco */}
        <div className="relative">
          <label htmlFor="fin-nome" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            {rotuloNome}
          </label>
          <input
            id="fin-nome"
            type="text"
            value={nome}
            maxLength={60}
            onChange={(e) => onNome(e.target.value.toUpperCase())}
            placeholder={ehMovimento ? "BANCO ITAÚ" : "ALUGUEL"}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 uppercase
                       focus:border-blue-500 focus:outline-none"
          />
          {sugestoes.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {sugestoes.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onEscolherSugestao(s)}
                    className="w-full text-left px-3 py-2 text-sm font-bold uppercase text-slate-700 hover:bg-blue-50"
                  >
                    {s.nome}
                    <span className="ml-2 text-[10px] font-black text-slate-400">{s.tipo}</span>
                    {!s.is_active && <span className="ml-2 text-[10px] font-black text-red-500">INATIVA</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* TIPO — bloqueado quando já houver lançamento (RN-07) */}
        <div>
          <label htmlFor="fin-tipo" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            {rotuloTipo}
          </label>
          <select
            id="fin-tipo"
            value={tipo}
            disabled={tipoBloqueado}
            onChange={(e) => onTipo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 uppercase font-bold
                       focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          >
            {tiposDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {tipoBloqueado && (
            <p className="mt-1.5 text-[11px] font-bold text-amber-700 uppercase">
              ESTE CADASTRO JÁ TEM LANÇAMENTOS: O TIPO NÃO PODE MUDAR.
            </p>
          )}
        </div>

        {/* SALDO DE ABERTURA — só na conta movimento, e pode ser negativo (RN-08) */}
        {ehMovimento && (
          <div>
            <label htmlFor="fin-saldo" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              SALDO DE ABERTURA
            </label>
            <CampoDinheiro id="fin-saldo" valorCentavos={saldoAberturaCentavos} onChange={onSaldo} permitirNegativo />
            <p className="mt-1.5 text-[11px] text-slate-400 font-medium uppercase">
              QUANTO A CONTA TINHA ANTES DO PRIMEIRO LANÇAMENTO. PODE SER NEGATIVO.
            </p>
          </div>
        )}

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-600">
            <input type="checkbox" checked={ativo} onChange={(e) => onAtivo(e.target.checked)} className="w-4 h-4" />
            CADASTRO ATIVO
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onGravar}
          disabled={gravando || nome.trim() === ""}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest
                     disabled:opacity-40"
        >
          <IconeFin nome={editandoId ? "salvar" : "adicionar"} tamanho={15} />
          {gravando ? "GRAVANDO…" : editandoId ? "SALVAR" : "ADICIONAR"}
        </button>
        {editandoId && (
          <button
            type="button"
            onClick={onCancelar}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-600"
          >
            <IconeFin nome="fechar" tamanho={15} />
            CANCELAR
          </button>
        )}
      </div>
    </section>
  );
}
