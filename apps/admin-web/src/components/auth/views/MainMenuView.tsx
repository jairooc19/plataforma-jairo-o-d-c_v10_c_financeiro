"use client";

import React from "react";
import Image from "next/image";
import type { ViewState } from "../hooks/useAuthLogic";

interface MainMenuViewProps {
  onSelectAccess: () => void;
  onHelpToggle: () => void;
  showHelpOptions: boolean;
  onNavigate: (view: ViewState) => void;
}

/**
 * 🏠 VIEW: MENU PRINCIPAL
 * Responsabilidade: Tela de boas-vindas com as opções de Login e Ajuda.
 * Integração: PJODC v10 - UX Slate/Outline com telemetria.
 *
 * 🚫 SEM BOTÃO DE CADASTRO (v7): o Proprietário entra por Google, e a própria
 * autenticação cria a conta no primeiro acesso — um formulário de cadastro seria
 * uma segunda porta para o mesmo lugar. A view 'signup' continua existindo, mas
 * só é alcançada pelo desvio de planeta (MiscViews -> 'fix-planet').
 */
export default function MainMenuView({
  onSelectAccess,
  onHelpToggle,
  showHelpOptions,
  onNavigate
}: MainMenuViewProps) {
  return (
    <div className="w-full flex flex-col space-y-5 animate-fade-in">
      {/* Botão de Impacto (Login) */}
      <div className="flex justify-center mb-10">
        <button 
          onClick={onSelectAccess} 
          className="group relative overflow-hidden rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white p-3 border border-slate-100"
        >
          <Image 
            src="/botao-login.jpg" 
            alt="Entrar" 
            width={260} 
            height={260} 
            className="rounded-[1.5rem] object-cover" 
            style={{ height: 'auto' }}
            priority 
            unoptimized 
          />
        </button>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {/* Seção de Ajuda */}
        <div className="relative w-full flex flex-col items-center">
          <button 
            onClick={onHelpToggle} 
            className="w-auto mx-auto px-10 text-center py-4 rounded-2xl border border-slate-200 bg-white shadow-sm font-bold text-blue-600 hover:bg-blue-50 transition-all text-sm uppercase tracking-wider flex items-center gap-2" 
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AJUDA
          </button>

          {showHelpOptions && (
            <div className="w-full mt-3 bg-white/90 backdrop-blur-md border border-slate-200 rounded-[2rem] p-3 shadow-xl animate-fade-in space-y-2 z-20">
              <button onClick={() => onNavigate('contact')} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M12 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Fale Conosco</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}