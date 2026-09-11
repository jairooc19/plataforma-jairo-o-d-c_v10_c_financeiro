"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mensagemDeErro } from "@/lib/erro";

/**
 * 🍪 PONTE DE SESSÃO SSR DO LOGIN GOOGLE (PJODC v10)
 * Local: apps/admin-web/src/app/auth/google-actions.ts
 *
 * POR QUE ESTA AÇÃO EXISTE:
 * O login com senha nasce no servidor (`loginWithCatracaAction`) e já grava os
 * cookies HTTP de quebra. O login Google por popup nasce no NAVEGADOR: o
 * `signInWithIdToken` guarda a sessão no storage do cliente e o servidor não
 * fica sabendo de nada. Sem esta ponte, o middleware e qualquer Server Action
 * seguinte enxergariam um visitante anônimo — o mesmo loop de "Aguardando
 * Triagem" que a v4 já tinha resolvido para o fluxo de senha.
 *
 * Recebe apenas os dois tokens, e não o objeto de sessão inteiro: é o mínimo
 * que o `setSession` precisa para reconstruir a sessão do lado do servidor.
 *
 * ⚠️ Falha aqui NÃO deve derrubar o login: o cliente já está autenticado no
 * navegador e o dashboard funciona. Devolvemos o erro para registro e seguimos.
 */
export async function syncGoogleSessionAction(
  accessToken: string,
  refreshToken: string
) {
  try {
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

    const { error } = await supabaseServer.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("[GoogleSession] Falha ao gravar cookies SSR:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[GoogleSession] Erro inesperado na ponte de cookies:", error);
    return { success: false, error: mensagemDeErro(error, "Erro desconhecido.") };
  }
}
