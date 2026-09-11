import { useRouter } from 'expo-router';
import { authService, telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '@jairo/core';
import { storageService } from '../../services/storageService';
import type { FluxoAuthCtx, ViewState } from './types';

/**
 * 🔒 FLUXO: LOGIN POR E-MAIL E SENHA (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/usePasswordLogin.ts
 *
 * Atende Dependente e Desenvolvedor — nunca o Proprietário, que entra só por
 * Google desde a v5.
 *
 * ❌ SEM SERVER ACTION, ao contrário da web. Lá o `loginWithCatracaAction` faz o
 * login NO SERVIDOR para poder gravar os cookies HTTP que o middleware lê. O
 * telemóvel não tem middleware nem cookie: o cliente é o ambiente confiável, e
 * um salto de rede a mais não compraria nada.
 *
 * 🔧 O DESENVOLVEDOR NÃO PASSA PELO SUPABASE. A credencial é fixa no Core, então
 * não existe sessão remota nem linha em `auth.users` — só gravamos o contexto
 * local. É por isso que o dashboard precisa tratá-lo à parte: `getUser()` volta
 * vazio para ele, e exigir usuário o expulsaria de volta à guarita.
 */
export function usePasswordLogin(ctx: FluxoAuthCtx, view: ViewState) {
  const router = useRouter();
  const { formData, setLoading, setMessage, triar, falhar, tratarSemVinculos } = ctx;

  const handleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    const emailLower = formData.email.toLowerCase();
    telemetry.capture(ANALYTICS_EVENTS.AUTH_ATTEMPT_SUBMIT, {
      [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower,
      [ANALYTICS_PROPERTIES.SELECTED_ROLE]: view,
    });

    if (view === 'login-developer') {
      const devAuth = await authService.developerSignIn(emailLower, formData.password);
      if (devAuth.success) {
        await storageService.saveSession('dev-vip-token', 'dev-master', 'DEVELOPER');
        router.replace('/(tabs)');
      } else {
        setMessage({ text: '❌ Credenciais Inválidas.', type: 'error' });
      }
      setLoading(false);
      return;
    }

    try {
      const data = await authService.signIn(emailLower, formData.password);
      const user = data?.user;
      if (!user) throw new Error('Login sem usuário devolvido.');

      // Persiste antes da triagem: se o app morrer no meio da escolha da
      // empresa, a sessão já sobreviveu e o usuário não refaz o login.
      if (data.session) await storageService.saveAuthSession(data.session);
      telemetry.identify(user.id, { [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email });

      const resultado = await triar(user.id, 'DEPENDENT');
      if (resultado === 'sem-vinculos') tratarSemVinculos('DEPENDENT');
    } catch (erro) {
      falhar(erro);
    } finally {
      setLoading(false);
    }
  };

  return { handleSignIn };
}
