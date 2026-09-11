"use client";

import React from "react";
import type { ContextoMembro, UsuarioSessao } from "@/types/plataforma";
import { empresaDoContexto } from "@/lib/empresaDoContexto";

interface DashboardHeaderProps {
  isVipDev: boolean;
  tenantData: ContextoMembro | null;
  currentUser: UsuarioSessao | null;
  dependentTenantsCount: number;
  onSwitchTenant: () => void;
  onLogout: () => void;
  onOpenTeamManagement: () => void;
  onOpenProfile: () => void;
}

/**
 * 🛰️ COMPONENTE: DASHBOARD HEADER
 * Responsabilidade: Exibir contexto do usuário, empresa atual e ações de navegação global.
 * Integração: PJODC v4 - Dashboard Orquestrado (Core da Plataforma).
 * Ajuste Estratégico: Injeção do gatilho global de governança de equipe para Proprietários.
 */
export default function DashboardHeader({
  isVipDev,
  tenantData,
  currentUser,
  dependentTenantsCount,
  onSwitchTenant,
  onLogout,
  onOpenTeamManagement,
  onOpenProfile
}: DashboardHeaderProps) {
  
  // Helper para extrair o nome da empresa (tratando arrays ou objetos únicos do Supabase)
  // O embed `tenants` chega como objeto ou como array; `empresaDoContexto`
  // resolve os dois. O `|| ""` de antes fica, para o caso de o campo faltar.
  const empresa = empresaDoContexto(tenantData);
  const tenantName = empresa?.tenant_name || "";
  const managerEmail = empresa?.users?.email || "";

  return (
    <div className="space-y-10 animate-fade-in">
      {/* 🟢 BARRA DE CONTEXTO (INFO BAR) */}
      <div className="bg-white/80 backdrop-blur-md p-4 px-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-slate-500 font-medium uppercase text-[10px] sm:text-xs tracking-widest flex items-center flex-wrap gap-y-2">
          {isVipDev ? (
            <span className="text-blue-600 font-black">MODO: ADMINISTRADOR SOBERANO</span>
          ) : (
            <>
              <span className="text-blue-600 font-black">EMPRESA: {tenantName}</span>
              <span className="mx-3 text-slate-300 hidden sm:inline">|</span>
              Papel: <span className="font-black text-slate-800 ml-1">
                {tenantData?.role === 'OWNER' ? 'Proprietário' : 'Colaborador'}
              </span>
              {tenantData?.role === 'DEPENDENT' && managerEmail && (
                <>
                  <span className="mx-3 text-slate-300 hidden sm:inline">|</span>
                  Gestor: <span className="text-blue-600 font-black ml-1">{managerEmail}</span>
                </>
              )}
            </>
          )}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           Logado como: {currentUser?.email}
        </div>
      </div>

      {/* 🔵 BARRA DE TÍTULO E AÇÕES (ACTION BAR) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800">
            {isVipDev ? "Console do Desenvolvedor" : "Quadro de Atividades"}
          </h1>
          <p className="text-slate-500 font-medium uppercase text-sm tracking-wide">
            {isVipDev ? "Monitoramento de infraestrutura em tempo real." : "Acesse seus módulos de trabalho."}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
           {/* 🛡️ BOTÃO GLOBAL DE GESTÃO DE EQUIPE (Apenas para Proprietários Ativos) */}
           {!isVipDev && tenantData?.role === 'OWNER' && (
             <button 
                onClick={onOpenTeamManagement} 
                className="px-6 py-3 bg-black text-white hover:bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
             >
                👥 Gerenciar Equipe
             </button>
           )}

           {/* 👤 MEU PERFIL — escondido do desenvolvedor: a credencial do Painel de
               Engenharia é fixa no código e não tem linha em public.users para editar. */}
           {!isVipDev && (
             <button
                onClick={onOpenProfile}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
             >
                👤 Meu Perfil
             </button>
           )}

           {!isVipDev && dependentTenantsCount > 1 && (
             <button 
                onClick={onSwitchTenant} 
                className="px-6 py-3 bg-white border border-slate-200 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
             >
                Trocar Empresa
             </button>
           )}

           <button 
              onClick={onLogout} 
              className="px-6 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm"
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
           </button>
        </div>
      </div>
    </div>
  );
}