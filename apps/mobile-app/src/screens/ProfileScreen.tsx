import React, { useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import InstitutionalFooter from '@/components/InstitutionalFooter';
import { logoutService } from '@/services/logoutService';
import { useNativeActionSheet } from '@/hooks/useNativeActionSheet';
import { useSessionRole } from '@/hooks/useSessionRole';

import { useProfileScreen } from './profile/useProfileScreen';
import ProfileIdentity from './profile/ProfileIdentity';
import ProfileDetailsView from './profile/ProfileDetailsView';
import ProfileEditForm from './profile/ProfileEditForm';
import DeleteAccountConfirm from './profile/DeleteAccountConfirm';

import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

/**
 * 👤 TELA: MEU PERFIL — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/ProfileScreen.tsx
 *
 * ORQUESTRADOR: escolhe qual dos três painéis aparece e nada mais. Todo o estado
 * e as chamadas de serviço vivem no `profile/useProfileScreen.ts`; cada painel é
 * um arquivo à parte. É a mesma divisão que a web faz em
 * `components/dashboard/profile/` — e foi ela que trouxe este arquivo de 374
 * linhas para menos de 150, como manda a regra de ouro do CLAUDE.md.
 *
 * ✅ EDIÇÃO E EXCLUSÃO DE CONTA CHEGARAM AO MOBILE NA v9. Até aqui a tela era só
 * leitura e trazia a nota "a edição do perfil e a exclusão da conta são feitas no
 * painel web" — a nota saiu junto com a limitação.
 *
 * 🔐 O QUE TORNA ISSO POSSÍVEL SEM ROTA DE SERVIDOR: o `profileService` usa o
 * cliente ANON, e quem autoriza é a RLS (`auth.uid() = id` no UPDATE) mais a
 * trava de identidade dentro de `delete_user_permanently`. O Proprietário tem
 * sessão Supabase de verdade, então o mesmo serviço da web funciona aqui sem
 * `supabaseAdmin` — que é proibido no mobile.
 *
 * 🔧 O DESENVOLVEDOR NUNCA CHEGA AQUI, e a tela não precisa tratá-lo em cada
 * painel. A credencial dele é fixa no Core e não existe linha em `public.users`
 * para `getProfile` encontrar; o `(tabs)/_layout.tsx` esconde esta aba para ele.
 * A guarda `ehDesenvolvedor` é a segunda tranca, para quem alcançar a rota pelo
 * endereço direto.
 *
 * 📜 O RODAPÉ INSTITUCIONAL FICA FORA DA ROLAGEM, fixo acima da barra nativa —
 * ver o cabeçalho de `components/InstitutionalFooter.tsx`.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { mostrar } = useNativeActionSheet();
  const { ehDesenvolvedor, carregando: carregandoPapel } = useSessionRole();

  const {
    perfil, form, painel,
    carregando, salvando, apagando,
    erro, sucesso,
    abrirPainel, alterarCampo, cancelarEdicao, salvar, apagarConta,
  } = useProfileScreen(!carregandoPapel && !ehDesenvolvedor);

  /**
   * 🚪 SAIR PERGUNTA ANTES, E A PERGUNTA É DO SISTEMA. Quem toca por engano perde
   * a sessão, e a biometria do próximo boot não a traz de volta. A confirmação
   * usa o menu nativo: `UIAlertController` no iOS, `AlertDialog` no Android.
   */
  const confirmarSaida = useCallback(() => {
    mostrar(
      [
        {
          titulo: 'Sair da conta',
          destrutiva: true,
          aoTocar: async () => {
            await logoutService.logout();
            router.replace('/(auth)');
          },
        },
      ],
      { titulo: 'Encerrar a sessão?', mensagem: 'Você precisará entrar novamente.' }
    );
  }, [mostrar, router]);

  if (carregandoPapel || carregando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  const semPerfil = ehDesenvolvedor || !perfil;

  return (
    <View style={estilos.raiz}>
      <ScrollView
        style={estilos.rolagem}
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProfileIdentity
          nome={perfil?.full_name}
          email={perfil?.email}
          indisponivel={semPerfil}
        />

        {/*
          As mensagens ficam ACIMA do painel e valem para os três. Erro de
          gravação e erro de exclusão aparecem no mesmo lugar porque, do ponto de
          vista de quem lê, são a mesma coisa: a última ação não deu certo.
        */}
        {!!erro && (
          <View style={[estilos.mensagem, estilos.mensagemErro]}>
            <Text style={estilos.textoErro}>{erro}</Text>
          </View>
        )}
        {!!sucesso && (
          <View style={[estilos.mensagem, estilos.mensagemSucesso]}>
            <Text style={estilos.textoSucesso}>{sucesso}</Text>
          </View>
        )}

        {semPerfil ? (
          <View style={estilos.aviso}>
            <Text style={estilos.avisoTexto}>
              {ehDesenvolvedor
                ? 'O Acesso de Desenvolvedor não possui perfil no banco de dados.'
                : 'Não foi possível carregar o seu perfil.'}
            </Text>
          </View>
        ) : painel === 'editar' ? (
          <ProfileEditForm
            form={form}
            salvando={salvando}
            onChange={alterarCampo}
            onCancelar={cancelarEdicao}
            onSalvar={salvar}
          />
        ) : painel === 'apagar' ? (
          <DeleteAccountConfirm
            apagando={apagando}
            onCancelar={() => abrirPainel('detalhes')}
            onConfirmar={apagarConta}
          />
        ) : (
          <ProfileDetailsView
            perfil={perfil}
            onEditar={() => abrirPainel('editar')}
            onApagar={() => abrirPainel('apagar')}
            onSair={confirmarSaida}
          />
        )}
      </ScrollView>

      <InstitutionalFooter />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: BRAND.background },
  rolagem: { flex: 1 },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.xl,
    paddingBottom: ESPACO.xxl,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.background,
  },

  mensagem: {
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginBottom: ESPACO.lg,
  },
  mensagemErro: { backgroundColor: BRAND.errorSoft },
  mensagemSucesso: { backgroundColor: BRAND.successSoft },
  textoErro: { ...TIPOGRAFIA.legenda, color: BRAND.error },
  textoSucesso: { ...TIPOGRAFIA.legenda, color: BRAND.success },

  aviso: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.xl,
    marginBottom: ESPACO.xl,
  },
  avisoTexto: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
  },
});
