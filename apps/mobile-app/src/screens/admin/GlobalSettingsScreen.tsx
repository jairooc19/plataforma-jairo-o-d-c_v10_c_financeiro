import React, { useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import type { GlobalSettings } from '@jairo/core';

import Input from '@/components/input/Input';
import Button from '@/components/button/Button';
import ColorField from './ColorField';
import {
  useGlobalSettingsScreen,
  CAMPOS_FUNDO,
  CAMPOS_TEXTO,
  ROTULO_COR,
  type CampoCor,
} from './useGlobalSettingsScreen';
import { useNativeActionSheet } from '@/hooks/useNativeActionSheet';
import { estilos } from './GlobalSettingsScreen.styles';
import { BRAND } from '@/constants/Colors';

/**
 * 🎨 TELA: AJUSTES GLOBAIS (WHITE-LABEL) — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/GlobalSettingsScreen.tsx
 *
 * Paridade com `apps/admin-web/src/app/dashboard/settings/page.tsx`: título do
 * sistema, e-mails de alerta, as sete cores (três de fundo, quatro de texto e
 * borda), salvar e restaurar padrões de fábrica.
 *
 * 🧠 O ESTADO E AS CHAMADAS ESTÃO NO `useGlobalSettingsScreen`; esta tela só
 * desenha e decide o que mostrar — regra de ouro do CLAUDE.md.
 *
 * ⚠️ RESTAURAR PADRÕES PERGUNTA ANTES, E GRAVA NA HORA. É a mesma decisão da web
 * (lá é um `window.confirm`), com a pergunta feita pelo menu do sistema. Gravar
 * direto sem perguntar seria apagar a identidade visual inteira com um toque; e
 * restaurar só na tela, sem gravar, faria o botão mentir sobre o que fez.
 *
 * ⚠️ O QUE SE VÊ AQUI NÃO REPINTA O APP NA HORA. A paleta é lida no boot pelo
 * `app/_layout.tsx` e distribuída pelo `ThemeAnimationContext`; esta tela grava
 * no banco, e a mudança aparece na próxima abertura — ou na próxima leitura de
 * quem consultar `global_settings`. A web tem exatamente o mesmo comportamento.
 */
export default function GlobalSettingsScreen() {
  const { mostrar } = useNativeActionSheet();
  const { ajustes, carregando, salvando, erro, sucesso, alterarCampo, salvar, restaurarPadroes } =
    useGlobalSettingsScreen();

  const confirmarRestauracao = useCallback(() => {
    mostrar(
      [{ titulo: 'Restaurar padrões de fábrica', destrutiva: true, aoTocar: restaurarPadroes }],
      {
        titulo: 'Voltar ao padrão de fábrica?',
        mensagem: 'Título, e-mails e as sete cores voltam aos valores originais. Isto grava agora.',
      }
    );
  }, [mostrar, restaurarPadroes]);

  const mudar = useCallback(
    (campo: keyof GlobalSettings) => (valor: string) => alterarCampo(campo, valor),
    [alterarCampo]
  );

  if (carregando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  if (!ajustes) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.avisoTexto}>{erro ?? 'Configurações indisponíveis.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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

      <Text style={estilos.tituloSecao}>Identidade do sistema</Text>
      <View style={estilos.cartao}>
        <Input
          label="Título oficial"
          value={ajustes.system_title}
          onChangeText={mudar('system_title')}
          placeholder="PLATAFORMA JAIRO O D C"
          containerStyle={estilos.primeiroCampo}
          testID="campo-titulo-sistema"
        />
      </View>

      <Text style={estilos.tituloSecao}>Central de notificações</Text>
      <View style={estilos.cartao}>
        <Text style={estilos.explicacao}>
          E-mails que recebem alertas automáticos. Separe por vírgula.
        </Text>
        <Input
          value={ajustes.admin_emails}
          onChangeText={mudar('admin_emails')}
          placeholder="admin@empresa.com, financeiro@empresa.com"
          autoCapitalize="none"
          keyboardType="email-address"
          icon="Email"
          containerStyle={estilos.primeiroCampo}
          accessibilityLabel="E-mails de alerta"
          testID="campo-emails-admin"
        />
      </View>

      <Text style={estilos.tituloSecao}>Fundos</Text>
      <View style={estilos.cartao}>
        {CAMPOS_FUNDO.map((campo: CampoCor) => (
          <ColorField
            key={campo}
            rotulo={ROTULO_COR[campo]}
            valor={ajustes[campo]}
            onChange={mudar(campo)}
          />
        ))}
      </View>

      <Text style={estilos.tituloSecao}>Textos e elementos</Text>
      <View style={estilos.cartao}>
        {CAMPOS_TEXTO.map((campo: CampoCor) => (
          <ColorField
            key={campo}
            rotulo={ROTULO_COR[campo]}
            valor={ajustes[campo]}
            onChange={mudar(campo)}
          />
        ))}
      </View>

      <Button
        title="Salvar parâmetros"
        variant="primary"
        size="large"
        icon="Salvar"
        loading={salvando}
        onPress={salvar}
        testID="btn-salvar-ajustes"
      />

      <Button
        title="Restaurar padrões"
        variant="ghost"
        size="large"
        icon="Restaurar"
        disabled={salvando}
        onPress={confirmarRestauracao}
        style={estilos.espacado}
        testID="btn-restaurar-padroes"
      />
    </ScrollView>
  );
}
