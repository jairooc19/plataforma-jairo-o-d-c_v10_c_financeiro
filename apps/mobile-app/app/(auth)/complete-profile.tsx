import React, { useEffect } from 'react';
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
 *   2. o app foi reaberto e o dashboard devolveu o usuário para cá.
 * No segundo caso este hook nasce sem saber quem é o usuário — daí o
 * `carregarUsuarioPendente`, que busca a sessão e adianta no formulário o nome
 * que o Google já entregou. É o mesmo efeito que a web tem no `useAuthLogic`.
 *
 * ⚠️ SEM SESSÃO NÃO HÁ CADASTRO A COMPLETAR: o hook devolve à guarita sozinho.
 */
export default function CompleteProfileScreen() {
  const auth = useAuthLogicMobile('complete-profile');

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
