import { useRouter } from 'expo-router';
import { authService, telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '@jairo/core';
import { storageService } from '../../services/storageService';
import { logoutService } from '../../services/logoutService';
import type { FluxoAuthCtx, ViewState } from './types';

/**
 * 🔒 FLUXO: LOGIN POR E-MAIL E SENHA (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/usePasswordLogin.ts
 *
 * Atende Dependente e Desenvolvedor — nunca o Proprietário, que entra só por
 * Google desde a v5.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: O DESENVOLVEDOR PASSOU PELO SUPABASE
 * ===========================================================================
 * Até a v9 este arquivo fazia:
 *
 *     const devAuth = await authService.developerSignIn(email, senha);
 *     // comparação de duas strings dentro do próprio aplicativo
 *     await storageService.saveSession('dev-vip-token', 'dev-master', 'DEVELOPER');
 *
 * Ou seja: a senha do Painel de Engenharia viajava DENTRO DO APK (qualquer um
 * extrai), e o "crachá" resultante era um texto gravado no cofre do aparelho —
 * que pertence a quem tem o aparelho. Quem soubesse disso entrava sem senha.
 *
 * Agora o Desenvolvedor faz login de verdade, e quem diz se ele é Desenvolvedor
 * é o BANCO (`is_superuser()`), com a sessão na mão. O papel continua sendo
 * gravado no cofre — mas agora como CONSEQUÊNCIA de uma resposta do servidor, e
 * não como a fonte da verdade.
 *
 * ❌ SEM SERVER ACTION, ao contrário da web: o telemóvel não tem middleware nem
 * cookie, então um salto de rede a mais não compraria nada.
 */
export function usePasswordLogin(ctx: FluxoAuthCtx, view: ViewState) {
  const router = useRouter();
  const { formData, setLoading, setMessage, triar, falhar, tratarSemVinculos } = ctx;

  const handleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    const emailLower = formData.email.toLowerCase();
    const querPainelTecnico = view === 'login-developer';

    telemetry.capture(ANALYTICS_EVENTS.AUTH_ATTEMPT_SUBMIT, {
      [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower,
      [ANALYTICS_PROPERTIES.SELECTED_ROLE]: view,
    });

    try {
      const data = await authService.signIn(emailLower, formData.password);
      const user = data?.user;
      if (!user) throw new Error('Login sem usuário devolvido.');

      // Persiste antes de qualquer triagem: se o app morrer no meio, a sessão
      // já sobreviveu e o usuário não refaz o login.
      if (data.session) await storageService.saveAuthSession(data.session);
      telemetry.identify(user.id, { [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email });

      /**
       * 🔧 QUEM É DESENVOLVEDOR? O BANCO RESPONDE.
       * A coluna `is_superuser` não está entre as que o cliente pode gravar, e a
       * função `is_superuser()` a lê com a sessão recém-criada.
       */
      const ehDesenvolvedor = await authService.ehDesenvolvedor();

      if (ehDesenvolvedor) {
        const token = data.session?.access_token ?? 'sessao-local';
        await storageService.saveSession(token, 'painel-tecnico', 'DEVELOPER');
        telemetry.capture(ANALYTICS_EVENTS.AUTH_DEVELOPER_SUCCESS, {
          [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower,
        });
        router.replace('/(tabs)');
        return;
      }

      if (querPainelTecnico) {
        // Credencial válida, mas sem acesso técnico. Encerramos a sessão: quem
        // pediu a porta de serviço não deve ficar logado como usuário comum sem
        // perceber.
        telemetry.capture(ANALYTICS_EVENTS.AUTH_DEVELOPER_DENIED, {
          [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower,
        });
        await logoutService.logout();
        setMessage({ text: '❌ Esta conta não tem acesso ao Painel de Engenharia.', type: 'error' });
        return;
      }

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
