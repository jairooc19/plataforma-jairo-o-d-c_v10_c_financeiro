"use client";

import React from "react";

interface AccessOptionsViewProps {
  onSelectRole: (role: 'OWNER' | 'DEPENDENT' | 'VIEWER') => void;
  onBack: () => void;
}

/**
 * 🔑 VIEW: OPÇÕES DE ACESSO
 * Responsabilidade: Permitir que o utilizador selecione o seu perfil de entrada.
 * Integração: PJODC v4 - Multi-Tenancy (Separação de Contextos).
 */
export default function AccessOptionsView({ onSelectRole, onBack }: AccessOptionsViewProps) {
  return (
    <div className="w-full space-y-4 animate-fade-in flex flex-col">
      <h2 className="text-center text-sm font-black text-slate-400 mb-8 uppercase tracking-[0.3em]">
        Selecione o Acesso
      </h2>
      
      <div className="flex flex-col gap-3 w-full">
        {/* Opção: Proprietário */}
        <button 
          onClick={() => onSelectRole('OWNER')} 
          className="w-auto mx-auto px-8 py-5 rounded-3xl border border-slate-200 bg-white/90 hover:shadow-xl transition-all group text-center"
        >
          <span className="block font-bold text-slate-800 text-xl group-hover:text-blue-700">
            Usuário Proprietário
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Acesso principal ao sistema.</span>
        </button>

        {/* Opção: Dependente */}
        <button 
          onClick={() => onSelectRole('DEPENDENT')} 
          className="w-auto mx-auto px-8 py-5 rounded-3xl border border-slate-200 bg-white/90 hover:shadow-xl transition-all group text-center"
        >
          <span className="block font-bold text-slate-800 text-xl group-hover:text-emerald-700">
            Usuário Dependente
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Acesso para colaboradores.</span>
        </button>

        {/* Opção: Apenas Veja */}
        <button 
          onClick={() => onSelectRole('VIEWER')} 
          className="w-auto mx-auto px-8 py-5 rounded-3xl border border-slate-200 bg-white/90 hover:shadow-xl transition-all group text-center"
        >
          <span className="flex items-center justify-center gap-2 font-bold text-slate-800 text-xl group-hover:text-purple-700">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Apenas Veja
          </span>
        </button>
      </div>

      {/* Botão Voltar */}
      <button 
        type="button" 
        onClick={onBack} 
        className="mt-6 w-auto mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 py-3 px-10 rounded-lg border border-transparent hover:border-blue-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        VOLTAR AO INÍCIO
      </button>
    </div>
  );
}