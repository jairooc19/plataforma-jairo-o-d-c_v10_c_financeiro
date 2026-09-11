/**
 * 🔑 CONCLUSÃO DA SESSÃO A PARTIR DA URL DE RETORNO DO OAUTH (PJODC v10)
 * Local: apps/mobile-app/src/lib/oauthCallbackSession.ts
 *
 * Este arquivo existe porque O RETORNO DO GOOGLE CHEGA POR DOIS CAMINHOS, e os
 * dois precisam converter exatamente a mesma URL na mesma sessão:
 *
 *   1) `lib/googleOAuthMobile.ts` — o `WebBrowser.openAuthSessionAsync` captura
 *      o deep link e devolve a URL para quem chamou. É o caminho principal.
 *   2) `app/auth/google.tsx` — o SISTEMA OPERACIONAL entrega o mesmo deep link
 *      ao app, o Expo Router o resolve como rota e a tela conclui o login.
 *
 * ⚠️ OS DOIS ACONTECEM, E A ORDEM ENTRE ELES É UMA CORRIDA. No Android o
 * redirecionamento da Custom Tab dispara um Intent: o `openAuthSessionAsync`
 * escuta esse retorno, mas o assinante de links do Expo Router escuta o mesmo
 * evento. Quando o roteador chega primeiro — ou quando o app foi reaberto do
 * zero pelo deep link, caso em que o `openAuthSessionAsync` nem existe mais —
 * quem tem de concluir o login é a rota. Foi por não existir `app/auth/google.tsx`
 * que o app caía em "Endereço não encontrado" depois de escolher a conta Google.
 *
 * 🔀 DOIS FORMATOS DE RETORNO, os dois tratados: o supabase-js usa o fluxo
 * `implicit` por padrão (tokens no fragmento `#access_token=…`), mas se um dia o
 * Core passar a declarar `flowType: 'pkce'` o retorno vira `?code=…`. Tratar só
 * um dos dois quebraria em silêncio nessa troca.
 */
import { supabase, googleAuthService } from '@jairo/core';
import type { Session } from '@supabase/supabase-js';

export interface TokensOAuth {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  erro?: string;
}

/**
 * Extrai os tokens da URL de retorno.
 * O fragmento (`#`) não é enviado a servidor nenhum — é justamente por isso que
 * o fluxo implícito o usa para carregar credenciais.
 */
export function extrairTokensOAuth(url: string): TokensOAuth {
  const fragmento = url.includes('#') ? url.substring(url.indexOf('#') + 1) : '';
  const consulta = url.includes('?') ? url.substring(url.indexOf('?') + 1).split('#')[0] : '';

  const params = new URLSearchParams(fragmento || consulta);
  const paramsConsulta = new URLSearchParams(consulta);

  return {
    access_token: params.get('access_token') ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
    code: paramsConsulta.get('code') ?? undefined,
    erro: params.get('error_description') || paramsConsulta.get('error_description') || undefined,
  };
}

/** A URL traz material de autenticação? Usado pela rota antes de tentar. */
export function pareceRetornoOAuth(url: string | null | undefined): boolean {
  if (!url) return false;
  const { access_token, code, erro } = extrairTokensOAuth(url);
  return Boolean(access_token || code || erro);
}

/**
 * Converte a URL de retorno em sessão do Supabase.
 *
 * Devolve `null` quando a URL não traz credencial nenhuma — o chamador decide
 * se isso é problema (o `googleOAuthMobile` trata como falha; a rota consulta a
 * sessão corrente, porque o outro caminho pode ter chegado primeiro).
 *
 * ⚠️ NÃO É IDEMPOTENTE NO CAMINHO PKCE: um `code` só pode ser trocado uma vez.
 * Por isso quem chama duas vezes precisa ter uma rede — ver a rota, que cai em
 * `getSession()` quando esta função falha.
 */
/**
 * ⏳ ESPERA A SESSÃO APARECER, venha ela de onde vier.
 *
 * ⚠️ ESTA FUNÇÃO EXISTE POR CAUSA DE UM BUG REAL (2026-09-07). A rota
 * `app/auth/google.tsx` lia o deep link com `Linking.useURL()` — e esse hook
 * NÃO ENTREGA NADA quando o app já estava aberto:
 *
 *   • `getInitialURL()` devolve a URL que ABRIU o app; com o app rodando, é null;
 *   • o evento `url` já disparou ANTES — foi ele que fez o roteador navegar para
 *     cá. Quando a tela monta e assina o evento, ele já passou.
 *
 * Resultado: a rota ficava presa em "Concluindo o login…" para sempre. O defeito
 * só era VISÍVEL para o Proprietário sem empresa, porque no fluxo normal o
 * `useGoogleLogin` chama `router.replace('/(tabs)')`, que destrói a pilha e leva
 * a tela travada junto; já `tratarSemVinculos` apenas muda o estado da tela de
 * login, sem navegar — e a tela travada continuava por cima.
 *
 * 🤝 A SAÍDA É NÃO DEPENDER DA URL. Quando o app já está aberto, quem tem o
 * retorno é o `openAuthSessionAsync`, e ele vai estabelecer a sessão em paralelo.
 * A rota só precisa ESPERAR essa sessão aparecer — o supabase-js é a fonte
 * comum aos dois caminhos.
 *
 * ⏱️ O TETO É DELIBERADO (24 × 250ms = 6s). Sem teto, um acesso à rota sem
 * login nenhum giraria para sempre; com teto, ele desiste e devolve à guarita.
 */
export async function esperarSessao(
  tentativas = 24,
  intervaloMs = 250
): Promise<Session | null> {
  for (let i = 0; i < tentativas; i += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((resolver) => setTimeout(resolver, intervaloMs));
  }
  return null;
}

export async function concluirSessaoOAuth(url: string): Promise<Session | null> {
  const { access_token, refresh_token, code, erro } = extrairTokensOAuth(url);
  if (erro) throw new Error(erro);

  // CAMINHO PKCE: o Supabase devolveu um código a ser trocado por sessão.
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  // CAMINHO IMPLÍCITO (padrão hoje): os tokens vieram prontos no fragmento.
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;

  // 🛡️ Rede de segurança do perfil, igual à web: o gatilho
  // `on_auth_user_created` é o caminho normal, esta RPC cobre a conta que
  // escapou dele. Falhar aqui não derruba o login (o Core só registra).
  if (data.user) await googleAuthService.ensureUserProfile(data.user);

  return data.session;
}
