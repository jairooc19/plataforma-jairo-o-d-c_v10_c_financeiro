import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import LoginFormsView from '@/components/auth/LoginFormsView';
import LoginGoogleView from '@/components/auth/LoginGoogleView';
import MiscViews from '@/components/auth/MiscViews';
import { useAuthLogicMobile, type ViewState } from '@/hooks/useAuthLogicMobile';

/**
 * 🔑 ROTA: LOGIN (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/login.tsx
 *
 * Uma rota, TRÊS portas — como o `AuthInterface.tsx` da web decide entre
 * `LoginGoogleView` e `LoginFormsView`:
 *
 * ⚠️ ESTE COMENTÁRIO DIZIA `LoginGoogleOwnerView` ATÉ 17/09/2026 — nome que
 * deixou de existir em 13/09/2026 na web. E note a divergência REAL que sobra
 * abaixo: na WEB o Dependente entra por Google; aqui ele ainda cai no formulário
 * de senha. Mudar isso é alterar COMPORTAMENTO do aplicativo, não comentário —
 * ficou pendente de decisão do dono do projeto (o mobile está adiado).
 *
 *   ?papel=OWNER      → LoginGoogleView  (só o botão do Google, sem campos)
 *   ?papel=DEPENDENT  → LoginFormsView   (e-mail + senha)
 *   ?papel=DEVELOPER  → LoginFormsView   (credencial fixa no Core)
 *
 * ⚠️ O PAPEL VEM POR PARÂMETRO DE ROTA, e não por estado local, porque é ele que
 * decide a consulta de triagem depois do login: `getUserTenants` filtra por
 * `role`, e um Proprietário consultado como 'DEPENDENT' volta com zero vínculos
 * e cairia na sala de espera para sempre.
 *
 * 🕳️ "Aguardando Triagem" aparece AQUI, e não numa rota própria, porque é o
 * desfecho de um login bem-sucedido sem empresa — o usuário está autenticado,
 * não voltou à guarita.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { papel } = useLocalSearchParams<{ papel?: string }>();

  const viewInicial: ViewState =
    papel === 'OWNER' ? 'login-owner' : papel === 'DEVELOPER' ? 'login-developer' : 'login-dependent';

  const auth = useAuthLogicMobile(viewInicial);
  const voltar = () => router.replace('/(auth)');

  // Login deu certo, mas o Proprietário ainda não tem empresa vinculada.
  if (auth.view === 'waiting-approval') {
    return (
      <AuthScreen>
        <MiscViews view="waiting-approval" onBack={auth.handleLogout} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      {auth.view === 'login-owner' ? (
        <LoginGoogleView
          onGoogleSignIn={auth.handleGoogleSignIn}
          loading={auth.loading}
          message={auth.message}
          onBack={voltar}
        />
      ) : (
        <LoginFormsView
          modo={auth.view === 'login-developer' ? 'login-developer' : 'login-dependent'}
          formData={auth.formData}
          errors={auth.errors}
          podeEnviar={auth.podeEnviarLogin}
          onChange={auth.handleInputChange}
          onSubmit={auth.handleSignIn}
          loading={auth.loading}
          message={auth.message}
          onBack={voltar}
        />
      )}
    </AuthScreen>
  );
}
