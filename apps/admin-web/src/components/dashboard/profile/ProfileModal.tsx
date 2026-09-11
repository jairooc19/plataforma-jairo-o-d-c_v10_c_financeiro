"use client";

import React from "react";
import { useProfileModal } from "./useProfileModal";
import ProfileDetailsView from "./ProfileDetailsView";
import ProfileEditForm from "./ProfileEditForm";
import DeleteAccountConfirm from "./DeleteAccountConfirm";

interface ProfileModalProps {
  onClose: () => void;
  userId: string;
}

/**
 * 👤 MODAL: MEU PERFIL (PJODC v10)
 * Local: apps/admin-web/src/components/dashboard/profile/ProfileModal.tsx
 *
 * Orquestrador: escolhe qual dos três painéis aparece e desenha a moldura.
 * Toda a lógica está no `useProfileModal`; cada painel é um arquivo à parte.
 *
 * 🔌 NÃO recebe cliente Supabase por prop: o `profileService` do Core já sabe
 * qual cliente usar (o anon, com RLS), como todo serviço desta plataforma.
 *
 * 🔌 NÃO recebe `isOpen`: quem monta e desmonta é o dashboard. Assim cada
 * abertura é um componente novo, com estado limpo e perfil recém-lido, sem
 * precisar de um efeito de reinicialização.
 */
export default function ProfileModal({ onClose, userId }: ProfileModalProps) {
  const {
    profile, form, panel, loading, deleting, error, success,
    abrirPainel, alterarCampo, salvar, apagarConta,
  } = useProfileModal(userId);

  const titulos = { details: 'Meu Perfil', edit: 'Editar Perfil', delete: 'Apagar Conta' };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      {/* O clique de dentro não pode fechar o modal — só o do fundo. */}
      <div
        className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
            {titulos[panel]}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-300 hover:text-slate-600 text-2xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {success}
          </div>
        )}

        {!profile && !error && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {profile && panel === 'details' && (
          <ProfileDetailsView
            profile={profile}
            onEdit={() => abrirPainel('edit')}
            onAskDelete={() => abrirPainel('delete')}
          />
        )}

        {profile && panel === 'edit' && (
          <ProfileEditForm
            form={form}
            loading={loading}
            onChange={alterarCampo}
            onCancel={() => abrirPainel('details')}
            onSave={salvar}
          />
        )}

        {profile && panel === 'delete' && (
          <DeleteAccountConfirm
            deleting={deleting}
            onCancel={() => abrirPainel('details')}
            onConfirm={apagarConta}
          />
        )}
      </div>
    </div>
  );
}
