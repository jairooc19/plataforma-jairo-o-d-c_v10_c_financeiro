import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AuthScreen from '@/components/auth/AuthScreen';
import CompleteProfileView from '@/components/auth/CompleteProfileView';
import MiscViews from '@/components/auth/MiscViews';
import { authStyles, CORES } from '@/components/auth/authStyles';
import { useAuthLogicMobile } from '@/hooks/useAuthLogicMobile';

/**
 * 🏁 ROTA: COMPLETAR CADASTRO (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/complete-profile.tsx
 *
 * Destino obrigatório de quem entrou pelo Google e ainda não preencheu planeta,
 * país, estado e cidade.
 *
 * 🚪 DUAS PORTAS CHEGAM AQUI, e é por isso que a tela carrega o usuário sozinha
 * em vez de recebê-lo pronto:
 *   1. o login do Google acabou de detectar `profile_completed = false`;
 *   2. o app foi reaberto e o painel devolveu o usuário para cá.
 * No segundo caso o hook nasce sem saber quem é o usuário — daí o
 * `carregarUsuarioPendente`.
 *
 * ⚠️ SEM SESSÃO NÃO HÁ CADASTRO A COMPLETAR: o hook devolve à guarita sozinho.
 *
 * ===========================================================================
 * 👽 CORREÇÃO v10: O PLANETA "OUTRO" NÃO PODIA SER GRAVADO AQUI
 * ===========================================================================
 * O bloqueio planetário existia apenas na tela de CADASTRO. Nesta, o seletor
 * oferecia "OUTRO" e gravava — o mesmo valor que, no cadastro, barra a entrada.
 * Duas telas com a mesma pergunta e respostas diferentes é o tipo de incoerência
 * que ninguém percebe até um usuário reclamar.
 *
 * Agora a regra é a mesma dos dois lados, e o "Voltar e Selecionar Terra"
 * devolve o usuário para ESTA tela (na web, até a v9, ele caía no formulário de
 * cadastro, que é outra tela, com outros campos).
 */
export default function CompleteProfileScreen() {
  const auth = useAuthLogicMobile('complete-profile');
  const [pegadinha, setPegadinha] = useState(false);

  useEffect(() => {
    auth.carregarUsuarioPendente();
    // Roda uma vez, na montagem: `carregarUsuarioPendente` é recriada a cada
    // render, e segui-la como dependência buscaria o perfil em laço infinito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O Proprietário completou o cadastro mas ainda não tem empresa vinculada.
  if (auth.view === 'waiting-approval') {
    return (
      <AuthScreen semMarca>
        <MiscViews view="waiting-approval" onBack={auth.handleLogout} />
      </AuthScreen>
    );
  }

  // 👽 Planeta diferente de TERRA: mesma barreira do cadastro.
  if (auth.formData.planet !== 'TERRA') {
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
          onBack={auth.handleLogout}
        />
      </AuthScreen>
    );
  }

  if (!auth.currentUser) {
    return (
      <View style={[authStyles.tela, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={CORES.azul} />
      </View>
    );
  }

  return (
    <AuthScreen semMarca>
      <CompleteProfileView
        email={auth.currentUser.email}
        formData={auth.formData}
        errors={auth.errors}
        podeEnviar={auth.podeEnviarPerfil}
        onChange={auth.handleInputChange}
        onSubmit={auth.handleCompleteProfile}
        onLogout={auth.handleLogout}
        loading={auth.loading}
        message={auth.message}
        countriesOptions={auth.countriesOptions}
        statesOptions={auth.statesOptions}
        citiesOptions={auth.citiesOptions}
        citiesLoading={auth.citiesLoading}
      />
    </AuthScreen>
  );
}
