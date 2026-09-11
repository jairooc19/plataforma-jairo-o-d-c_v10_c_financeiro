"use client";

import React from "react";
import Catraca from "../Catraca";

type LoginView = 'login-owner' | 'login-dependent' | 'login-developer';

interface LoginFormsViewProps {
  view: LoginView;
  formData: { email: string; password: string };
  loading: boolean;
  showPassword: boolean;
  onInputChange: (name: string, value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

/**
 * 🔑 VIEW: FORMULÁRIOS DE LOGIN
 * Responsabilidade: Interface de autenticação para as três categorias de utilizadores.
 * Integração: PJODC v4 - Catraca em bypass (sem verificação externa).
 */
export default function LoginFormsView({
  view,
  formData,
  loading,
  showPassword,
  onInputChange,
  onTogglePassword,
  onSubmit,
  onBack
}: LoginFormsViewProps) {
  
  // Lógica de títulos dinâmicos
  const titles = {
    'login-owner': 'Login Proprietário',
    'login-dependent': 'Login Dependente',
    'login-developer': 'Acesso Desenvolvedor'
  };

  const isDeveloper = view === 'login-developer';

  return (
    <div className="w-full bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white animate-fade-in">
      <form onSubmit={onSubmit} className="space-y-6 flex flex-col">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {titles[view]}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Campo de E-mail */}
          <input 
            type="email" 
            placeholder="UTILIZADOR (E-MAIL)" 
            value={formData.email} 
            onChange={(e) => onInputChange('email', e.target.value)} 
            required 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold focus:border-blue-400 transition-colors" 
          />

          {/* Campo de Senha */}
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="SENHA" 
              value={formData.password} 
              onChange={(e) => onInputChange('password', e.target.value)} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold focus:border-blue-400 transition-colors" 
            />
            <button 
              type="button" 
              onClick={onTogglePassword} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* 🛡️ CATRACA: Inserida apenas nos logins de Utilizador (Dono/Dependente) */}
        {!isDeveloper && <Catraca />}

        {/* Botão de Submissão */}
        <button 
          disabled={loading} 
          type="submit"
          className={`w-auto mx-auto px-12 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-sm uppercase tracking-widest ${
            isDeveloper ? 'bg-slate-800 hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
        </button>

        {/* Botão Voltar */}
        <button 
          type="button" 
          onClick={onBack} 
          className="mt-2 w-auto mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          VOLTAR AO INÍCIO
        </button>
      </form>
    </div>
  );
}