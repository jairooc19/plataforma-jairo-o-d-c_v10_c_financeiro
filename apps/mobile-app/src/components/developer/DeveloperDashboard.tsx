import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

// 🔵 CORE: Usando a inteligência centralizada
import { authService } from '@jairo/core';

import Icon from '@/components/icon/Icon';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MenuCard from '@/components/card/MenuCard';
import StatCard from '@/components/card/StatCard';
import { useNativeActionSheet } from '@/hooks/useNativeActionSheet';
import { logoutService } from '@/services/logoutService';
import { BRAND_DARK, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE, TOQUE, RAIO, DURACAO } from '@/constants/Spacing';
import type { SessionUser } from '@/types';

export interface DeveloperDashboardProps {
  session: SessionUser;
  /** Título do white-label, lido de `global_settings`. */
  systemTitle: string;
}

type StatusBanco = 'Verificando...' | 'Online' | 'Offline';

/**
 * 🛠️ PAINEL DE ENGENHARIA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/developer/DeveloperDashboard.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Métricas de infraestrutura em `StatCard`, não em linhas rótulo/valor
 * - Cinco `MenuCard` no lugar dos três atalhos quadrados
 * - Ícone de recarga que gira de verdade enquanto a consulta acontece
 *
 * A tela do Desenvolvedor Master. Não passa pelo Supabase Auth: a credencial é
 * fixa no Core (`authService.developerSignIn`) e o contexto é gravado só no
 * cofre do aparelho.
 *
 * 🌑 É A ÚNICA TELA DE FUNDO ESCURO DA PLATAFORMA, e isso é identidade, não modo
 * escuro: o painel técnico se distingue à primeira vista do painel operacional.
 * Ver o cabeçalho de `constants/Colors.ts` sobre por que `BRAND_DARK` não
 * significa "tema escuro do app".
 *
 * 🗂️ OS CINCO CARTÕES SÃO O MAPA DO PAINEL, e na v9 quatro deles têm destino.
 * "Central de Comandos" e "Ajustes Globais" fecham a PARIDADE COM O PAINEL DA
 * WEB — são exatamente as duas ferramentas que o `DeveloperDashboardView` do
 * `admin-web` oferece (`/dashboard/tenants` e `/dashboard/settings`). Antes elas
 * estavam aqui como `emBreve`, junto de mais duas que se sobrepunham
 * ("Ferramentas do Sistema" e "Configurações" descreviam a mesma coisa que
 * "Ajustes Globais"): as duas saíram, e o painel passou de seis cartões vagos
 * para cinco que dizem a verdade.
 *
 * ⏳ "Analytics" CONTINUA `emBreve`, e continua VISÍVEL. Decisão do dono do
 * projeto (2026-09-06): esconder o que não existe faria o painel encolher e
 * crescer a cada versão; deixá-lo tocável abrindo tela vazia é o que faz o
 * usuário achar que o app travou. A web também não tem essa ferramenta.
 *
 * 🔐 AS DUAS TELAS NOVAS NÃO FALAM COM O SUPABASE — falam com as rotas
 * `/api/admin/*` do `admin-web`, porque as operações exigem a service role e o
 * Desenvolvedor do mobile não tem sessão Supabase nenhuma. Ver o cabeçalho de
 * `packages/core/src/services/platform/adminApiService.ts`.
 *
 * ⚙️ O ÍCONE DE RECARGA GIRA ENQUANTO A CONSULTA ACONTECE, e antes ele apenas
 * ficava meio transparente. Opacidade não comunica progresso — comunica
 * desabilitado, que é a leitura oposta. A rotação roda no Reanimated, portanto
 * na thread de UI: ela continua fluida enquanto o JavaScript espera a resposta
 * do banco, que é exatamente o instante em que o indicador precisa se mexer.
 *
 * ⚠️ `cancelAnimation` NA LIMPEZA NÃO É OPCIONAL. `withRepeat(..., -1)` é um
 * laço infinito vivendo na thread de UI; sem cancelá-lo ao desmontar, ele
 * continua girando um nó que não existe mais — e o Reanimated não recolhe isso
 * sozinho.
 *
 * 🌑 OS CARTÕES RECEBEM `escuro` COMO PROP, e não um `style` com a cor de fundo.
 * Sobrescrever só o `backgroundColor` de fora pintaria a superfície e deixaria
 * título e descrição nas cores claras que o `MenuCard` declara internamente —
 * texto quase preto sobre superfície quase preta. Em React Native a cor de texto
 * não se herda do pai: cada `<Text>` resolve a sua, e só quem está dentro do
 * componente as alcança. O mesmo vale para o `StatCard` e o `DashboardHeader`.
 */
function DeveloperDashboard({ session, systemTitle }: DeveloperDashboardProps) {
  const router = useRouter();
  const { mostrar } = useNativeActionSheet();

  const [dbStatus, setDbStatus] = useState<StatusBanco>('Verificando...');
  const [latency, setLatency] = useState<number | null>(null);
  const [loadingPing, setLoadingPing] = useState(false);

  const giro = useSharedValue(0);

  const handlePing = useCallback(async () => {
    setLoadingPing(true);
    try {
      const result = await authService.pingDatabase();
      setDbStatus(result.status as StatusBanco);
      setLatency(result.latency);
    } catch {
      setDbStatus('Offline');
      setLatency(null);
    } finally {
      setLoadingPing(false);
    }
  }, []);

  useEffect(() => {
    handlePing();
  }, [handlePing]);

  /** Liga e desliga o giro conforme a consulta, e o cancela ao desmontar. */
  useEffect(() => {
    if (loadingPing) {
      giro.value = 0;
      giro.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(giro);
      giro.value = withTiming(0, { duration: DURACAO.instantanea });
    }

    return () => cancelAnimation(giro);
  }, [loadingPing, giro]);

  const estiloGiro = useAnimatedStyle(() => ({
    transform: [{ rotate: `${giro.value}deg` }],
  }));

  const handleLogout = useCallback(() => {
    mostrar(
      [
        {
          titulo: 'Sair do modo desenvolvedor',
          destrutiva: true,
          aoTocar: async () => {
            // Ver a nota em ClientDashboard: as duas metades saem juntas.
            await logoutService.logout();
            router.replace('/(auth)');
          },
        },
      ],
      { titulo: 'Encerrar o acesso técnico?', mensagem: 'Você precisará entrar novamente.' }
    );
  }, [mostrar, router]);

  const irParaSobre = useCallback(() => router.push('/sobre'), [router]);
  const irParaSuporte = useCallback(() => router.push('/suporte'), [router]);
  const irParaComandos = useCallback(() => router.push('/central-comandos'), [router]);
  const irParaAjustes = useCallback(() => router.push('/ajustes-globais'), [router]);

  const online = dbStatus === 'Online';
  const corStatus = online ? BRAND_DARK.online : BRAND_DARK.offline;

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <DashboardHeader
          nome="Desenvolvedor"
          detalhe={systemTitle}
          onSair={handleLogout}
          escuro
        />

        {/* ─── Estado da infraestrutura ─────────────────────────────────── */}
        <View style={estilos.blocoInfra}>
          <View style={estilos.infraTopo}>
            <View style={estilos.infraTitulo}>
              <View style={[estilos.ponto, { backgroundColor: corStatus }]} />
              <Text style={estilos.infraRotulo}>INFRAESTRUTURA</Text>
            </View>

            <Pressable
              onPress={handlePing}
              disabled={loadingPing}
              style={estilos.botaoPing}
              hitSlop={8}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Verificar novamente o estado do banco de dados"
              accessibilityState={{ busy: loadingPing }}
              testID="btn-ping"
            >
              <Animated.View style={estiloGiro}>
                <Icon
                  name="Recarregar"
                  size={ICONE.pequeno}
                  color={BRAND_DARK.accent}
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>
          </View>

          <View style={estilos.metricas}>
            <StatCard
              value={dbStatus === 'Verificando...' ? '···' : dbStatus}
              label="Banco"
              icon="Banco"
              color={corStatus}
              escuro
            />
            <StatCard
              value={latency ? `${latency}ms` : '—'}
              label="Latência"
              icon="Relogio"
              color={BRAND_DARK.accent}
              escuro
            />
          </View>

          <View style={estilos.metricas}>
            <StatCard
              value="Ativo"
              label="RLS"
              icon="EscudoOk"
              color={BRAND_DARK.online}
              escuro
            />
            <StatCard
              value={session.role ?? '—'}
              label="Sessão"
              icon="Escudo"
              escuro
            />
          </View>
        </View>

        {/* ─── Ferramentas ──────────────────────────────────────────────── */}
        <Text style={estilos.tituloSecao}>Ferramentas</Text>

        <View style={estilos.lista}>
          <MenuCard
            icon="Empresa"
            title="Central de Comandos"
            description="Triagem de usuários e gestão de empresas."
            cor={BRAND_DARK.accent}
            onPress={irParaComandos}
            indice={0}
            escuro
            testID="menu-comandos"
          />
          <MenuCard
            icon="Paleta"
            title="Ajustes Globais"
            description="Cores do white-label e textos do sistema."
            cor={BRAND_DARK.accent}
            onPress={irParaAjustes}
            indice={1}
            escuro
            testID="menu-ajustes"
          />
          <MenuCard
            icon="Painel"
            title="Analytics"
            description="Ver métricas e telemetria."
            cor={BRAND_DARK.accent}
            emBreve
            indice={2}
            escuro
            testID="menu-analytics"
          />
          <MenuCard
            icon="Suporte"
            title="Suporte"
            description="Enviar feedback ou relatar um erro."
            cor={BRAND_DARK.accent}
            onPress={irParaSuporte}
            indice={3}
            escuro
            testID="menu-suporte"
          />
          <MenuCard
            icon="Informacao"
            title="Sobre"
            description="Versões, ambiente e diagnóstico."
            cor={BRAND_DARK.accent}
            onPress={irParaSobre}
            indice={4}
            escuro
            testID="menu-sobre"
          />
        </View>

        <View style={estilos.espacador} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_DARK.background },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.lg,
  },

  blocoInfra: {
    backgroundColor: BRAND_DARK.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    gap: ESPACO.md,
    marginBottom: ESPACO.xl,
  },
  infraTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infraTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
  },
  infraRotulo: {
    ...TIPOGRAFIA.rotulo,
    color: BRAND_DARK.textMuted,
  },
  ponto: { width: 8, height: 8, borderRadius: RAIO.circulo },

  botaoPing: {
    width: TOQUE.pequeno,
    height: TOQUE.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricas: { flexDirection: 'row', gap: ESPACO.md },

  tituloSecao: {
    ...TIPOGRAFIA.secao,
    color: BRAND_DARK.text,
    marginBottom: ESPACO.md,
  },

  lista: { gap: ESPACO.md },

  espacador: { height: ESPACO.xxl },
});

export default memo(DeveloperDashboard);
