"use client";

import React from "react";
import Link from "next/link";
import type { ManifestoDeModulo } from "@jairo/core";

/**
 * 🧩 CARTÃO DE UM MÓDULO NO PAINEL DO CLIENTE (PJODC v10)
 * Local: apps/admin-web/src/components/dashboard/modules/ModuleCard.tsx
 *
 * ⚠️ ESTE ARQUIVO É DA PLATAFORMA E NÃO CONHECE MÓDULO NENHUM. Tudo o que ele
 * desenha — nome, descrição e destino — vem do manifesto que o módulo entregou
 * ao registro. É por isso que ele nunca mais precisará ser alterado, por mais
 * módulos que sejam plugados.
 *
 * 📖 `MODULOS.md` na raiz.
 */
export default function ModuleCard({ modulo }: { modulo: ManifestoDeModulo }) {
  return (
    <Link
      href={modulo.rotaWeb}
      className="flex flex-col items-start p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all group text-left relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 relative z-10">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h5v6H4V5zm10-1h5a1 1 0 011 1v5h-6V4zM4 12h6v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7zm10 0h6v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z"
          />
        </svg>
      </div>

      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight relative z-10">
        {modulo.nome}
      </h3>
      <p className="text-sm text-slate-500 font-medium mt-2 relative z-10">
        {modulo.descricao}
      </p>
    </Link>
  );
}
