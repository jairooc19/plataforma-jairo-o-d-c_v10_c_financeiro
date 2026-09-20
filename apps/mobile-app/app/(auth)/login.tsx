import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import LoginFormsView from '@/components/auth/LoginFormsView';
import LoginGoogleView from '@/components/auth/LoginGoogleView';
import MiscViews from '@/components/auth/MiscViews';
import { useAuthLogicMobile, type ViewState } from '@/hooks/useAuthLogicMobile';
import type { PapelDeAcesso } from '@/services/papelDeAcessoService';

/**
 * 🔑 ROTA: LOGIN (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/login.tsx
 *
 * Uma rota, DUAS portas — exatamente como o `AuthInterface.tsx` da web decide
 * entre `LoginGoogleView` e `LoginFormsView`:
 *
 *   ?papel=OWNER      → LoginGoogleView  (só o botão do Google, sem campos)
 *   ?papel=DEPENDENT  → LoginGoogleView  (idem, com o aviso do convite)
 *   ?papel=DEVELOPER  → LoginFormsView   (e-mail + senha)
 *
 * ===========================================================================
 * ✅ A DIVERGÊNCIA COM A WEB FECHOU EM 20/09/2026
 * ===========================================================================
 * Este comentário dizia, desde 17/09/2026:
 *
 *   "note a divergência REAL que sobra abaixo: na WEB o Dependente entra por
 *    Google; aqui ele ainda cai no formulário de senha. Mudar isso é alterar
 *    COMPORTAMENTO do aplicativo, não comentário — ficou pendente de decisão do
 *    dono do projeto (o mobile está adiado)."
 *
 * A decisão veio em 20/09/2026, e o diagnóstico era o mesmo que a web tinha
 * feito em 13/09: **o Dependente não entrava de jeito nenhum**. Ele era mandado
 * ao formulário de senha; para ter senha precisaria se cadastrar; o botão de
 * cadastro saiu do menu na v7; e o `SignUpView` só é alcançável pelo desvio de
 * planeta. Não era uma porta ruim — era a ausência de porta.
 *
 * ⚠️ O FORMULÁRIO DE SENHA NÃO FOI APAGADO, e isso é de propósito — a web fez a
 * mesma escolha. O `usePasswordLogin` continua sabendo triar um Dependente, e
 * `login-dependent` continua no `ViewState`. Apagar faria a decisão parecer
 * irreversível; mantendo, o dia em que existir Dependente com senha é uma linha
 * de roteamento, não uma reconstrução.
 *
 * ⚠️ O PAPEL VEM POR PARÂMETRO DE ROTA, e não por estado local, porque é ele que
 * decide a consulta de triagem depois do login: `getUserTenants` filtra por
 * `role`, e um Proprietário consultado como 'DEPENDENT' volta com zero vínculos
 * e cairia na sala de espera para sempre.
 *
 * ⚠️ E O PARÂMETRO NÃO BASTA SOZINHO. O login do Google SAI DO APLICATIVO — no
 * retorno, esta rota pode nem existir mais (o Android é livre para matar o app
 * enquanto o navegador está à frente). Quem atravessa essa fronteira é o cofre:
 * ver `services/papelDeAcessoService.ts`.
 *
 * 🕳️ AS SALAS DE ESPERA APARECEM AQUI, e não em rotas próprias, porque são o
 * desfecho de um login BEM-SUCEDIDO sem empresa — o usuário está autenticado,
 * não voltou à guarita. E são DUAS, porque quem precisa agir é diferente em cada
 * caso (ver `hooks/auth/types.ts`).
 */
export default function LoginScreen() {
  const router = useRouter();
  const { papel } = useLocalSearchParams<{ papel?: string }>();

  /**
   * ⚠️ SÓ O DESENVOLVEDOR VAI AO FORMULÁRIO. Rotear `login-owner` ou
   * `login-dependent` para o `LoginFormsView` é proibição explícita do
   * CLAUDE.md — os dois entram exclusivamente por Google.
   */
  const ehDesenvolvedor = papel === 'DEVELOPER';

  const viewInicial: ViewState = ehDesenvolvedor
    ? 'login-developer'
    : papel === 'DEPENDENT'
      ? 'login-dependent'
      : 'login-owner';

  /**
   * O papel de TRIAGEM. O Desenvolvedor não tem um: ele não passa por
   * `getUserTenants` (quem responde por ele é `is_superuser()` no banco), e o
   * valor aqui nunca é lido no caminho dele.
   */
  const papelDeTriagem: PapelDeAcesso = papel === 'DEPENDENT' ? 'DEPENDENT' : 'OWNER';

  const auth = useAuthLogicMobile(viewInicial, papelDeTriagem);
  const voltar = () => router.replace('/(auth)');

  // Login deu certo, mas ainda não há empresa vinculada. Duas salas, dois
  // interlocutores: o Desenvolvedor (Proprietário) e o dono da empresa
  // (Dependente).
  if (auth.view === 'waiting-approval' || auth.view === 'waiting-team') {
    return (
      <AuthScreen>
        <MiscViews view={auth.view} onBack={auth.handleLogout} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      {ehDesenvolvedor ? (
        <LoginFormsView
          modo="login-developer"
          formData={auth.formData}
          errors={auth.errors}
          podeEnviar={auth.podeEnviarLogin}
          onChange={auth.handleInputChange}
          onSubmit={auth.handleSignIn}
          loading={auth.loading}
          message={auth.message}
          onBack={voltar}
        />
      ) : (
        <LoginGoogleView
          papel={papelDeTriagem}
          onGoogleSignIn={auth.handleGoogleSignIn}
          loading={auth.loading}
          message={auth.message}
          onBack={voltar}
        />
      )}
    </AuthScreen>
  );
}
