"use client";

import React from "react";
import type { EmpresaDoLobby } from "@/types/plataforma";

interface LobbyViewProps {
  empresas: EmpresaDoLobby[];
  onSelectTenant: (id: string) => void;
  onLogout: () => void;
}

/**
 * 🏢 VIEW: LOBBY DE SELEÇÃO DE EMPRESA (PJODC v10)
 * Responsabilidade: escolher em qual empresa entrar, depois do login.
 *
 * ⚠️ v10 — O LOBBY PASSOU A MOSTRAR TAMBÉM AS EMPRESAS DO PROPRIETÁRIO. Até a v9
 * ele listava apenas vínculos de DEPENDENTE: um Proprietário com duas empresas
 * não tinha como trocar de uma para a outra sem sair e entrar de novo, e quem
 * abrisse `/dashboard` numa aba nova era mandado de volta à guarita — porque a
 * empresa ativa mora no `sessionStorage`, que é por aba.
 */
export default function LobbyView({
  empresas,
  onSelectTenant,
  onLogout
}: LobbyViewProps) {
  return (
    <div className="flex-1 bg-slate-50 p-8 min-h-screen font-sans flex items-center justify-center animate-fade-in">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Título e Contador */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800">
            Escolha a Empresa
          </h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
            Acessos Ativos: {empresas.length}
          </p>
        </div>

        {/* Lista de Empresas Disponíveis */}
        <div className="grid grid-cols-1 gap-4">
          {empresas.map((item) => (
            <button
              key={item.tenantId}
              onClick={() => onSelectTenant(item.tenantId)}
              className="group flex items-center justify-between p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-400 transition-all text-left"
            >
              <div className="flex items-center gap-6">
                {/* Avatar/Ícone da Empresa */}
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center font-black text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {item.nome?.charAt(0).toUpperCase() || "E"}
                </div>

                {/* Detalhes do Vínculo */}
                <div>
                  <p className="text-blue-600 text-sm font-black uppercase tracking-tight mb-1">
                    {item.papel === 'OWNER' ? 'Você é o Proprietário' : item.gestorEmail}
                  </p>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-tight">
                    {item.nome}
                  </h3>
                  {item.papel === 'DEPENDENT' && (
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                      Gestor: {item.gestorNome}
                    </p>
                  )}
                </div>
              </div>

              {/* Botão de Ação Visual */}
              <span className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                Entrar ➡
              </span>
            </button>
          ))}
        </div>

        {/* Opção de Saída */}
        <button
          onClick={onLogout}
          className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:underline transition-all"
        >
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
