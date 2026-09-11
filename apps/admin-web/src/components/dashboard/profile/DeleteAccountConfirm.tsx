"use client";

import React from "react";

interface DeleteAccountConfirmProps {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 💀 VIEW: CONFIRMAÇÃO DE EXCLUSÃO DA CONTA (PJODC v10)
 * Local: apps/admin-web/src/components/dashboard/profile/DeleteAccountConfirm.tsx
 *
 * Passo separado de propósito: apagar a conta é irreversível e não pode ficar a
 * um clique de distância do botão de editar.
 *
 * ⚠️ Dono de empresa NÃO consegue apagar a conta — a função do banco recusa, para
 * não deixar a empresa e os vínculos dos dependentes órfãos. O aviso está aqui
 * para que a recusa não chegue como surpresa depois do clique.
 */
export default function DeleteAccountConfirm({ deleting, onCancel, onConfirm }: DeleteAccountConfirmProps) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
        <p className="text-red-800 font-black uppercase tracking-widest text-xs mb-2">
          Esta ação não tem volta
        </p>
        <p className="text-red-700 text-sm leading-relaxed">
          Sua conta, seu perfil e todos os seus vínculos com empresas serão apagados
          em definitivo. Não há como recuperar depois.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
        <p className="text-amber-800 text-xs leading-relaxed">
          <strong>Se você é dono de uma empresa</strong>, a exclusão será recusada.
          Transfira a propriedade da empresa antes de tentar novamente.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 px-4 py-3 bg-slate-100 text-slate-800 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 px-4 py-3 bg-red-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
        >
          {deleting ? 'Apagando...' : 'Apagar Conta'}
        </button>
      </div>
    </div>
  );
}
