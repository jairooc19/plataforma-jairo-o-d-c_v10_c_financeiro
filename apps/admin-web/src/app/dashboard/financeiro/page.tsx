"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";

/**
 * 🏠 TELA PRINCIPAL DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/page.tsx
 *
 * Especificação, seção 9: elementos centralizados, um abaixo do outro. O
 * "DINHEIRO DO PERÍODO" é um cartão grande no lugar definitivo, escrito
 * "EM DESENVOLVIMENTO" — sem números de exemplo, que confundiriam quem vê
 * (decisão 2).
 */
export default function FinanceiroPage() {
  const { carregando, erro, pode } = useEmpresaAtiva();
  const [aviso, setAviso] = useState(false);

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <p className="font-black uppercase text-amber-900 text-sm">{erro}</p>
        <Link href="/dashboard" className="inline-block mt-4 text-xs font-black uppercase tracking-widest text-blue-700">
          VOLTAR AO PAINEL
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">

      {/* DINHEIRO DO PERÍODO — o lugar já reservado (decisão 2) */}
      <button
        type="button"
        onClick={() => setAviso(true)}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 text-center
                   hover:shadow-lg transition-all"
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">DINHEIRO DO PERÍODO</p>
        <p className="text-2xl font-black uppercase tracking-tight text-slate-300">EM DESENVOLVIMENTO</p>
      </button>

      {/* Os atalhos das telas que existem */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pode("lc_criar") && (
          <Atalho href="/dashboard/financeiro/lancamentos/novo" titulo="NOVO LANÇAMENTO"
                  descricao="Registrar entrada ou saída, conferindo o extrato ao lado." destaque />
        )}
        <Atalho href="/dashboard/financeiro/lancamentos/pesquisar" titulo="PESQUISAR"
                descricao="Encontrar lançamentos com filtros cruzados." />
        {pode("cm_ver") && (
          <Atalho href="/dashboard/financeiro/contas-movimento" titulo="CONTAS MOVIMENTO"
                  descricao="Onde o dinheiro está: caixa, banco e outras." />
        )}
        {pode("ci_ver") && (
          <Atalho href="/dashboard/financeiro/contas-identificadoras" titulo="CONTAS IDENTIFICADORAS"
                  descricao="Por que o dinheiro se moveu: despesa, receita e outras." />
        )}
        {pode("transferencia") && (
          <Atalho href="/dashboard/financeiro/transferencia" titulo="TRANSFERÊNCIA"
                  descricao="Mover dinheiro entre duas contas, numa operação só." />
        )}
      </div>

      {aviso && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setAviso(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black uppercase text-slate-800 mb-2">DINHEIRO DO PERÍODO</p>
            <p className="text-sm text-slate-500 font-medium mb-6">ESTA FUNÇÃO ESTÁ EM DESENVOLVIMENTO.</p>
            <button
              type="button"
              onClick={() => setAviso(false)}
              className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Atalho({ href, titulo, descricao, destaque }: {
  href: string; titulo: string; descricao: string; destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`p-6 rounded-3xl border shadow-sm hover:shadow-lg transition-all ${
        destaque ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"
      }`}
    >
      <h2 className={`text-base font-black uppercase tracking-tight ${destaque ? "text-white" : "text-slate-800"}`}>
        {titulo}
      </h2>
      <p className={`text-xs font-medium mt-2 ${destaque ? "text-blue-100" : "text-slate-500"}`}>
        {descricao}
      </p>
    </Link>
  );
}
