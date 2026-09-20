import { useRouter } from 'expo-router';
import { supabase, profileService, telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '@jairo/core';
import { logoutService } from '../../services/logoutService';
import { papelDeAcessoService } from '../../services/papelDeAcessoService';
import type { AuthFormData } from '../useAuthForm';
import type { FluxoAuthCtx } from './types';

/**
 * 🏁 FLUXO: COMPLETAR CADASTRO E SAIR (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/useProfileCompletion.ts
 *
 * O fim do primeiro acesso via Google — do Proprietário **e do Dependente** —, e
 * a única saída dele.
 *
 * ===========================================================================
 * ⚠️ ESTA TELA FICA NO MEIO DO CAMINHO, E ERA AQUI QUE O PAPEL MORRIA
 * ===========================================================================
 * Até 20/09/2026 a triagem abaixo estava escrita `triar(id, 'OWNER')`, com o
 * papel FIXO no código. Enquanto só o Proprietário entrava por Google, isso era
 * verdade por construção. Com a porta do Dependente aberta virou um defeito
 * garantido — e do tipo pior, o mudo:
 *
 *   • a conta do Dependente NASCE neste login, então `profile_completed` é
 *     falso por definição e ele SEMPRE passa por aqui no primeiro acesso;
 *   • triado como 'OWNER', a consulta volta vazia (os vínculos dele são
 *     'DEPENDENT');
 *   • ele cairia em "Aguardando Triagem", esperando por um Desenvolvedor que
 *     não vai agir, enquanto quem precisava agir era o dono da empresa dele.
 *
 * Nenhum erro, nenhum log, nenhuma pista — exatamente o formato do defeito de
 * `allowed_modules` que o degrau 08 encontrou.
 *
 * 🎫 QUEM RESPONDE É O COFRE, e não um parâmetro de rota, porque esta tela é
 * alcançada por DUAS portas e uma delas não pode carregar parâmetro nenhum: o
 * deep link do Google (`app/auth/google.tsx`) chega numa URL escrita pelo
 * Supabase. Ver `services/papelDeAcessoService.ts`.
 *
 * 🚪 O LOGOUT MORA AQUI, e não num arquivo de conta genérico, porque na tela de
 * completar cadastro ele NÃO é uma conveniência: é a única porta. Um "voltar"
 * comum devolveria o usuário à guarita ainda autenticado, e o portão do
 * `profile_completed` o traria direto de volta — laço sem saída. Encerrar a
 * sessão inteira é o que quebra o ciclo.
 *
 * ✅ A VALIDAÇÃO DOS CINCO CAMPOS É DO CORE (`profileService.completeProfile`),
 * não daqui. A tela desabilita o botão por cortesia, mas a regra não pode morar
 * na interface: quem chegar por outro caminho tem de esbarrar na mesma exigência.
 */
export function useProfileCompletion(
  ctx: FluxoAuthCtx,
  currentUser: { id: string; email: string } | null,
  preencherDoPerfil: (parcial: Partial<AuthFormData>) => void,
  resetForm: () => void
) {
  const router = useRouter();
  const { formData, setLoading, setMessage, setCurrentUser, triar, falhar, tratarSemVinculos } = ctx;

  /**
   * Carrega quem está logado e adianta no formulário o que o perfil já tem.
   * Necessário porque DUAS portas chegam à tela: o login do Google (que já sabe
   * quem é o usuário) e a reabertura do app (que não sabe).
   */
  const carregarUsuarioPendente = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)');
      return;
    }

    setCurrentUser({ id: user.id, email: user.email ?? '' });

    try {
      const perfil = await profileService.getProfile(user.id);
      preencherDoPerfil({
        full_name: perfil.full_name || '',
        planet: perfil.planet || 'TERRA',
        country: perfil.country || 'BRASIL',
        state: perfil.state || '',
        city: perfil.city || '',
      });
    } catch (erro) {
      // Perfil ilegível não trava a tela: o usuário preenche do zero.
      console.error('[CompleteProfile] Perfil não pôde ser lido:', erro);
    }
  };

  const handleCompleteProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    setMessage(null);

    try {
      await profileService.completeProfile(currentUser.id, {
        full_name: formData.full_name,
        planet: formData.planet,
        country: formData.country,
        state: formData.state,
        city: formData.city,
      });

      telemetry.capture(ANALYTICS_EVENTS.PROFILE_COMPLETED, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: currentUser.email,
        [ANALYTICS_PROPERTIES.AUTH_PROVIDER]: 'google',
      });

      /**
       * ⚠️ O PAPEL VEM DO COFRE, gravado lá atrás no clique da guarita. Ver a
       * nota do cabeçalho: escrever `'OWNER'` aqui é o defeito que este arquivo
       * documenta, não um atalho.
       */
      const papel = await papelDeAcessoService.ler();

      const resultado = await triar(currentUser.id, papel);
      if (resultado === 'sem-vinculos') tratarSemVinculos(papel);
    } catch (erro) {
      falhar(erro);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logoutService.logout();
    setCurrentUser(null);
    resetForm();
    setLoading(false);
    router.replace('/(auth)');
  };

  return { carregarUsuarioPendente, handleCompleteProfile, handleLogout };
}
