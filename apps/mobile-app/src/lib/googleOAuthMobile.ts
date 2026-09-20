/**
 * 🔵 GOOGLE OAUTH NO TELEMÓVEL — WebBrowser + Supabase (PJODC v10)
 * Local: apps/mobile-app/src/lib/googleOAuthMobile.ts
 *
 * ESTE É O EQUIVALENTE MOBILE DO POPUP DA WEB, e é deliberadamente o "caminho
 * de reserva" que a web já tinha: quem conduz o OAuth é o Supabase, não o app.
 *
 * ❌ POR QUE NÃO O CAMINHO DA WEB: lá o `@react-oauth/google` renderiza um botão
 * que devolve um ID Token pronto, e o Core o troca por sessão em
 * `googleAuthService.signInComGoogle(idToken, papel)` (⚠️ este comentário dizia
 * `signInOwner`, nome que NUNCA existiu no Core). Esse botão é um componente DOM —
 * não existe em React Native. O equivalente nativo
 * (`@react-native-google-signin`) exigiria development build, SHA-1 do keystore
 * Android e um OAuth client iOS no Google Cloud.
 *
 * ✅ O QUE FAZEMOS: `signInWithGoogleRedirect` (já existente no Core) devolve a
 * URL de autorização do Supabase; abrimos essa URL no navegador do sistema e
 * esperamos o retorno pelo deep link do app. Nenhuma chave nova, nenhum módulo
 * nativo, funciona em Expo Go.
 *
 * ⚠️ SÃO DOIS CADASTROS, EM DOIS PAINÉIS DIFERENTES — e confundi-los custou
 * seis rodadas de depuração em 2026-09-07. Ver `lib/oauthDiagnostics.ts`.
 *
 *   1) GOOGLE CLOUD CONSOLE > APIs e Serviços > Credenciais > (o OAuth client)
 *      > "URIs de redirecionamento autorizados":
 *          https://<ref-do-projeto>.supabase.co/auth/v1/callback
 *      É ESTE, e SÓ este, o valor que o Google confere. **O Google nunca recebe
 *      o `exp://` nem o `plataformajairo://`** — quem fala com o Google é o
 *      Supabase, e ele se apresenta com a própria URL. Tentar cadastrar a URI do
 *      app aqui dá `Erro 400: redirect_uri_mismatch`, e o Google ainda recusa o
 *      formato (IP privado, `localhost` sem domínio, esquema customizado).
 *
 *   2) SUPABASE > Authentication > URL Configuration > "Redirect URLs":
 *      a URI que `montarRedirectUri()` gera: `plataformajairo://auth/google`.
 *      O Supabase só usa este valor DEPOIS que o Google já devolveu o usuário
 *      para ele. E quando ele NÃO casa com a lista, o GoTrue não acusa erro:
 *      **cai silenciosamente na Site URL** (tipicamente localhost:3000). O
 *      sintoma é o navegador parando numa página estranha, e parece falha do
 *      app — não é.
 *
 * ⛔ ESTE FLUXO NÃO FUNCIONA NO EXPO GO, e não há configuração que resolva. Lá o
 * `montarRedirectUri()` devolve `exp://<IP>:8081/--/auth/google`, e o GoTrue
 * REJEITA o esquema `exp://` — testado literal e com curinga (`exp://**`), os
 * dois recusados, enquanto `https://…` e `plataformajairo://…` passam. Por isso
 * o projeto migrou para development build (`eas build --profile development`),
 * onde o app tem esquema próprio. Dossiê completo em `apps/mobile-app/AGENTS.md`.
 *
 * 🌐 POR QUE A WEB FUNCIONAVA E O MOBILE NÃO: a web usa o caminho do POPUP
 * (`signInWithIdToken`), que se apoia em "Origens JavaScript autorizadas" e não
 * tem redirect URI nenhum. Os dois caminhos exercitam metades diferentes do
 * MESMO OAuth client — a web passar no login não dizia nada sobre o mobile.
 *
 * 🔀 A CONVERSÃO DA URL EM SESSÃO NÃO MORA MAIS AQUI: está em
 * `lib/oauthCallbackSession.ts`, porque a rota `app/auth/google.tsx` precisa
 * exatamente da mesma. Lá também está a explicação dos dois formatos de retorno
 * (implícito e PKCE) e da corrida entre os dois consumidores.
 *
 * ⚠️ ESTE NÃO É O ÚNICO CAMINHO DE VOLTA, e tratá-lo como se fosse custou um
 * "Endereço não encontrado" em 2026-09-07. O sistema operacional entrega o deep
 * link ao app, e o assinante de links do Expo Router o recebe junto com o
 * `openAuthSessionAsync`. Sem a rota `app/auth/google.tsx`, o roteador não achava
 * o endereço e caía em `+not-found.tsx`.
 */
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, googleAuthService } from '@jairo/core';
import { registrarDiagnosticoOAuth } from './oauthDiagnostics';
import { concluirSessaoOAuth } from './oauthCallbackSession';
import type { Session } from '@supabase/supabase-js';

export interface ResultadoOAuthMobile {
  success: boolean;
  session?: Session | null;
  cancelled?: boolean;
  error?: string;
}

/** Endereço de volta do OAuth. O Expo resolve o esquema certo por ambiente. */
export function montarRedirectUri(): string {
  return Linking.createURL('auth/google');
}

export const googleOAuthMobile = {
  /**
   * 🚪 PORTA ÚNICA DO GOOGLE NO MOBILE — SERVE AOS DOIS PAPÉIS.
   *
   * ⚠️ CHAMAVA-SE `signInOwner` ATÉ 20/09/2026, e o nome era a própria armadilha:
   * ele sugeria que existia (ou que faltava) um segundo método para o Dependente.
   * Não existe, e não deve existir — **a mecânica do OAuth é idêntica para os
   * dois**. O papel não vai ao Google, não vai ao Supabase e não é gravado em
   * lugar nenhum por este arquivo: ele só decide, DEPOIS do login, qual triagem
   * rodar. Ver `services/papelDeAcessoService.ts`.
   *
   * Nunca lança — devolve `{ success: false, error }` para a tela decidir o que
   * mostrar. O `useGoogleLogin` depende desse contrato.
   */
  async entrarComGoogle(): Promise<ResultadoOAuthMobile> {
    try {
      const redirectTo = montarRedirectUri();
      registrarDiagnosticoOAuth(redirectTo);

      const { url } = await googleAuthService.signInWithGoogleRedirect(redirectTo);
      if (!url) throw new Error('O Supabase não devolveu a URL de autorização do Google.');

      const resultado = await WebBrowser.openAuthSessionAsync(url, redirectTo);

      // O usuário fechou o navegador. Não é falha — é desistência, e a tela não
      // deve gritar um erro vermelho por isso.
      if (resultado.type !== 'success') {
        return { success: false, cancelled: true };
      }

      /**
       * 🤝 A CONVERSÃO MORA EM `lib/oauthCallbackSession.ts` porque a rota
       * `app/auth/google.tsx` faz exatamente o mesmo com exatamente a mesma URL.
       * São dois consumidores do mesmo retorno, e eles não podem divergir.
       */
      const sessao = await concluirSessaoOAuth(resultado.url);

      /**
       * ⚠️ SESSÃO NULA AQUI NÃO É NECESSARIAMENTE FALHA. A rota do deep link
       * pode ter chegado primeiro e já ter consumido o retorno — no caminho PKCE
       * o código é de uso único. Antes de acusar erro, perguntamos ao supabase-js
       * se já existe sessão; se existir, o login deu certo por outro caminho.
       */
      if (!sessao) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('O retorno do Google não trouxe os tokens de sessão.');
        return { success: true, session: data.session };
      }

      return { success: true, session: sessao };
    } catch (error: unknown) {
      // `unknown`, não `any`: o `catch` do JavaScript pode receber QUALQUER coisa
      // — uma string, `undefined`, um objeto sem `message`. Anotar `any` faria o
      // TypeScript aceitar `error.message` sem checagem, e um erro atípico
      // derrubaria o próprio tratamento de erro.
      const mensagem = error instanceof Error ? error.message : undefined;
      return { success: false, error: mensagem ?? 'Falha na autenticação com o Google.' };
    }
  },
};
