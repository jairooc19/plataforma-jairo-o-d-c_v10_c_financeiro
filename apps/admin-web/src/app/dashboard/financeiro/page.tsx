"use client";

import Link from "next/link";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import IconeFin, { type NomeDeIcone } from "@/components/financeiro/IconeFin";

/**
 * 🏠 TELA PRINCIPAL DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/page.tsx
 *
 * ⚠️ SÃO TRÊS BOTÕES CENTRAIS, E SÓ TRÊS (pedido do dono do projeto em
 * 13/09/2026): DINHEIRO DO PERÍODO, NOVO LANÇAMENTO e PESQUISAR.
 *
 * Antes havia cinco atalhos aqui — CONTAS MOVIMENTO, CONTAS IDENTIFICADORAS e
 * TRANSFERÊNCIA também. Os dois cadastros saíram porque **já estão no menu
 * OPÇÕES**, em CADASTROS: repetir um caminho na tela inicial não dá acesso
 * novo, só faz o usuário se perguntar se os dois levam ao mesmo lugar.
 *
 * ⚠️ TRANSFERÊNCIA SAIU DAQUI E NÃO FOI PARA O MENU. Ela mora **dentro** de
 * "Novo Lançamento", porque transferir é um jeito de lançar: são duas pernas de
 * lançamento numa operação só (RN-23). Ver a nota no fim de
 * `components/financeiro/menu/opcoes.ts`.
 *
 * O "DINHEIRO DO PERÍODO" é um cartão grande no lugar definitivo, escrito
 * "EM DESENVOLVIMENTO" — sem números de exemplo, que confundiriam quem vê
 * (decisão 2 da especificação).
 */
export default function FinanceiroPage() {
  const { carregando, erro, pode } = useEmpresaAtiva();

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
        <div className="flex justify-center mb-3 text-amber-600">
          <IconeFin nome="atencao" tamanho={28} traco={1.75} />
        </div>
        <p className="font-black uppercase text-amber-900 text-sm">{erro}</p>
        <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-black uppercase tracking-widest text-blue-700">
          <IconeFin nome="voltar" tamanho={14} />
          VOLTAR AO PAINEL
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">

      {/* 1 — DINHEIRO DO PERÍODO: o lugar reservado desde o degrau 6, ocupado
             em 18/09/2026. É a porta principal dele, e por isso ele NÃO tem
             entrada no menu OPÇÕES: duas portas para a mesma pergunta é
             exatamente o que o módulo evita desde 13/09. */}
      {pode("dp_ver") ? (
        <Link
          href="/dashboard/financeiro/dinheiro-do-periodo"
          className="w-full max-w-2xl bg-blue-600 rounded-[2.5rem] shadow-sm p-12
                     text-center hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-center gap-2.5 text-blue-100 mb-4">
            <IconeFin nome="dinheiroPeriodo" tamanho={18} traco={1.75} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">DINHEIRO DO PERÍODO</span>
          </div>
          <p className="text-2xl font-black uppercase tracking-tight text-white">
            ORÇADO × REALIZADO
          </p>
          <p className="text-xs font-medium text-blue-100 mt-2">
            O QUANTO DO PLANO DO MÊS JÁ FOI CONSUMIDO, CONTA A CONTA.
          </p>
        </Link>
      ) : (
        <div className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 text-center">
          <div className="flex items-center justify-center gap-2.5 text-slate-400 mb-4">
            <IconeFin nome="dinheiroPeriodo" tamanho={18} traco={1.75} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">DINHEIRO DO PERÍODO</span>
          </div>
          <p className="text-sm font-black uppercase tracking-tight text-slate-300">
            VOCÊ NÃO TEM PERMISSÃO PARA VER ESTA TELA
          </p>
        </div>
      )}

      {/* 2 e 3 — NOVO LANÇAMENTO e PESQUISAR */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pode("lc_criar") && (
          <Atalho
            href="/dashboard/financeiro/lancamentos/novo"
            icone="novo"
            titulo="NOVO LANÇAMENTO"
            descricao="Registrar entrada, saída ou transferência, conferindo o extrato ao lado."
            destaque
          />
        )}
        <Atalho
          href="/dashboard/financeiro/lancamentos/pesquisar"
          icone="pesquisar"
          titulo="PESQUISAR"
          descricao="Encontrar lançamentos com filtros cruzados, imprimir e exportar."
        />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center max-w-md">
        Cadastros, extrato e configurações ficam no menu OPÇÕES, no canto superior direito.
      </p>

    </div>
  );
}

function Atalho({ href, icone, titulo, descricao, destaque }: {
  href: string; icone: NomeDeIcone; titulo: string; descricao: string; destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`p-6 rounded-3xl border shadow-sm hover:shadow-lg transition-all ${
        destaque ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"
      }`}
    >
      <div className={`flex items-center gap-2.5 ${destaque ? "text-white" : "text-slate-800"}`}>
        <IconeFin nome={icone} tamanho={20} traco={1.75} />
        <h2 className="text-base font-black uppercase tracking-tight">{titulo}</h2>
      </div>
      <p className={`text-xs font-medium mt-2 ${destaque ? "text-blue-100" : "text-slate-500"}`}>
        {descricao}
      </p>
    </Link>
  );
}
