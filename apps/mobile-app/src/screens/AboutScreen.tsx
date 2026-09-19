import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { authService, APP_VERSION, WEB_VERSION } from '@jairo/core';

import Icon, { type NomeIcone } from '@/components/icon/Icon';
import BrandMark from '@/components/BrandMark';
import StatCard from '@/components/card/StatCard';
import { GESTOS_NATIVOS } from '@/lib/gestureRuntime';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE } from '@/constants/Spacing';

type Estado = 'verificando' | 'online' | 'offline';

/**
 * ℹ️ TELA: SOBRE — VERSÕES E DIAGNÓSTICO (PJODC v10)
 * Local: apps/mobile-app/src/screens/AboutScreen.tsx
 *
 * v9: [100% NATIVO — TELA]
 *
 * Aberta pelo cartão "Sobre" do Painel de Engenharia. Responde às perguntas que
 * um relatório de erro sempre exige e que ninguém consegue responder de cabeça:
 * qual versão está instalada, em que ambiente ela está rodando e se o banco
 * responde.
 *
 * 🩺 É UMA TELA DE DIAGNÓSTICO, NÃO UMA PÁGINA INSTITUCIONAL. A "sobre" com
 * missão e valores da empresa é a de `(auth)/about.tsx`, que o usuário comum
 * alcança pelo menu de ajuda. Esta é a do Desenvolvedor, e mostra o que ele
 * precisa para diagnosticar — as duas cabem no mesmo produto com nomes
 * parecidos porque atendem pessoas diferentes.
 *
 * ⚠️ `GESTOS_NATIVOS` É INFORMAÇÃO DE DIAGNÓSTICO DE PRIMEIRA ORDEM, e é o
 * principal motivo desta tela existir. O aplicativo roda em Expo Go E em
 * development build, e no Expo Go o `react-native-gesture-handler` não está
 * presente — os gestos ficam desligados e o `GestureRoot` vira um `View` comum
 * (ver `lib/gestureRuntime.ts`). Quando alguém relatar "o arrasto da folha não
 * funciona", esta linha diz na hora se é defeito ou se é o ambiente.
 *
 * 🔢 AS DUAS VERSÕES APARECEM JUNTAS de propósito. `APP_VERSION` e
 * `WEB_VERSION` saem do mesmo `packages/core/src/constants/versions.ts`, e ver
 * as duas lado a lado é o que denuncia um aplicativo empacotado com um Core
 * antigo — o caso em que a web já foi atualizada e o telefone não.
 */
export default function AboutScreen() {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [latencia, setLatencia] = useState<number | null>(null);

  const verificar = useCallback(async () => {
    try {
      const r = await authService.pingDatabase();
      setEstado(r.status === 'Online' ? 'online' : 'offline');
      setLatencia(r.latency);
    } catch {
      setEstado('offline');
      setLatencia(null);
    }
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const online = estado === 'online';

  return (
    <SafeAreaView style={estilos.raiz} edges={['bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <BrandMark />

        <View style={estilos.metricas}>
          <StatCard
            value={estado === 'verificando' ? '···' : online ? 'Online' : 'Offline'}
            label="Banco"
            icon="Banco"
            color={online ? BRAND.success : BRAND.error}
          />
          <StatCard
            value={latencia ? `${latencia}ms` : '—'}
            label="Latência"
            icon="Relogio"
            color={BRAND.primary}
          />
        </View>

        <Text style={estilos.tituloSecao}>Versões</Text>
        <View style={estilos.grupo}>
          <Linha icone="Raio" rotulo="Aplicativo" valor={APP_VERSION} />
          <Linha icone="Painel" rotulo="Painel web" valor={WEB_VERSION} ultima />
        </View>

        <Text style={estilos.tituloSecao}>Ambiente</Text>
        <View style={estilos.grupo}>
          <Linha
            icone="Configuracoes"
            rotulo="Plataforma"
            valor={`${Platform.OS} ${String(Platform.Version)}`}
          />
          <Linha
            icone="Modulos"
            rotulo="Runtime Expo"
            valor={Constants.expoConfig?.sdkVersion ?? '—'}
          />
          <Linha
            icone="Raio"
            rotulo="Gestos nativos"
            valor={GESTOS_NATIVOS ? 'Ativos' : 'Inativos (Expo Go)'}
          />
          <Linha
            icone="Escudo"
            rotulo="Cantos"
            valor={`${PLATFORM.radiusCard}pt · ${Platform.OS === 'ios' ? 'HIG' : 'Material 3'}`}
            ultima
          />
        </View>

        <Text style={estilos.nota}>
          © 2026. Todos os direitos reservados para Jairo Oliveira da Cunha.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Ver a nota sobre componentes no nível do módulo em `ProfileScreen.tsx`. */
function Linha({
  icone,
  rotulo,
  valor,
  ultima = false,
}: {
  icone: NomeIcone;
  rotulo: string;
  valor?: string | null;
  ultima?: boolean;
}) {
  return (
    <View style={[estilos.linha, ultima && estilos.linhaUltima]}>
      <Icon name={icone} size={ICONE.pequeno} color={BRAND.textFaint} strokeWidth={2} />
      <View style={estilos.linhaTextos}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor} numberOfLines={2}>
          {valor?.trim() || '—'}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: BRAND.background },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.xl,
    paddingBottom: ESPACO.xxl,
  },

  metricas: { flexDirection: 'row', gap: ESPACO.md, marginBottom: ESPACO.xl },

  tituloSecao: {
    ...TIPOGRAFIA.rotulo,
    marginBottom: ESPACO.sm,
    marginLeft: ESPACO.xs,
  },

  grupo: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    paddingHorizontal: ESPACO.lg,
    marginBottom: ESPACO.xl,
  },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    paddingVertical: ESPACO.md,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.divider,
  },
  linhaUltima: { borderBottomWidth: 0 },
  linhaTextos: { flex: 1 },
  rotulo: TIPOGRAFIA.dica,
  valor: {
    ...TIPOGRAFIA.corpo,
    fontWeight: '600',
    marginTop: 1,
  },

  nota: {
    ...TIPOGRAFIA.dica,
    textAlign: 'center',
    marginTop: ESPACO.sm,
  },
});
