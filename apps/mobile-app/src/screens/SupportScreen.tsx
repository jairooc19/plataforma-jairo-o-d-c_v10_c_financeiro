import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { APP_VERSION } from '@jairo/core';

import Icon from '@/components/icon/Icon';
import MenuCard from '@/components/card/MenuCard';
import { useNativeActionSheet } from '@/hooks/useNativeActionSheet';
import { GESTOS_NATIVOS } from '@/lib/gestureRuntime';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE } from '@/constants/Spacing';

/** Para onde vão os relatos. Uma constante, não um literal espalhado. */
const EMAIL_SUPORTE = 'jairooc19@gmail.com';

/**
 * 💬 TELA: SUPORTE (PJODC v10)
 * Local: apps/mobile-app/src/screens/SupportScreen.tsx
 *
 * Abre o aplicativo de e-mail do aparelho com o assunto e o diagnóstico já
 * preenchidos.
 *
 * ✉️ POR QUE `mailto:` E NÃO UM FORMULÁRIO. Um formulário dentro do app
 * precisaria de um endpoint que recebesse a mensagem, e esse endpoint não
 * existe. Um formulário bonito que engole a mensagem é pior do que nenhum
 * formulário — o usuário acha que relatou e ninguém recebeu.
 *
 * ===========================================================================
 * ⚠️ CORREÇÃO v10: O AVISO DE ERRO NUNCA APARECIA
 * ===========================================================================
 * Até a v9, quando não havia aplicativo de e-mail configurado, esta tela
 * chamava:
 *
 *     mostrar([], { titulo: 'Nenhum aplicativo de e-mail', mensagem: '...' });
 *
 * ...com uma lista VAZIA de opções. E o `useNativeActionSheet` começa com
 * `if (opcoes.length === 0) return;` — ou seja, o aviso era descartado na
 * primeira linha. O toque no cartão ficava MUDO, que é exatamente o que o
 * comentário do arquivo dizia querer evitar.
 *
 * Agora passamos uma ação real ("Entendi"). O menu do sistema precisa de pelo
 * menos um botão para existir; um alerta sem botão nenhum não é alerta.
 */
export default function SupportScreen() {
  const { mostrar } = useNativeActionSheet();
  const [enviando, setEnviando] = useState(false);

  /**
   * O bloco de diagnóstico, montado uma vez. `Platform` e `Constants` não mudam
   * durante a sessão, então recalcular por render seria desperdício.
   */
  const diagnostico = useMemo(
    () =>
      [
        '',
        '',
        '---',
        'Diagnóstico (não apague):',
        `App: ${APP_VERSION}`,
        `Plataforma: ${Platform.OS} ${String(Platform.Version)}`,
        `Expo SDK: ${Constants.expoConfig?.sdkVersion ?? 'desconhecido'}`,
        `Gestos nativos: ${GESTOS_NATIVOS ? 'ativos' : 'inativos'}`,
      ].join('\n'),
    []
  );

  /** Avisa com um alerta do sistema que tem, de fato, um botão. */
  const avisar = useCallback(
    (titulo: string, mensagem: string) => {
      mostrar([{ titulo: 'Entendi', aoTocar: () => undefined }], { titulo, mensagem });
    },
    [mostrar]
  );

  const abrirEmail = useCallback(
    async (assunto: string, introducao: string) => {
      setEnviando(true);
      try {
        const url =
          `mailto:${EMAIL_SUPORTE}` +
          `?subject=${encodeURIComponent(assunto)}` +
          `&body=${encodeURIComponent(introducao + diagnostico)}`;

        const podeAbrir = await Linking.canOpenURL(url);
        if (!podeAbrir) {
          avisar(
            'Nenhum aplicativo de e-mail',
            `Configure uma conta de e-mail no aparelho, ou escreva para ${EMAIL_SUPORTE}.`
          );
          return;
        }

        await Linking.openURL(url);
      } catch (e) {
        console.error('[SUPORTE] Falha ao abrir o cliente de e-mail:', e);
        avisar('Não foi possível abrir o e-mail', `Escreva para ${EMAIL_SUPORTE}.`);
      } finally {
        setEnviando(false);
      }
    },
    [diagnostico, avisar]
  );

  const relatarErro = useCallback(
    () =>
      abrirEmail(
        `[PJODC ${APP_VERSION}] Relato de erro`,
        'Descreva o que aconteceu e o que você esperava que acontecesse:'
      ),
    [abrirEmail]
  );

  const enviarSugestao = useCallback(
    () => abrirEmail(`[PJODC ${APP_VERSION}] Sugestão`, 'Sua sugestão:'),
    [abrirEmail]
  );

  const pedirAjuda = useCallback(
    () => abrirEmail(`[PJODC ${APP_VERSION}] Dúvida`, 'Sua dúvida:'),
    [abrirEmail]
  );

  return (
    <SafeAreaView style={estilos.raiz} edges={['bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecalho}>
          <View style={estilos.simbolo}>
            <Icon name="Suporte" size={ICONE.grande} color={BRAND.primary} strokeWidth={1.75} />
          </View>
          <Text style={estilos.titulo}>Como podemos ajudar?</Text>
          <Text style={estilos.legenda}>
            Escolha um assunto. O seu aplicativo de e-mail abre com as informações
            técnicas já preenchidas.
          </Text>
        </View>

        <View style={estilos.lista}>
          <MenuCard
            icon="Erro"
            title="Relatar um erro"
            description="Algo não funcionou como deveria."
            cor={BRAND.error}
            onPress={enviando ? undefined : relatarErro}
            indice={0}
            testID="suporte-erro"
          />
          <MenuCard
            icon="Raio"
            title="Enviar uma sugestão"
            description="Uma ideia para melhorar a plataforma."
            cor={BRAND.warning}
            onPress={enviando ? undefined : enviarSugestao}
            indice={1}
            testID="suporte-sugestao"
          />
          <MenuCard
            icon="Ajuda"
            title="Tirar uma dúvida"
            description="Não sei como fazer alguma coisa."
            onPress={enviando ? undefined : pedirAjuda}
            indice={2}
            testID="suporte-duvida"
          />
        </View>

        <View style={estilos.rodape}>
          <Text style={estilos.rodapeRotulo}>CONTATO DIRETO</Text>
          <Text style={estilos.rodapeValor} selectable>
            {EMAIL_SUPORTE}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: BRAND.background },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.xl,
    paddingBottom: ESPACO.xxl,
  },

  cabecalho: { alignItems: 'center', marginBottom: ESPACO.xxl },
  simbolo: {
    width: 72,
    height: 72,
    borderRadius: PLATFORM.radiusCard,
    backgroundColor: BRAND.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACO.lg,
  },
  titulo: {
    ...TIPOGRAFIA.titulo,
    textAlign: 'center',
  },
  legenda: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
    marginTop: ESPACO.sm,
  },

  lista: { gap: ESPACO.md },

  rodape: {
    alignItems: 'center',
    marginTop: ESPACO.xxl,
  },
  rodapeRotulo: TIPOGRAFIA.rotulo,
  rodapeValor: {
    ...TIPOGRAFIA.corpo,
    color: BRAND.primary,
    fontWeight: '600',
    marginTop: ESPACO.xs,
  },
});
