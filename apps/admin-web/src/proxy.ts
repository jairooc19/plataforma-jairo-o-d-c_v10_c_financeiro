import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROTA_BLOQUEIO, ROTAS_PROTEGIDAS, isMobileUserAgent } from '@/lib/mobileBlock'

/**
 * 🔵 PROXY: RENOVAÇÃO DE SESSÃO E BLOQUEIO MÓVEL (PJODC v10)
 * Local: apps/admin-web/src/proxy.ts
 *
 * ⚠️ ESTE ARQUIVO SE CHAMAVA `middleware.ts` ATÉ A v10. No Next.js 16 a
 * convenção `middleware` está DEPRECIADA e foi renomeada para `proxy` — a
 * documentação oficial diz, textualmente, que o nome antigo "está depreciado e
 * foi renomeado para proxy". O conteúdo é o mesmo; mudam o nome do arquivo e o
 * nome da função exportada.
 *
 * ⚠️ E MUDA UMA COISA A MAIS, QUE PRECISA SER SABIDA: o `proxy` roda SEMPRE no
 * runtime Node.js. A documentação é explícita: "Proxy defaults to using the
 * Node.js runtime. The runtime config option is not available in Proxy files."
 * O antigo `middleware` rodava no Edge. Para este arquivo isso é indiferente —
 * ele só lê cookies, compara texto e chama o Supabase —, mas é a diferença que
 * pode morder quem trouxer para cá algo que dependia do Edge.
 *
 * ⚠️ REGRA DE OURO: qualquer exceção não capturada aqui derruba TODAS as rotas,
 * inclusive a página de login. Por isso nada neste arquivo pode lançar: as
 * variáveis de ambiente são lidas com reserva e a chamada de rede vive dentro
 * de try/catch.
 *
 * 🔐 O QUE ELE **NÃO** FAZ: autorizar. A documentação do Next.js avisa que uma
 * mudança de `matcher` ou uma refatoração de rota pode tirar o proxy do caminho
 * sem ninguém perceber, e por isso a verificação de identidade tem de estar
 * também no destino. Nesta plataforma, quem autoriza de verdade é o banco
 * (RLS + `is_superuser()`), não este arquivo.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function proxy(request: NextRequest) {
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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '[Proxy] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes no build. Sessão não será renovada.'
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
    console.error('[Proxy] Falha ao renovar a sessão do Supabase:', erro)
  }

  return response
}

// Roda em todas as rotas, menos arquivos estáticos e imagens.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
