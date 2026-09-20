import { useRouter } from 'expo-router';
import { profileService, telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '@jairo/core';
import { googleOAuthMobile } from '../../lib/googleOAuthMobile';
import { storageService } from '../../services/storageService';
import { papelDeAcessoService, type PapelDeAcesso } from '../../services/papelDeAcessoService';
import type { FluxoAuthCtx } from './types';

/**
 * 🔵 FLUXO: LOGIN POR GOOGLE — PROPRIETÁRIO **E** DEPENDENTE (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/useGoogleLogin.ts
 *
 * Espelha o `handleGoogleSignIn` da web, com a mecânica do OAuth trocada: lá o
 * popup do Google Identity Services devolve um ID Token; aqui o navegador do
 * sistema devolve os tokens pelo deep link. O resto — portão do cadastro,
 * telemetria, triagem — é idêntico. Ver `lib/googleOAuthMobile.ts`.
 *
 * ===========================================================================
 * ⚠️ O DEPENDENTE ENTROU AQUI EM 20/09/2026, E ANTES DISSO NÃO ENTRAVA DE JEITO
 * NENHUM
 * ===========================================================================
 * Este fluxo era exclusivo do Proprietário, e o Dependente caía no formulário de
 * e-mail e senha. Para ter senha ele precisaria se cadastrar — mas o botão de
 * cadastro saiu do menu na v7 e o `SignUpView` só é alcançável pelo desvio de
 * planeta. **Não havia caminho.** É exatamente o mesmo diagnóstico que a WEB fez
 * em 13/09/2026; o aplicativo ficou sete dias atrás, com o defeito documentado
 * em `app/(auth)/login.tsx` esperando decisão do dono do projeto.
 *
 * ⚠️ ESCOLHER "DEPENDENTE" NA GUARITA NÃO TORNA NINGUÉM DEPENDENTE. O papel só
 * diz que triagem fazer depois do login: procurar vínculos `DEPENDENT` em vez de
 * `OWNER`. Quem é o quê está em `tenant_members`, no banco, escrito pelo
 * Proprietário da empresa — e a RLS não pergunta por qual botão a pessoa clicou.
 *
 * 🎫 O PAPEL É GRAVADO NO COFRE **ANTES** DE O NAVEGADOR ABRIR, e essa ordem é a
 * razão de o arquivo existir assim. Daqui para a frente o aplicativo pode ser
 * morto pelo Android a qualquer instante: a volta chega por deep link, numa URL
 * escrita pelo Supabase, onde não cabe parâmetro nosso. Gravar depois do retorno
 * seria gravar tarde demais. Ver `services/papelDeAcessoService.ts`.
 *
 * 🏁 O PORTÃO DO `profile_completed` É O CORAÇÃO DESTE FLUXO. O Google entrega
 * e-mail e nome, nada mais: sem planeta, país, estado e cidade o usuário não
 * segue para a triagem. E a verificação vai pela RPC `check_profile_completed`
 * (dentro do `profileService`), que confere a bandeira E os cinco campos — a
 * bandeira sozinha mentiria se um campo fosse esvaziado depois.
 *
 * ⚠️ E É JUSTAMENTE AQUI QUE O DEPENDENTE NOVO SEMPRE PASSA. A conta dele nasce
 * neste login, então `profile_completed` é falso por definição no primeiro
 * acesso — o caminho segue em `useProfileCompletion`, que é outro arquivo, em
 * outra rota. Sem o cofre, o papel morreria nessa fronteira e ele seria triado
 * como Proprietário.
 *
 * 🚪 DESISTIR NÃO É FALHAR. Fechar o navegador antes de autenticar devolve
 * `cancelled`, e a tela volta ao estado normal sem mensagem vermelha — gritar
 * "erro" com quem apenas mudou de ideia é ruído.
 */
export function useGoogleLogin(ctx: FluxoAuthCtx, papel: PapelDeAcesso) {
  const router = useRouter();
  const { setLoading, setMessage, setCurrentUser, triar, falhar, tratarSemVinculos } = ctx;

  /**
   * O rótulo do fluxo na telemetria. Espelha o `fluxo` da web (`owner` /
   * `dependent`), com o sufixo que distingue a plataforma.
   */
  const fluxo = papel === 'OWNER' ? 'owner_mobile' : 'dependent_mobile';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_ATTEMPT, {
      [ANALYTICS_PROPERTIES.AUTH_FLOW]: fluxo,
    });

    try {
      // ANTES do navegador. Ver a nota do cabeçalho: depois desta linha o
      // aplicativo pode deixar de existir até o deep link voltar.
      await papelDeAcessoService.guardar(papel);

      const resposta = await googleOAuthMobile.entrarComGoogle();

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

      const resultado = await triar(user.id, papel);
      if (resultado === 'sem-vinculos') tratarSemVinculos(papel);
    } catch (erro) {
      falhar(erro);
      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_FAILED, {
        [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: (erro as Error)?.message,
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: fluxo,
      });
    } finally {
      setLoading(false);
    }
  };

  return { handleGoogleSignIn };
}
