"use client";

import React from "react";
import SearchableSelect from "../../SearchableSelect";
import type { LocationOption } from "@jairo/core";
import type { CadastroFormData } from "@/types/plataforma";

interface SignUpViewProps {
  formData: CadastroFormData;
  loading: boolean;
  showPassword: boolean;
  countriesOptions: LocationOption[];
  statesOptions: LocationOption[];
  citiesOptions: LocationOption[];
  onInputChange: (name: string, value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

/** Estilo único dos rótulos visíveis do formulário. */
const LABEL_CLASS = "text-[11px] font-black text-slate-500 uppercase tracking-widest px-1";

/**
 * 📝 VIEW: FORMULÁRIO DE REGISTO (SIGN UP)
 * Responsabilidade: Captura de dados de novos utilizadores com lógica de localização geográfica.
 * Integração: PJODC v4 - Cadastro com Triagem 'pending'. País é campo obrigatório.
 */
export default function SignUpView({
  formData,
  loading,
  showPassword,
  countriesOptions,
  statesOptions,
  citiesOptions,
  onInputChange,
  onTogglePassword,
  onSubmit,
  onBack
}: SignUpViewProps) {
  
  const isBrasil = formData.country === 'BRASIL';

  return (
    <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white animate-fade-in">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight text-center mb-8 border-b pb-4">
        Cadastro
      </h2>
      
      <form onSubmit={onSubmit} className="space-y-4 flex flex-col">
        {/* Nome Completo */}
        <input 
          type="text" 
          placeholder="NOME COMPLETO" 
          value={formData.full_name} 
          onChange={(e) => onInputChange('full_name', e.target.value)} 
          required 
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400 transition-colors" 
        />

        {/* E-mail */}
        <input 
          type="email" 
          placeholder="SEU@EMAIL.COM" 
          value={formData.email} 
          onChange={(e) => onInputChange('email', e.target.value)} 
          required 
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400 transition-colors" 
        />

        {/* Planeta e País */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-planet" className={LABEL_CLASS}>
              Planeta:
            </label>
            <select 
              id="signup-planet"
              value={formData.planet} 
              onChange={(e) => onInputChange('planet', e.target.value)} 
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
            >
              <option value="TERRA">🌍 TERRA</option>
              <option value="OUTRO">👽 OUTRO</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signup-country" className={LABEL_CLASS}>
              País: <span className="text-red-500">*</span>
            </label>
            <SearchableSelect 
              id="signup-country"
              name="country" 
              placeholder="PAÍS" 
              options={countriesOptions} 
              value={formData.country} 
              onChange={onInputChange} 
            />
          </div>
        </div>

        {/* Aviso de campo obrigatório em branco */}
        {!formData.country?.trim() && (
          <p className="text-xs font-bold text-red-500 uppercase tracking-wide -mt-1">
            ⚠️ O país é obrigatório.
          </p>
        )}

        {/* Estado e Cidade */}
        <div className="grid grid-cols-2 gap-3">
          {isBrasil ? (
            <SearchableSelect 
              name="state" 
              placeholder="ESTADO" 
              options={statesOptions} 
              value={formData.state} 
              onChange={onInputChange} 
            />
          ) : (
            <input 
              type="text" 
              placeholder="ESTADO" 
              value={formData.state} 
              onChange={(e) => onInputChange('state', e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400" 
            />
          )}

          {isBrasil ? (
            <SearchableSelect 
              name="city" 
              placeholder="CIDADE" 
              options={citiesOptions} 
              value={formData.city} 
              onChange={onInputChange} 
              disabled={!formData.state} 
            />
          ) : (
            <input 
              type="text" 
              placeholder="CIDADE" 
              value={formData.city} 
              onChange={(e) => onInputChange('city', e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400" 
            />
          )}
        </div>
        
        {/* Senhas */}
        <div className="space-y-4">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="SUA SENHA (MIN. 6 DIG)" 
              value={formData.password} 
              onChange={(e) => onInputChange('password', e.target.value)} 
              required 
              minLength={6} 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400" 
            />
            <button 
              type="button" 
              onClick={onTogglePassword} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xl"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="CONFIRME SUA SENHA" 
              value={formData.confirm_password} 
              onChange={(e) => onInputChange('confirm_password', e.target.value)} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400" 
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

        {/* Ações */}
        <button 
          disabled={loading || !formData.country?.trim()} 
          type="submit" 
          className="w-auto mx-auto px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-sm uppercase tracking-widest mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'SALVANDO...' : 'FINALIZAR CADASTRO'}
        </button>

        <button 
          type="button" 
          onClick={onBack} 
          className="mt-4 w-auto mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 py-3 px-10 rounded-lg border border-transparent hover:border-blue-100"
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