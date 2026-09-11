import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import SignUpView from '@/components/auth/SignUpView';
import MiscViews from '@/components/auth/MiscViews';
import { useAuthLogicMobile } from '@/hooks/useAuthLogicMobile';

/**
 * 📝 ROTA: CADASTRO (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/signup.tsx
 *
 * Os nove campos do cadastro por senha. Não é anunciada no menu principal —
 * mesma decisão da web desde a v7: o Proprietário entra por Google e a conta
 * nasce no primeiro acesso, então um botão "cadastrar" no menu seria uma segunda
 * porta para o mesmo lugar. A rota existe e funciona para quem chega por link.
 *
 * 👽 O DESVIO DE PLANETA MORA AQUI. Escolher um planeta diferente de TERRA troca
 * a tela pelo bloqueio, com a pegadinha que a web também tem. Fica no arquivo da
 * rota, e não dentro do `SignUpView`, para que o formulário continue sendo só um
 * formulário — a brincadeira é fluxo de navegação, não campo de entrada.
 */
export default function SignUpScreen() {
  const router = useRouter();
  const auth = useAuthLogicMobile('signup');
  const [pegadinha, setPegadinha] = useState(false);

  const foraDaTerra = auth.formData.planet !== 'TERRA';

  if (foraDaTerra) {
    return (
      <AuthScreen semMarca>
        <MiscViews
          view="planet-blocked"
          pegadinha={pegadinha}
          onAction={(acao) => {
            if (acao === 'show-joke') setPegadinha(true);
            else {
              setPegadinha(false);
              auth.handleInputChange('planet', 'TERRA');
            }
          }}
          onBack={() => router.replace('/(auth)')}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen semMarca>
      <SignUpView
        formData={auth.formData}
        errors={auth.errors}
        podeEnviar={auth.podeEnviarCadastro}
        onChange={auth.handleInputChange}
        onSubmit={auth.handleSignUp}
        loading={auth.loading}
        message={auth.message}
        countriesOptions={auth.countriesOptions}
        statesOptions={auth.statesOptions}
        citiesOptions={auth.citiesOptions}
        citiesLoading={auth.citiesLoading}
        onBack={() => router.replace('/(auth)')}
      />
    </AuthScreen>
  );
}
