"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID, HAS_GOOGLE_CLIENT_ID } from "@/lib/googleClientId";

/**
 * 🔵 PROVEDOR DE AUTENTICAÇÃO GOOGLE (PJODC v10)
 * Local: apps/admin-web/src/components/providers/GoogleAuthProvider.tsx
 *
 * Responsabilidade única: carregar o Google Identity Services e disponibilizar
 * o contexto que o botão de login do Proprietário consome.
 *
 * POR QUE É UM COMPONENTE À PARTE: o `layout.tsx` é Server Component (busca as
 * cores no banco em `generateMetadata`). O GoogleOAuthProvider é client-only.
 * Este arquivo é a casca "use client" que permite embrulhar um sem converter o
 * outro.
 *
 * 🛡️ ESCUDO DE AUSÊNCIA: sem Client ID configurado o provedor injetaria o
 * script do Google com credencial vazia e o console encheria de erro em toda
 * página da plataforma — inclusive nas que não têm nada a ver com login.
 * Sem a chave, ele simplesmente sai da frente: a tela do Proprietário detecta
 * a mesma ausência e oferece o caminho de reserva (redirecionamento).
 */
export default function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  if (!HAS_GOOGLE_CLIENT_ID) return <>{children}</>;

  // `locale` é prop do provedor, não do botão: define o idioma do "Fazer login
  // com o Google" que o script do Google desenha.
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale="pt-BR">
      {children}
    </GoogleOAuthProvider>
  );
}
