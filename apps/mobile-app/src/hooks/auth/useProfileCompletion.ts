import { useRouter } from 'expo-router';
import { supabase, profileService, telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from '@jairo/core';
import { logoutService } from '../../services/logoutService';
import type { AuthFormData } from '../useAuthForm';
import type { FluxoAuthCtx } from './types';

/**
 * 🏁 FLUXO: COMPLETAR CADASTRO E SAIR (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/useProfileCompletion.ts
 *
 * O fim do primeiro acesso do Proprietário via Google, e a única saída dele.
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

      const resultado = await triar(currentUser.id, 'OWNER');
      if (resultado === 'sem-vinculos') tratarSemVinculos('OWNER');
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
