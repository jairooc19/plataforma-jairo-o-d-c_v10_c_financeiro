import { useRouter } from 'expo-router';
import { supabase } from '@jairo/core';
import type { FluxoAuthCtx } from './types';

/**
 * 📝 FLUXO: CADASTRO POR SENHA (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/useSignUpFlow.ts
 *
 * Espelha o `handleSignUp` da web, incluindo as duas validações que rodam ANTES
 * de tocar no Supabase — falhar aqui é instantâneo e não gasta uma ida à rede.
 *
 * 🌍 O PAÍS É OBRIGATÓRIO desde a v4 e a coluna é `NOT NULL` no banco. A checagem
 * aqui não substitui a do banco: ela existe para que o usuário receba "informe o
 * país" em vez de um erro de constraint em inglês vindo do PostgREST.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  1. O CADASTRO NÃO ENVIA MAIS `role`. Até a v9 ia `role: 'pending'` no
 *     metadata — e o gatilho do banco LIA esse campo. Como o metadata é escrito
 *     pelo próprio aplicativo, bastava trocar para `'active'` e a conta nascia
 *     aprovada, pulando a triagem do Desenvolvedor. O gatilho da v10 ignora o
 *     campo, e a tela parou de enviá-lo para não sugerir que ele vale algo.
 *  2. SUMIU O `notifyAdminNewUser`. Ele chamava uma rota HTTP aberta na internet
 *     que apenas escrevia uma linha no log do servidor — nada chegava a
 *     ninguém. A fila de triagem da Central de Comandos já mostra quem se
 *     cadastrou, em tempo real.
 */
export function useSignUpFlow(ctx: FluxoAuthCtx, resetForm: () => void) {
  const router = useRouter();
  const { formData, setLoading, setMessage, falhar } = ctx;

  const handleSignUp = async () => {
    setLoading(true);
    setMessage(null);

    if (formData.password !== formData.confirm_password) {
      setMessage({ text: '❌ As senhas não coincidem!', type: 'error' });
      setLoading(false);
      return;
    }

    if (!formData.country?.trim()) {
      setMessage({ text: '❌ Informe o país. Este campo é obrigatório.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            planet: formData.planet,
            country: formData.country.trim(),
            state: formData.state,
            city: formData.city,
          },
        },
      });

      if (error) throw error;

      // v4: acesso imediato — o gatilho `on_auth_user_auto_confirm` carimba o
      // e-mail antes de a linha entrar em auth.users, então não há confirmação
      // bloqueando a entrada.
      setMessage({ text: '✅ Cadastro concluído! Você já pode entrar no sistema.', type: 'success' });
      setTimeout(() => {
        resetForm();
        router.replace('/(auth)');
      }, 4000);
    } catch (erro) {
      falhar(erro);
    } finally {
      setLoading(false);
    }
  };

  return { handleSignUp };
}
