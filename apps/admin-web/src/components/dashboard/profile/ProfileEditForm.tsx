"use client";

import React from "react";
import { COUNTRIES, BRAZIL_STATES, type ProfileInput } from "@jairo/core";
import SearchableSelect from "@/components/SearchableSelect";
import { useBrazilCities } from "@/hooks/useBrazilCities";

interface ProfileEditFormProps {
  form: ProfileInput;
  loading: boolean;
  onChange: (name: string, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

const LABEL_CLASS = "text-[10px] font-black text-slate-400 uppercase tracking-widest px-1";

/**
 * ✏️ VIEW: EDIÇÃO DO PERFIL (PJODC v10)
 * Local: apps/admin-web/src/components/dashboard/profile/ProfileEditForm.tsx
 *
 * Mesmos campos e mesmas regras da tela de completar cadastro — inclusive a
 * exigência dos cinco: um perfil já completo não pode ser esvaziado por aqui,
 * senão o portão do dashboard o mandaria de volta para "Completar Cadastro".
 *
 * ⚠️ `COUNTRIES` e `BRAZIL_STATES` são `{ label, value }[]`, NÃO strings. Um
 * `<option>{pais}</option>` cru renderiza "[object Object]" — por isso aqui vai
 * o `SearchableSelect`, que já sabe ler esse formato (e ainda dá busca).
 */
export default function ProfileEditForm({ form, loading, onChange, onCancel, onSave }: ProfileEditFormProps) {
  const isBrasil = form.country === 'BRASIL';
  const citiesOptions = useBrazilCities(form.country, form.state);

  const faltaPreencher =
    !form.full_name?.trim() ||
    !form.planet?.trim() ||
    !form.country?.trim() ||
    !form.state?.trim() ||
    !form.city?.trim();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-full-name" className={LABEL_CLASS}>Nome Completo</label>
        <input
          id="profile-full-name"
          type="text"
          value={form.full_name}
          onChange={(e) => onChange('full_name', e.target.value)}
          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-planet" className={LABEL_CLASS}>Planeta</label>
          <select
            id="profile-planet"
            value={form.planet}
            onChange={(e) => onChange('planet', e.target.value)}
            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
          >
            <option value="TERRA">🌍 TERRA</option>
            <option value="OUTRO">👽 OUTRO</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-country" className={LABEL_CLASS}>País</label>
          <SearchableSelect
            id="profile-country"
            name="country"
            placeholder="PAÍS"
            options={COUNTRIES}
            value={form.country}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isBrasil ? (
          <SearchableSelect
            name="state"
            placeholder="ESTADO"
            options={BRAZIL_STATES}
            value={form.state}
            onChange={onChange}
          />
        ) : (
          <input
            type="text"
            placeholder="ESTADO"
            value={form.state}
            onChange={(e) => onChange('state', e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400"
          />
        )}

        {isBrasil ? (
          <SearchableSelect
            name="city"
            placeholder="CIDADE"
            options={citiesOptions}
            value={form.city}
            onChange={onChange}
            disabled={!form.state}
          />
        ) : (
          <input
            type="text"
            placeholder="CIDADE"
            value={form.city}
            onChange={(e) => onChange('city', e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400"
          />
        )}
      </div>

      {faltaPreencher && (
        <p className="text-xs font-bold text-red-500 uppercase tracking-wide">
          ⚠️ Todos os campos são obrigatórios.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-slate-100 text-slate-800 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={loading || faltaPreencher}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
