"use client";

import Link from "next/link";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import IconeFin, { type NomeDeIcone } from "@/components/financeiro/IconeFin";

/**
 * 🎯 TELA: ORÇAMENTO — a escolha (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/orcamento/page.tsx
 *
 * Os dois caminhos que o dono do projeto pediu: "+ ADICIONAR NOVO" e
 * "PESQUISAR". É o mesmo desenho da tela LANÇAMENTOS — dois cartões, e nada
 * mais. Ter dois desenhos diferentes para a mesma ideia no mesmo módulo ensina
 * a pessoa a hesitar.
 */
export default function OrcamentoPage() {
  const { pode, carregando } = useEmpresaAtiva();

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!pode("orc_ver")) {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-6
                      font-black uppercase text-amber-900 text-sm">
        <IconeFin nome="atencao" tamanho={20} traco={1.75} />
        <span>VOCÊ NÃO TEM PERMISSÃO PARA VER O ORÇAMENTO. FALE COM O PROPRIETÁRIO DA EMPRESA.</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="flex items-center justify-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
        <IconeFin nome="orcamento" tamanho={26} traco={1.75} />
        ORÇAMENTO DE CONTA IDENTIFICADORA
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Cartao href="/dashboard/financeiro/orcamento/novo" icone="novo"
                titulo="+ ADICIONAR NOVO"
                descricao="COM A CONFERÊNCIA DA COMPETÊNCIA LOGO ABAIXO" destaque />
        <Cartao href="/dashboard/financeiro/orcamento/pesquisar" icone="pesquisar"
                titulo="PESQUISAR"
                descricao="AS COMPETÊNCIAS QUE JÁ TÊM ORÇAMENTO" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">
        O ORÇAMENTO É POR CONTA IDENTIFICADORA E POR MÊS — VOCÊ PLANEJA O MOTIVO, NÃO O LUGAR.
      </p>
    </div>
  );
}

function Cartao({ href, icone, titulo, descricao, destaque }: {
  href: string; icone: NomeDeIcone; titulo: string; descricao: string; destaque?: boolean;
}) {
  return (
    <Link href={href}
          className={`p-8 rounded-3xl text-center shadow-sm hover:shadow-lg transition-all ${
            destaque ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}>
      <div className={`flex justify-center mb-3 ${destaque ? "text-white" : "text-slate-700"}`}>
        <IconeFin nome={icone} tamanho={28} traco={1.75} />
      </div>
      <p className={`text-lg font-black uppercase tracking-tight ${destaque ? "text-white" : "text-slate-800"}`}>
        {titulo}
      </p>
      <p className={`text-xs font-medium mt-2 ${destaque ? "text-blue-100" : "text-slate-500"}`}>
        {descricao}
      </p>
    </Link>
  );
}
