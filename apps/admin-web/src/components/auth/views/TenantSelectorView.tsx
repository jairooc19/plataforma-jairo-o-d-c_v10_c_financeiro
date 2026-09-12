"use client";

import React from "react";
import type { VinculoDeEmpresa } from "@jairo/core";

interface TenantSelectorViewProps {
  userTenants: VinculoDeEmpresa[];
  onSelect: (tenant: VinculoDeEmpresa) => void;
  onBack: () => void;
}

/**
 * 🏢 VIEW: SELETOR DE EMPRESA (TENANT) — PJODC v10
 * Responsabilidade: listar e permitir a seleção de contextos de empresa ativos.
 *
 * ⚠️ v10 — O TIPO VEM DO CORE, e não mais de uma cópia declarada aqui dentro.
 * A cópia local exigia `slug: string`, enquanto o serviço devolve `slug`
 * opcional: o `tsc` acusou a diferença no momento em que o Core passou a ter
 * tipos de verdade (antes ele devolvia `any`, e o erro ficava invisível).
 * Uma forma, um dono.
 */
export default function TenantSelectorView({ userTenants, onSelect, onBack }: TenantSelectorViewProps) {
  return (
    <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white animate-fade-in">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight text-center mb-8 border-b pb-4">
        Escolha a Empresa
      </h2>

      <div className="space-y-4">
        {userTenants.map((t, idx) => {
          const isActive = t.tenants.users?.is_active !== false;

          return (
            <button
              key={idx}
              onClick={() => isActive && onSelect(t)}
              disabled={!isActive}
              className={`w-full p-6 rounded-[2.2rem] border transition-all text-left group shadow-sm flex flex-col ${
                !isActive
                  ? 'bg-slate-100 border-slate-200 grayscale cursor-not-allowed opacity-70'
                  : 'bg-slate-50 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-400 hover:shadow-lg'
              }`}
            >
              <span className={`${!isActive ? 'text-slate-400' : 'text-blue-600 group-hover:text-blue-100'} font-black text-xs uppercase tracking-widest mb-1 transition-colors`}>
                {t.tenants.users?.email}
              </span>

              <span className="block font-black uppercase text-lg tracking-tighter leading-tight">
                {t.tenants.tenant_name}
              </span>

              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Papel: {t.role === 'OWNER' ? 'Proprietário' : 'Dependente'}
                </span>

                {!isActive ? (
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-200">
                    Gestor Inativo
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                    Entrar ➡
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

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
