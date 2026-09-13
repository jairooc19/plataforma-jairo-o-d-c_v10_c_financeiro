"use client";

import Link from "next/link";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";

/**
 * 💸 TELA: LANÇAMENTOS — a escolha (PJODC v10)
 * Especificação, seção 8, tela 4: ao abrir, dois caminhos.
 */
export default function LancamentosPage() {
  const { pode, carregando } = useEmpresaAtiva();

  if (carregando) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800 text-center">LANÇAMENTOS</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pode("lc_criar") && (
          <Link href="/dashboard/financeiro/lancamentos/novo"
                className="p-8 rounded-3xl bg-blue-600 text-white text-center shadow-sm hover:shadow-lg transition-all">
            <p className="text-lg font-black uppercase tracking-tight">NOVO LANÇAMENTO</p>
            <p className="text-xs text-blue-100 font-medium mt-2">COM A CONFERÊNCIA DA CONTA AO LADO</p>
          </Link>
        )}
        <Link href="/dashboard/financeiro/lancamentos/pesquisar"
              className="p-8 rounded-3xl bg-white border border-slate-200 text-center shadow-sm hover:shadow-lg transition-all">
          <p className="text-lg font-black uppercase tracking-tight text-slate-800">PESQUISAR</p>
          <p className="text-xs text-slate-500 font-medium mt-2">13 FILTROS QUE SE CRUZAM</p>
        </Link>
      </div>
      {pode("transferencia") && (
        <Link href="/dashboard/financeiro/transferencia"
              className="block p-6 rounded-3xl bg-white border border-slate-200 text-center shadow-sm hover:shadow-lg transition-all">
          <p className="text-base font-black uppercase tracking-tight text-slate-800">TRANSFERÊNCIA ENTRE CONTAS</p>
          <p className="text-xs text-slate-500 font-medium mt-2">UM FATO, DUAS PERNAS, UMA OPERAÇÃO</p>
        </Link>
      )}
    </div>
  );
}
