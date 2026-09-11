"use client";

import React from "react";

/**
 * 🚀 VIEW: DASHBOARD OPERACIONAL (CLIENTE)
 * Responsabilidade: Interface principal para utilizadores finais acederem aos módulos contratados.
 * Integração: PJODC v4 - Plataforma pura, nenhum módulo funcional instalado.
 */
export default function OperationalDashboardView() {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-lg font-black uppercase tracking-widest text-slate-400">
        Módulos Operacionais
      </h2>

      {/* 🚧 ESTADO: SEM MÓDULOS ATIVOS NO CONTRATO */}
      <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-sm border border-slate-200">
        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
          🚧
        </div>
        <h3 className="text-xl font-black text-slate-700 uppercase mb-2 tracking-tighter">
          Aguardando Liberação
        </h3>
        <p className="text-slate-500 font-medium text-sm">
          Módulos em fase de sincronização com o contrato da sua empresa.
        </p>
      </div>
    </div>
  );
}
