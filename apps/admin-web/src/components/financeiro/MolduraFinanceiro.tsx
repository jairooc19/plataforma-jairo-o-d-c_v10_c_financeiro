"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconeFin from "./IconeFin";
import PainelDeOpcoes from "./menu/PainelDeOpcoes";
import { useEmpresaAtiva } from "./useEmpresaAtiva";
import type { PermissaoFinanceiro } from "@jairo/core";

/**
 * 🧭 A MOLDURA DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/MolduraFinanceiro.tsx
 *
 * A faixa do topo com o botão OPÇÕES à esquerda e o título do módulo, o painel
 * lateral do menu e o rodapé. Nada de negócio mora aqui.
 *
 * ⚠️ ESTE ARQUIVO É DO MÓDULO. Se o módulo for desplugado, ele some com a pasta
 * `components/financeiro/` — a plataforma não fica com resto nenhum.
 */
export default function MolduraFinanceiro({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  const { nomeEmpresa, emailUsuario, papel, pode } = useEmpresaAtiva();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* ⚠️ O BOTÃO FICA À ESQUERDA E O PAINEL ENTRA PELA ESQUERDA
                (pedido de 14/09/2026; até 13/09 os dois ficavam à direita).
                Os dois trocaram de lado JUNTOS: clicar num canto e o painel
                abrir no outro funciona, mas o olho acompanha o dedo, e esse
                salto cansa no uso diário. Ele é o primeiro elemento da faixa
                justamente para nascer na mesma borda de onde o painel desliza. */}
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-haspopup="menu"
              aria-expanded={menuAberto}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white
                         text-xs font-black uppercase tracking-widest hover:bg-slate-700 shrink-0"
            >
              <IconeFin nome="menu" tamanho={16} />
              OPÇÕES
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest
                         text-slate-400 hover:text-slate-700 shrink-0"
            >
              <IconeFin nome="voltar" tamanho={14} />
              PAINEL
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-slate-800 truncate">
                CONTROLE FINANCEIRO
              </h1>
              {nomeEmpresa && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                  {nomeEmpresa}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* 👤 QUEM ESTÁ LOGADO (pedido de 13/09/2026).
                ⚠️ O PEDIDO VEIO DO ACESSO COMO DEPENDENTE, e o motivo é
                concreto: com duas contas abertas em navegadores diferentes,
                nada na tela dizia qual delas estava ali. Quem lança dinheiro
                precisa saber em nome de quem está lançando — o `criado_por` de
                cada lançamento é definitivo e vai para a auditoria.
                Some abaixo de `sm` para não espremer o título no celular. */}
            {emailUsuario && (
              <div className="hidden sm:block text-right leading-tight">
                <p className="text-[11px] font-black uppercase tracking-tight text-slate-700 max-w-[190px] truncate"
                   title={emailUsuario}>
                  {emailUsuario}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  {papel === "OWNER" ? "PROPRIETÁRIO" : papel === "DEPENDENT" ? "DEPENDENTE" : papel}
                </p>
              </div>
            )}

          </div>
        </div>
      </header>

      <PainelDeOpcoes
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        pode={(p) => pode(p as PermissaoFinanceiro)}
        onEmDesenvolvimento={setAviso}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px]
                         uppercase tracking-widest text-slate-400">
        PLATAFORMA JAIRO O D C · MÓDULO CONTROLE FINANCEIRO
      </footer>

      {/* As opções ainda não construídas avisam, em vez de abrir tela vazia */}
      {aviso && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
             onClick={() => setAviso(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm text-center"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-3 text-amber-500">
              <IconeFin nome="atencao" tamanho={32} traco={1.75} />
            </div>
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
