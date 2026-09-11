"use client";

import React from "react";
import SearchableSelect from "../../SearchableSelect";

interface CompleteProfileViewProps {
  formData: { full_name: string; planet: string; country: string; state: string; city: string };
  loading: boolean;
  userEmail: string;
  countriesOptions: { label: string; value: string }[];
  statesOptions: { label: string; value: string }[];
  citiesOptions: { label: string; value: string }[];
  onInputChange: (name: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onLogout: () => void;
}

/** Estilo único dos rótulos visíveis do formulário (igual ao SignUpView). */
const LABEL_CLASS = "text-[11px] font-black text-slate-500 uppercase tracking-widest px-1";

/**
 * 🏁 VIEW: COMPLETAR CADASTRO (PJODC v10)
 * Local: apps/admin-web/src/components/auth/views/CompleteProfileView.tsx
 *
 * Quem entra pelo Google chega com e-mail e nome — e mais nada. Esta tela cobra
 * o que falta: planeta, país, estado e cidade. É OBRIGATÓRIA e não tem "pular":
 * enquanto o cadastro estiver pela metade, o dashboard devolve o usuário para cá.
 *
 * A única saída é SAIR — daí o botão de logout no rodapé, e não um "voltar".
 * "Voltar ao início" devolveria à guarita ainda autenticado, e o próximo passo
 * o traria de volta a esta mesma tela: um laço sem fim.
 *
 * 🔌 SEM ESTADO PRÓPRIO: consome `formData`/`onInputChange` do `useAuthLogic`,
 * como todas as views desta pasta. É o que dá as cidades do IBGE de graça (o
 * hook já as busca quando o estado muda) e mantém o UPPERCASE automático.
 */
export default function CompleteProfileView({
  formData,
  loading,
  userEmail,
  countriesOptions,
  statesOptions,
  citiesOptions,
  onInputChange,
  onSubmit,
  onLogout
}: CompleteProfileViewProps) {

  const isBrasil = formData.country === 'BRASIL';

  // O botão só libera com os cinco campos preenchidos — a mesma regra que o
  // profileService aplica no Core. Aqui é só cortesia visual; a guarda é lá.
  const faltaPreencher =
    !formData.full_name?.trim() ||
    !formData.planet?.trim() ||
    !formData.country?.trim() ||
    !formData.state?.trim() ||
    !formData.city?.trim();

  return (
    <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white animate-fade-in">
      <div className="text-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
          Completar Cadastro
        </h2>
        <p className="text-xs text-slate-500 mt-2">
          Faltam alguns dados para liberar o seu acesso.
        </p>
        <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest">
          {userEmail}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 flex flex-col">
        {/* Nome Completo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="complete-full-name" className={LABEL_CLASS}>
            Nome Completo: <span className="text-red-500">*</span>
          </label>
          <input
            id="complete-full-name"
            type="text"
            placeholder="NOME COMPLETO"
            value={formData.full_name}
            onChange={(e) => onInputChange('full_name', e.target.value)}
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Planeta e País */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="complete-planet" className={LABEL_CLASS}>
              Planeta: <span className="text-red-500">*</span>
            </label>
            <select
              id="complete-planet"
              value={formData.planet}
              onChange={(e) => onInputChange('planet', e.target.value)}
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"
            >
              <option value="TERRA">🌍 TERRA</option>
              <option value="OUTRO">👽 OUTRO</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="complete-country" className={LABEL_CLASS}>
              País: <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              id="complete-country"
              name="country"
              placeholder="PAÍS"
              options={countriesOptions}
              value={formData.country}
              onChange={onInputChange}
            />
          </div>
        </div>

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

        {faltaPreencher && (
          <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
            ⚠️ Todos os campos são obrigatórios.
          </p>
        )}

        <button
          disabled={loading || faltaPreencher}
          type="submit"
          className="w-auto mx-auto px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-sm uppercase tracking-widest mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'SALVANDO...' : 'CONTINUAR'}
        </button>

        {/* A única saída possível: sair. Não há "voltar" — ver o cabeçalho. */}
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 w-auto mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          SAIR DA CONTA
        </button>
      </form>
    </div>
  );
}
