"use client";

import Link from "next/link";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import IconeFin, { type NomeDeIcone } from "@/components/financeiro/IconeFin";

/**
 * 💸 TELA: LANÇAMENTOS — a escolha (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/lancamentos/page.tsx
 *
 * Especificação, seção 8, tela 4: ao abrir, dois caminhos.
 *
 * ⚠️ O TERCEIRO CARTÃO, "TRANSFERÊNCIA ENTRE CONTAS", FOI RETIRADO DAQUI EM
 * 13/09/2026. O dono do projeto pediu que a transferência exista **apenas
 * dentro de "Novo Lançamento"**, e uma regra assim vale em toda tela — deixá-la
 * viva aqui seria cumprir o pedido só na tela inicial e criar um segundo
 * caminho que ninguém mandou existir. A rota continua funcionando; quem chega
 * até ela é o botão dentro do formulário de lançamento.
 */
export default function LancamentosPage() {
  const { pode, carregando } = useEmpresaAtiva();

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="flex items-center justify-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
        <IconeFin nome="lancamentos" tamanho={26} traco={1.75} />
        LANÇAMENTOS
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pode("lc_criar") && (
          <Cartao href="/dashboard/financeiro/lancamentos/novo" icone="novo"
                  titulo="NOVO LANÇAMENTO" descricao="COM A CONFERÊNCIA DA CONTA AO LADO" destaque />
        )}
        <Cartao href="/dashboard/financeiro/lancamentos/pesquisar" icone="pesquisar"
                titulo="PESQUISAR" descricao="13 FILTROS QUE SE CRUZAM" />
      </div>
    </div>
  );
}

function Cartao({ href, icone, titulo, descricao, destaque }: {
  href: string; icone: NomeDeIcone; titulo: string; descricao: string; destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`p-8 rounded-3xl text-center shadow-sm hover:shadow-lg transition-all ${
        destaque ? "bg-blue-600 text-white" : "bg-white border border-slate-200"
      }`}
    >
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
