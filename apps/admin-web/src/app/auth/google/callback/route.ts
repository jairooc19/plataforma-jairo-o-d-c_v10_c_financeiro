import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 🔁 RETORNO DO GOOGLE — CAMINHO DE RESERVA (PJODC v10)
 * Local: apps/admin-web/src/app/auth/google/callback/route.ts
 *
 * QUANDO ESTA ROTA É USADA: só no caminho de reserva, quando
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID não está configurado e a tela de Proprietário
 * cai no `signInWithGoogleRedirect`. No caminho normal (popup com ID Token) o
 * usuário nunca sai da página e esta rota nem é tocada.
 *
 * ⚠️ Usa `@supabase/ssr` — o mesmo pacote do middleware. NÃO usar
 * `@supabase/auth-helpers-nextjs`: está descontinuado, não é dependência deste
 * projeto e escreveria cookies em formato incompatível com o middleware.
 *
 * O destino é `/dashboard`, que já sabe se virar sozinho: sem empresa ativa em
 * sessionStorage ele abre o Lobby de seleção; sem vínculo nenhum, devolve o
 * usuário para a raiz.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error_description")
    || requestUrl.searchParams.get("error");

  // O Google recusou ou o usuário fechou o consentimento: volta para a guarita.
  if (oauthError) {
    console.error("[GoogleCallback] Retorno de erro do provedor:", oauthError);
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[GoogleCallback] Falha ao trocar o código por sessão:", error.message);
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
