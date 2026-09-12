"use client";

import React from "react";

interface DeveloperDashboardViewProps {
  dbStatus: string;
  dbLatency: number | null;
  onNavigate: (path: string) => void;
}

/**
 * 🛠️ VIEW: CONSOLE DO DESENVOLVEDOR (ADMIN SOBERANO)
 * Responsabilidade: Interface de gestão de infraestrutura e triagem global.
 * Integração: PJODC v4 - Dashboard Orquestrado.
 */
export default function DeveloperDashboardView({
  dbStatus,
  dbLatency,
  onNavigate
}: DeveloperDashboardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-fade-in">
      {/* 🟦 COLUNA DE GESTÃO (APLICATIVOS) */}
      <div className="md:col-span-8 space-y-6">
        <h2 className="text-lg font-black uppercase tracking-widest text-slate-400">
          Aplicativos e Gestão
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Central de Comandos (Tenants) */}
          <button 
            onClick={() => onNavigate("/dashboard/tenants")} 
            className="flex flex-col items-start p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight relative z-10">
              Central de Comandos
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-2 relative z-10">
              Triagem de Usuários e Gestão de Empresas.
            </p>
          </button>

          {/* Ajustes Globais (Settings) */}
          <button 
            onClick={() => onNavigate("/dashboard/settings")} 
            className="flex flex-col items-start p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight relative z-10">
              Ajustes Globais
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-2 relative z-10">
              Cores White Label e Textos do Sistema.
            </p>
          </button>

          {/* 🧩 MÓDULOS — contratação por empresa (v10, degrau 5).
              Este cartão é da PLATAFORMA e não cita módulo nenhum: a tela de
              destino lista o que houver no catálogo do banco. */}
          <button
            onClick={() => onNavigate("/dashboard/modulos")}
            className="flex flex-col items-start p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h5v6H4V5zm10-1h5a1 1 0 011 1v5h-6V4zM4 12h6v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7zm10 0h6v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight relative z-10">
              Módulos
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-2 relative z-10">
              Contratação de Módulos por Empresa.
            </p>
          </button>
        </div>
      </div>

      {/* 🟧 COLUNA TÉCNICA (STATUS) */}
      <div className="md:col-span-4 space-y-6">
        <h2 className="text-lg font-black uppercase tracking-widest text-slate-400">
          Status da Infra
        </h2>
        <div className="bg-slate-800 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="space-y-6 relative z-10">
            {/* Banco de Dados */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                Banco de Dados (Supabase)
              </div>
              <div className="flex items-center gap-3">
                {dbStatus === "Verificando..." ? (
                  <div className="w-3 h-3 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <div className={`w-3 h-3 rounded-full ${dbStatus === "Online" ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}></div>
                )}
                <span className="font-black tracking-widest uppercase text-sm">
                  {dbStatus} {dbLatency && <span className="text-xs text-slate-500 font-mono ml-2">({dbLatency}ms)</span>}
                </span>
              </div>
            </div>

            {/* Segurança RLS */}
            <div className="pt-6 border-t border-slate-700">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                Isolamento Multi-Tenancy (RLS)
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                <span className="font-black tracking-widest uppercase text-sm">
                  Escudo Ativo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}