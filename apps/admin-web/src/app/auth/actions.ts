"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mensagemDeErro } from "@/lib/erro";

/**
 * 🔐 LOGIN COM PERSISTÊNCIA EM COOKIE SSR (PJODC v10)
 * Local: apps/admin-web/src/app/auth/actions.ts
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: O LOGIN DEIXOU DE USAR O CLIENTE COMPARTILHADO
 * ===========================================================================
 * Até a v9 esta ação chamava `authService.signIn`, que usa o cliente único do
 * Core (`packages/core/src/lib/supabase.ts`). Esse cliente é um SINGLETON com
 * `persistSession: true`: no servidor, ele guarda em memória a sessão do último
 * login e a reaproveita nas chamadas seguintes — de OUTRAS pessoas.
 *
 * A documentação do Supabase é direta sobre isso: no servidor é preciso criar um
 * cliente novo a cada requisição, porque senão "o usuário ficará logado como a
 * pessoa errada". Hoje o estrago seria pequeno (a única leitura server-side com
 * o cliente público é a das cores), mas a hora de arrumar é antes do módulo
 * financeiro, não depois.
 *
 * Aqui o cliente nasce e morre DENTRO da requisição, já ligado ao pote de
 * cookies daquela pessoa — e o mesmo cliente que autentica é o que grava a
 * sessão, sem um segundo `setSession`.
 *
 * 🛡️ A "catraca" segue em bypass desde a v4: não há verificação anti-robô. Se um
 * dia voltar, ela entra ANTES do `signInWithPassword`, aqui.
 */
export async function loginWithCatracaAction(email: string, pass: string) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
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

    // Autentica E grava os cookies de sessão na mesma passagem: o
    // `createServerClient` escreve os cookies pelo `setAll` acima.
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) throw error;

    /**
     * 🔧 O PAPEL VEM DO BANCO, NÃO DA TELA (correção S5).
     *
     * Até a v9 o Painel de Engenharia abria por uma comparação de strings dentro
     * do aplicativo (`admin@pjodc.ia` / `1qaz`) e por uma marca no
     * `sessionStorage`. Agora, logo após o login, perguntamos ao banco se este
     * usuário é superusuário — e quem responde é a função `is_superuser()`,
     * que lê uma coluna que o cliente não pode escrever.
     */
    const { data: ehDev } = await supabase.rpc("is_superuser");

    return {
      success: true,
      user: data.user,
      session: data.session,
      ehDesenvolvedor: ehDev === true,
    };
  } catch (error: unknown) {
    // 🌍 Tradução das mensagens do Supabase Auth para português.
    // "Email not confirmed" só deve aparecer se o gatilho de auto-confirmação
    // (supabase/criar-bd/plataforma_01_schema.sql, seção 7.1) não estiver aplicado.
    const ERROS_TRADUZIDOS: Record<string, string> = {
      "Invalid login credentials": "Usuário ou senha inválidos.",
      "Email not confirmed": "Seu e-mail ainda não foi confirmado. Avise o administrador da plataforma.",
      "User already registered": "Este e-mail já está registrado.",
      "Password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres.",
      "Invalid email": "E-mail inválido.",
    };

    const mensagemCrua = mensagemDeErro(error, "Erro inesperado na ponte de autenticação.");
    const errorMessage = ERROS_TRADUZIDOS[mensagemCrua] || mensagemCrua;

    return { success: false, error: errorMessage };
  }
}
