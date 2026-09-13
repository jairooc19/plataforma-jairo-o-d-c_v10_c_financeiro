"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * 🧭 MOLDURA DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/layout.tsx
 *
 * A barra do topo com o título do módulo e o ícone de menu à direita, e o
 * rodapé institucional da plataforma — exatamente o que a especificação
 * (seção 9) descreve: o módulo não cria uma segunda barra grossa, ele usa a
 * faixa própria abaixo do cabeçalho da plataforma.
 *
 * ⚠️ ESTE ARQUIVO É DO MÓDULO (está dentro de `dashboard/financeiro/`). Se o
 * módulo for desplugado, ele some junto com a pasta — a plataforma não fica
 * com nenhum resto.
 */

const OPCOES = [
  { rotulo: "CADASTROS", filhos: [
      { rotulo: "CONTA MOVIMENTO", href: "/dashboard/financeiro/contas-movimento" },
      { rotulo: "CONTA IDENTIFICADORA", href: "/dashboard/financeiro/contas-identificadoras" },
  ]},
  { rotulo: "LANÇAMENTOS", href: "/dashboard/financeiro/lancamentos" },
  { rotulo: "CONFIGURAÇÕES", href: "/dashboard/financeiro/dependentes" },
  { rotulo: "DASHBOARDS", emDesenvolvimento: true },
  { rotulo: "ORÇAMENTO", emDesenvolvimento: true },
];

export default function LayoutFinanceiro({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* BARRA DO MÓDULO — título à esquerda, menu à direita (decisões 1 e 5) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
            >
              ← PAINEL
            </button>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-slate-800">
              CONTROLE FINANCEIRO
            </h1>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v); }}
              aria-haspopup="true"
              aria-expanded={menuAberto}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest"
            >
              ☰ OPÇÕES
            </button>

            {menuAberto && (
              <>
                {/* ⚠️ O fechamento escuta 'click', não 'mousedown': com mousedown
                    o menu desmonta ANTES de o React processar o clique do item,
                    e a opção não abre. É a lição nº 3 do CLAUDE.md. */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
                <nav
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {OPCOES.map((op) => (
                    <div key={op.rotulo}>
                      {op.filhos ? (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {op.rotulo}
                          </div>
                          {op.filhos.map((f) => (
                            <Link
                              key={f.href}
                              href={f.href}
                              onClick={() => setMenuAberto(false)}
                              className={`block px-3 py-2 rounded-lg text-sm font-bold uppercase ${
                                pathname === f.href ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {f.rotulo}
                            </Link>
                          ))}
                        </>
                      ) : op.emDesenvolvimento ? (
                        <button
                          type="button"
                          onClick={() => { setMenuAberto(false); setAviso(op.rotulo); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold uppercase text-slate-400 hover:bg-slate-50"
                        >
                          {op.rotulo}
                        </button>
                      ) : (
                        <Link
                          href={op.href!}
                          onClick={() => setMenuAberto(false)}
                          className={`block px-3 py-2 rounded-lg text-sm font-bold uppercase ${
                            pathname?.startsWith(op.href!) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {op.rotulo}
                        </Link>
                      )}
                    </div>
                  ))}
                </nav>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] uppercase tracking-widest text-slate-400">
        PLATAFORMA JAIRO O D C · MÓDULO CONTROLE FINANCEIRO
      </footer>

      {/* As opções ainda não construídas avisam, em vez de abrir tela vazia */}
      {aviso && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setAviso(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black uppercase text-slate-800 mb-2">{aviso}</p>
            <p className="text-sm text-slate-500 font-medium mb-6">ESTA FUNÇÃO ESTÁ EM DESENVOLVIMENTO.</p>
            <button
              type="button"
              onClick={() => setAviso(null)}
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
