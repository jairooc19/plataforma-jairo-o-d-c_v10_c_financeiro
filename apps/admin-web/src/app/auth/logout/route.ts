import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 🚪 LOGOUT DO LADO DO SERVIDOR (PJODC v10)
 * Local: apps/admin-web/src/app/auth/logout/route.ts
 *
 * A sessão desta plataforma vive em DOIS lugares: no armazenamento do navegador
 * (supabase-js) e nos cookies HTTP (gravados por `loginWithCatracaAction` e por
 * `syncGoogleSessionAction`). Esta rota apaga a metade que o navegador não
 * alcança — a outra metade é `authService.signOut()`, no cliente.
 *
 * Sair pela metade é pior que não sair: a tela mostraria a guarita enquanto o
 * middleware continuaria enxergando o usuário autenticado.
 *
 * ⚠️ RESPONDE JSON, NÃO REDIRECIONA. Um 3xx para um `fetch(POST)` é seguido
 * automaticamente pelo navegador, que re-envia o POST ao destino — a página `/`
 * receberia um POST que ela não atende. Quem navega é o cliente, depois.
 *
 * ⚠️ NÃO usar `@supabase/auth-helpers-nextjs`: descontinuado, ausente do
 * projeto e incompatível com os cookies que o middleware lê. O padrão é `@supabase/ssr`.
 */
export async function POST() {
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

    // Apaga os cookies de sessão desta origem (o supabase-js os reescreve vazios).
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // 🛡️ Logout NUNCA deve travar: se o servidor falhar em limpar os cookies, o
    // cliente ainda encerra a própria sessão e sai da tela. Reportamos e seguimos.
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("[Logout] Falha ao limpar os cookies de sessão:", mensagem);
    return NextResponse.json({ success: false, error: mensagem }, { status: 200 });
  }
}
