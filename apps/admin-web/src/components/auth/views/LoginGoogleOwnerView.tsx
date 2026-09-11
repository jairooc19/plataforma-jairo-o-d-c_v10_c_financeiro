"use client";

import React from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { HAS_GOOGLE_CLIENT_ID } from "@/lib/googleClientId";

interface LoginGoogleOwnerViewProps {
  loading: boolean;
  onSubmit: (credentialResponse: CredentialResponse) => void;
  onGoogleError: () => void;
  onRedirectFallback: () => void;
  onBack: () => void;
}

/**
 * 🔑 VIEW: LOGIN DO PROPRIETÁRIO VIA GOOGLE (PJODC v10)
 * Local: apps/admin-web/src/components/auth/views/LoginGoogleOwnerView.tsx
 *
 * ESCOPO: apenas o acesso "Usuário Proprietário". Dependente e Desenvolvedor
 * continuam no LoginFormsView, com e-mail e senha.
 *
 * Não há campos: quem valida a identidade é o Google. Conta nova é criada
 * sozinha em public.users no primeiro acesso (gatilho on_auth_user_created,
 * com a rede de segurança ensure_google_user_profile logo atrás).
 *
 * DOIS BOTÕES POSSÍVEIS, NUNCA OS DOIS AO MESMO TEMPO:
 *  - com NEXT_PUBLIC_GOOGLE_CLIENT_ID: o botão oficial do Google, em popup;
 *  - sem a chave: um botão nosso que entrega o OAuth ao Supabase por
 *    redirecionamento. Assim a porta do Proprietário nunca fica sem maçaneta.
 */
export default function LoginGoogleOwnerView({
  loading,
  onSubmit,
  onGoogleError,
  onRedirectFallback,
  onBack
}: LoginGoogleOwnerViewProps) {
  return (
    <div className="w-full bg-white/95 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white animate-fade-in">
      <div className="space-y-8 flex flex-col">

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Login Proprietário
          </h2>
          <p className="text-xs text-slate-500 mt-2">Autentique-se com sua conta Google</p>
        </div>

        {/* Área do botão: enquanto autentica, some para não permitir duplo clique */}
        <div className="flex justify-center min-h-[44px] items-center">
          {loading ? (
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              Autenticando...
            </div>
          ) : HAS_GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              onSuccess={onSubmit}
              onError={onGoogleError}
              text="signin_with"
              size="large"
              logo_alignment="center"
            />
          ) : (
            <button
              type="button"
              onClick={onRedirectFallback}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
                <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.9 41.2 15.4 46 24 46z" />
                <path fill="#FBBC05" d="M11.7 28.3c-.5-1.3-.7-2.8-.7-4.3s.3-3 .7-4.3v-5.7H4.3C2.8 17 2 20.4 2 24s.8 7 2.3 10l7.4-5.7z" />
                <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4 30 2 24 2 15.4 2 7.9 6.8 4.3 14l7.4 5.7c1.7-5.2 6.6-9.1 12.3-9.1z" />
              </svg>
              Entrar com Google
            </button>
          )}
        </div>

        <div className="text-center text-xs text-slate-400">
          {HAS_GOOGLE_CLIENT_ID ? (
            <p>Usando Google OAuth 2.0</p>
          ) : (
            <p>
              Google OAuth 2.0 por redirecionamento.<br />
              Para o acesso em janela, configure <strong>NEXT_PUBLIC_GOOGLE_CLIENT_ID</strong>.
            </p>
          )}
        </div>

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
      </div>
    </div>
  );
}
