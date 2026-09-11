// Local: packages/core/src/services/platform/googleAuthService.ts

import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { telemetry } from '../../analytics/telemetry';
import { ANALYTICS_EVENTS } from '../../analytics/eventNames';
import { ANALYTICS_PROPERTIES } from '../../analytics/propertyNames';

/**
 * 🔵 GOOGLE AUTH SERVICE — Login com Google (OAuth 2.0) do PROPRIETÁRIO
 * Local: packages/core/src/services/platform/googleAuthService.ts
 *
 * ESCOPO: exclusivo do fluxo "Usuário Proprietário". Dependente e Desenvolvedor
 * continuam em e-mail + senha, no authService.
 *
 * DOIS CAMINHOS, UM DESTINO — ambos terminam com sessão do Supabase:
 *
 *   1) POPUP (padrão) — `signInWithGoogleIdToken`
 *      O botão do Google Identity Services abre o popup e devolve um ID Token
 *      JWT. Trocamos esse token por sessão via `signInWithIdToken`. Não há
 *      redirecionamento: o usuário nunca sai da tela de login.
 *      Exige NEXT_PUBLIC_GOOGLE_CLIENT_ID no app E o MESMO Client ID cadastrado
 *      no provedor Google do Supabase — é ele que valida a assinatura do token.
 *
 *   2) REDIRECIONAMENTO (reserva) — `signInWithGoogleRedirect`
 *      Usado quando o Client ID não está configurado no app: o popup não tem
 *      como existir, mas o Supabase sozinho ainda consegue conduzir o OAuth.
 *      Sai da página, passa pelo Google e volta em /auth/google/callback.
 *
 * ⚠️ AGNÓSTICO DE AMBIENTE: nada aqui toca em `window` (o Core roda também no
 * Metro/React Native). A URL de retorno chega por parâmetro, vinda do app.
 */

export interface GoogleSignInResult {
  success: boolean;
  session?: Session | null;
  user?: User | null;
  error?: string;
}

/**
 * 🌍 Tradução das falhas do GoTrue/Google para o idioma da plataforma.
 * Sem isso o usuário final recebe cru o "Passed nonce and nonce in id_token
 * should either both exist or not." e não tem o que fazer com a informação.
 */
const ERROS_TRADUZIDOS: Record<string, string> = {
  'Unacceptable audience in id_token':
    'O Client ID do Google no app não confere com o cadastrado no Supabase.',
  'Invalid token: token is expired':
    'A credencial do Google expirou. Tente entrar novamente.',
  'Unsupported provider: provider is not enabled':
    'O provedor Google não está ativado no projeto Supabase.',
};

function traduzirErro(mensagem: string | undefined): string {
  if (!mensagem) return 'Erro inesperado na autenticação com o Google.';
  return ERROS_TRADUZIDOS[mensagem] || mensagem;
}

export const googleAuthService = {
  /**
   * 🔑 CAMINHO 1 (POPUP): troca o ID Token do Google por sessão do Supabase.
   * O token NÃO é validado aqui — quem confere assinatura, emissor e audiência
   * é o próprio GoTrue contra as chaves públicas do Google. Validar no cliente
   * seria teatro: um cliente comprometido validaria o que quisesse.
   */
  async signInWithGoogleIdToken(idToken: string) {
    if (!idToken) throw new Error('Credencial do Google ausente.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw new Error(traduzirErro(error.message));
    return data;
  },

  /**
   * 🔑 CAMINHO 2 (REDIRECIONAMENTO): entrega o comando do OAuth ao Supabase.
   * `redirectTo` vem do app porque o Core não conhece a URL de origem.
   */
  async signInWithGoogleRedirect(redirectTo: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid profile email',
      },
    });

    if (error) throw new Error(traduzirErro(error.message));
    return data;
  },

  /**
   * 🛡️ REDE DE SEGURANÇA DO PERFIL.
   * O gatilho `on_auth_user_created` já espelha o perfil em public.users no
   * primeiro login Google. Esta chamada cobre a conta que escapou dele (criada
   * antes do gatilho existir) e que, sem perfil, cairia num dashboard vazio.
   *
   * Vai por RPC, e não por upsert direto: não existe policy de INSERT em
   * public.users, então o cliente anon é barrado pelo RLS. A função no banco é
   * SECURITY DEFINER — é ela quem tem a autoridade para criar a linha.
   *
   * Falha aqui NÃO derruba o login: o gatilho é o caminho normal e já resolveu
   * o caso comum. Registramos e seguimos.
   */
  async ensureUserProfile(user: User) {
    const { data, error } = await supabase.rpc('ensure_google_user_profile', {
      p_user_id: user.id,
      p_email: user.email,
      p_full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    });

    if (error) {
      console.warn('⚠️ [CORE-GOOGLE] Perfil não confirmado via RPC:', error.message);
      return { success: false, error: error.message };
    }
    return data;
  },

  /**
   * 🚪 PORTA ÚNICA DO PROPRIETÁRIO: autentica, garante perfil e devolve o pacote.
   * Nunca lança — devolve `{ success: false, error }` para a tela decidir o que
   * mostrar. O `useAuthLogic` depende desse contrato.
   */
  async signInOwner(idToken: string): Promise<GoogleSignInResult> {
    try {
      const { session, user } = await this.signInWithGoogleIdToken(idToken);

      if (!user) throw new Error('O Google autenticou, mas nenhum usuário voltou.');

      await this.ensureUserProfile(user);

      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_OWNER_SUCCESS, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email,
        [ANALYTICS_PROPERTIES.AUTH_PROVIDER]: 'google',
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner',
      });

      return { success: true, session, user };
    } catch (error: any) {
      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_OWNER_FAILED, {
        [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: error.message,
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner',
      });
      return { success: false, error: error.message };
    }
  },
};
