"use client";

import React from "react";
import type { UserProfile } from "@jairo/core";

interface ProfileDetailsViewProps {
  profile: UserProfile;
  onEdit: () => void;
  onAskDelete: () => void;
}

/** Cartão de leitura de um campo do perfil. */
function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{rotulo}</p>
      <p className="font-bold text-slate-800 break-words">{valor?.trim() || '—'}</p>
    </div>
  );
}

/**
 * 👤 VIEW: PERFIL EM LEITURA (PJODC v10)
 * Local: apps/admin-web/src/components/dashboard/profile/ProfileDetailsView.tsx
 *
 * Só desenha. O e-mail e o provedor aparecem, mas não são editáveis: quem os
 * define é o Google (ou o cadastro original), e mudá-los aqui descolaria o perfil
 * da conta em auth.users.
 */
export default function ProfileDetailsView({ profile, onEdit, onAskDelete }: ProfileDetailsViewProps) {
  return (
    <div className="space-y-4">
      <Campo rotulo="E-mail" valor={profile.email} />
      <Campo rotulo="Nome Completo" valor={profile.full_name} />

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Planeta" valor={profile.planet} />
        <Campo rotulo="País" valor={profile.country} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Estado" valor={profile.state} />
        <Campo rotulo="Cidade" valor={profile.city} />
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          Forma de acesso
        </p>
        <p className="font-bold text-slate-800">
          {profile.auth_provider === 'google' ? '🔑 Conta Google' : '✉️ E-mail e senha'}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-200 space-y-3">
        <button
          onClick={onEdit}
          className="w-full px-4 py-3 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all"
        >
          Editar Perfil
        </button>
        <button
          onClick={onAskDelete}
          className="w-full px-4 py-3 bg-red-50 text-red-600 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all"
        >
          Apagar Conta
        </button>
      </div>
    </div>
  );
}
