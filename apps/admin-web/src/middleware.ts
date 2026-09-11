import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROTA_BLOQUEIO, ROTAS_PROTEGIDAS, isMobileUserAgent } from '@/lib/mobileBlock'

/**
 * 🔵 MIDDLEWARE DE RENOVAÇÃO DE SESSÃO (Edge Runtime)
 *
 * Responsabilidade única: renovar o cookie de sessão do Supabase a cada requisição.
 *
 * ⚠️ REGRA DE OURO DO EDGE RUNTIME:
 * Qualquer exceção não capturada aqui derruba TODAS as rotas com
 * 500 MIDDLEWARE_INVOCATION_FAILED — inclusive a página de login.
 * Por isso nada neste arquivo pode lançar: variáveis de ambiente são lidas
 * com fallback e a chamada de rede ao Supabase vive dentro de try/catch.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request: NextRequest) {
  // 📱 ESCUDO 0: celular não entra no painel.
  // Roda ANTES de tudo porque esta requisição vai virar redirecionamento de
  // qualquer jeito — renovar a sessão aqui seria trabalho de rede jogado fora.
  // É a camada GROSSA (user agent se falsifica); quem barra de verdade é o
  // <MobileBlocker>, que mede a largura real da tela.
  const rotaProtegida = ROTAS_PROTEGIDAS.some((prefixo) =>
    request.nextUrl.pathname.startsWith(prefixo)
  )
  if (rotaProtegida && isMobileUserAgent(request.headers.get('user-agent'))) {
    return NextResponse.redirect(new URL(ROTA_BLOQUEIO, request.url))
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 🛡️ ESCUDO 1: sem credenciais, o createServerClient lançaria
  // "supabaseUrl is required" e mataria a aplicação inteira.
  // Deixamos a requisição passar; a proteção real acontece nas páginas/actions.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '[Middleware] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes no build. Sessão não será renovada.'
    )
    return response
  }

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Grava primeiro na requisição (para o SSR desta mesma passagem)...
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          // ...e recria a resposta já com os cookies atualizados para o browser.
          response = NextResponse.next({
            request: { headers: request.headers },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // O ponto crucial: aguardar a verificação do usuário para que
    // os cookies sejam renovados antes da resposta ser enviada.
    await supabase.auth.getUser()
  } catch (erro) {
    // 🛡️ ESCUDO 2: Supabase fora do ar, URL inválida ou cookie corrompido
    // não podem derrubar a plataforma. Segue sem sessão renovada.
    console.error('[Middleware] Falha ao renovar a sessão do Supabase:', erro)
  }

  return response
}

// Configuração para garantir que o middleware rode em todas as rotas necessárias
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
