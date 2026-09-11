import { useRouter } from 'expo-router';
import { profileService, telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '@jairo/core';
import { googleOAuthMobile } from '../../lib/googleOAuthMobile';
import { storageService } from '../../services/storageService';
import type { FluxoAuthCtx } from './types';

/**
 * 🔵 FLUXO: LOGIN DO PROPRIETÁRIO POR GOOGLE (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/useGoogleLogin.ts
 *
 * Espelha o `handleGoogleSignIn` da web, com a mecânica do OAuth trocada: lá o
 * popup do Google Identity Services devolve um ID Token; aqui o navegador do
 * sistema devolve os tokens pelo deep link. O resto — portão do cadastro,
 * telemetria, triagem — é idêntico. Ver `lib/googleOAuthMobile.ts`.
 *
 * 🏁 O PORTÃO DO `profile_completed` É O CORAÇÃO DESTE FLUXO. O Google entrega
 * e-mail e nome, nada mais: sem planeta, país, estado e cidade o usuário não
 * segue para a triagem. E a verificação vai pela RPC `check_profile_completed`
 * (dentro do `profileService`), que confere a bandeira E os cinco campos — a
 * bandeira sozinha mentiria se um campo fosse esvaziado depois.
 *
 * 🚪 DESISTIR NÃO É FALHAR. Fechar o navegador antes de autenticar devolve
 * `cancelled`, e a tela volta ao estado normal sem mensagem vermelha — gritar
 * "erro" com quem apenas mudou de ideia é ruído.
 */
export function useGoogleLogin(ctx: FluxoAuthCtx) {
  const router = useRouter();
  const { setLoading, setMessage, setCurrentUser, triar, falhar, tratarSemVinculos } = ctx;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_ATTEMPT, {
      [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner_mobile',
    });

    try {
      const resposta = await googleOAuthMobile.signInOwner();

      if (resposta.cancelled) {
        setLoading(false);
        return;
      }
      if (!resposta.success || !resposta.session) throw new Error(resposta.error);

      const user = resposta.session.user;
      await storageService.saveAuthSession(resposta.session);

      telemetry.identify(user.id, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email,
        [ANALYTICS_PROPERTIES.AUTH_PROVIDER]: 'google',
      });

      if (!(await profileService.isProfileCompleted(user.id))) {
        setCurrentUser({ id: user.id, email: user.email ?? '' });
        router.push('/(auth)/complete-profile');
        setLoading(false);
        return;
      }

      const resultado = await triar(user.id, 'OWNER');
      if (resultado === 'sem-vinculos') tratarSemVinculos('OWNER');
    } catch (erro) {
      falhar(erro);
      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_FAILED, {
        [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: (erro as Error)?.message,
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner_mobile',
      });
    } finally {
      setLoading(false);
    }
  };

  return { handleGoogleSignIn };
}
