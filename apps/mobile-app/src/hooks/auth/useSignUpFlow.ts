import { useRouter } from 'expo-router';
import { supabase, authService } from '@jairo/core';
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
 * 📋 O `notifyAdminNewUser` NÃO É AGUARDADO de propósito. Ele só grava no log do
 * servidor (a v4 removeu o envio de e-mail) e já falha em silêncio por dentro —
 * esperar por ele atrasaria a confirmação de uma coisa que ao usuário não
 * importa, e uma falha ali não deve manchar um cadastro que deu certo.
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
            role: 'pending',
          },
        },
      });

      if (error) throw error;

      authService.notifyAdminNewUser(formData.full_name, formData.email);

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
