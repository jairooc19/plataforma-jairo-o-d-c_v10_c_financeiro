import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 🔵 CÉREBRO ÚNICO: Serviços e Conexão
import { authService, supabase, settingsService } from '@jairo/core';
import { storageService } from '@/services/storageService';
import { BRAND } from '@/constants/Colors';
import InstitutionalFooter from '@/components/InstitutionalFooter';
import type { SessionUser, TenantMemberContext, UserRole } from '@/types';

// 🚀 IMPORTAÇÃO DOS DASHBOARDS MODULARES
import ClientDashboard from '@/components/client/ClientDashboard';
import DeveloperDashboard from '@/components/developer/DeveloperDashboard';

const SESSAO_VAZIA: SessionUser = { tenantId: null, role: null, userId: null, email: null };

/**
 * 🎭 MAESTRO DE VISÃO — ROTEADOR DE DASHBOARD (PJODC v10)
 * Local: apps/mobile-app/app/(tabs)/index.tsx
 *
 * Decide QUEM está entrando e entrega a tela correspondente: Painel de
 * Engenharia para o Desenvolvedor, painel operacional para todos os demais.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: O DESENVOLVEDOR TEM SESSÃO SUPABASE
 * ===========================================================================
 * Até a v9 ele NÃO tinha: a credencial era fixa no Core e nunca passava pelo
 * serviço de autenticação, então `getUser()` voltava vazio e esta tela precisava
 * de uma exceção ("se o papel no cofre for DEVELOPER, deixe passar sem usuário").
 * Aquela exceção era também o buraco: bastava gravar `DEVELOPER` no cofre.
 *
 * Agora todo mundo tem sessão, e a pergunta "é o Desenvolvedor?" vai ao banco
 * (`authService.ehDesenvolvedor()` → `is_superuser()`). Sem sessão, ninguém
 * entra — nem ele.
 */
export default function TabIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contextData, setContextData] = useState<TenantMemberContext | null>(null);
  const [systemTitle, setSystemTitle] = useState('CARREGANDO...');
  const [sessionData, setSessionData] = useState<SessionUser>(SESSAO_VAZIA);

  const initDashboard = useCallback(async () => {
    try {
      // 1. Identidade visual (título da plataforma, vindo do white-label).
      const settings = await settingsService.getGlobalSettings();
      if (settings?.system_title) setSystemTitle(settings.system_title);

      // 2. Sessão e utilizador. Agora vale para TODOS os papéis.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)');
        return;
      }

      const { tenantId } = await storageService.getSession();

      // 3. O papel vem do banco, não do cofre do aparelho.
      const ehDesenvolvedor = await authService.ehDesenvolvedor();
      const papel: UserRole | null = ehDesenvolvedor ? 'DEVELOPER' : null;

      if (!ehDesenvolvedor && !tenantId) {
        // Usuário comum sem empresa escolhida: volta à guarita, que faz a triagem.
        router.replace('/(auth)');
        return;
      }

      setSessionData({
        tenantId,
        role: papel,
        userId: user.id,
        email: user.email ?? null,
      });

      // 4. Contexto da empresa (módulos e permissões) — só para quem opera.
      if (!ehDesenvolvedor && tenantId) {
        const memberContext = await authService.getTenantMemberContext(tenantId, user.id);
        setContextData(memberContext as TenantMemberContext | null);
      }
    } catch (error) {
      console.error('[MAESTRO-DASHBOARD] Erro de sincronização:', error);
      router.replace('/(auth)');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={BRAND.primary} />
      </SafeAreaView>
    );
  }

  /**
   * 📜 O RODAPÉ INSTITUCIONAL ENTRA AQUI, e não no `_layout.tsx`. A barra de
   * abas nativa é dona da borda inferior da tela e não empresta o espaço de
   * baixo dela.
   */
  if (sessionData.role === 'DEVELOPER') {
    return (
      <View style={styles.raiz}>
        <DeveloperDashboard session={sessionData} systemTitle={systemTitle} />
        <InstitutionalFooter escuro />
      </View>
    );
  }

  return (
    <View style={styles.raiz}>
      <ClientDashboard
        sessionData={sessionData}
        tenantData={contextData}
        systemTitle={systemTitle}
      />
      <InstitutionalFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.background,
  },
});
