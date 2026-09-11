"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authService } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

/**
 * 🔐 LOGIN COM PERSISTÊNCIA COOKIE SSR (PJODC v4)
 * Versão: v4 - Catraca em bypass (sem Cloudflare Turnstile) + sincronização
 * absoluta Cliente/Servidor via Cookies HTTP.
 * * Esta função executa no Servidor (Vercel/Terminal) e grava de forma federada
 * os cookies necessários para o funcionamento de Server Actions filhos.
 */
export async function loginWithCatracaAction(
  email: string, 
  pass: string
) {
  try {
    // 1. 🔑 EXECUÇÃO DO LOGIN NO CÉREBRO (CORE)
    // A catraca opera em bypass na v4: não há verificação externa antes do login.
    const authData = await authService.signIn(email, pass);

    // 2. 🍪 PULO DO GATO: PERSISTÊNCIA DE COOKIES NO SERVIDOR (SERVER-SIDE COOKIE WRITE)
    // Instancia o cliente SSR nativo para injetar a sessão no pote de cookies HTTP.
    // Isso garante que funções Server-Side (Middleware e outras Actions) leiam a sessão logada.
    if (authData.session) {
      const cookieStore = await cookies();
      const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );

      // Força a escrita física imediata dos tokens (access_token e refresh_token) nos cookies do navegador
      const { error: setSessionError } = await supabaseServer.auth.setSession(authData.session);
      
      if (setSessionError) {
        console.error("[LoginAction] Erro fatal ao injetar cookies de sessão SSR:", setSessionError);
        throw new Error(`Erro de persistência: Não foi possível sincronizar os cookies estáveis de sessão: ${setSessionError.message}`);
      }
    }

    // 3. 📦 ENTREGA DO "PACOTE DE ACESSO" CONSOLIDADO
    return { 
      success: true, 
      user: authData.user,
      session: authData.session 
    };

  } catch (error: unknown) {
    // 🕵️ PERÍCIA: Tratamento de erros amigável para o usuário final
    // 🌍 Tradução das mensagens do Supabase Auth para português.
    // "Email not confirmed" só deve aparecer se o gatilho de auto-confirmação
    // (supabase/criar-bd/plataforma_01_schema.sql, seção 7.1) não estiver aplicado.
    const ERROS_TRADUZIDOS: Record<string, string> = {
      'Invalid login credentials': 'Usuário ou senha inválidos.',
      'Email not confirmed': 'Seu e-mail ainda não foi confirmado. Avise o administrador da plataforma.',
      'User already registered': 'Este e-mail já está registrado.',
      'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
      'Invalid email': 'E-mail inválido.',
    };

    // A mensagem crua vem do GoTrue em inglês; a tabela acima a traduz. Sem o
    // `mensagemDeErro`, um erro lançado como string ou como objeto do PostgREST
    // não tem `.message` e a busca na tabela devolveria `undefined` calado.
    const mensagemCrua = mensagemDeErro(error, "Erro inesperado na ponte de autenticação.");
    const errorMessage = ERROS_TRADUZIDOS[mensagemCrua] || mensagemCrua;

    return { 
      success: false, 
      error: errorMessage 
    };
  }
}