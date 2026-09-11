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
 * 🔧 O DESENVOLVEDOR NÃO TEM USUÁRIO NO SUPABASE. A credencial dele é fixa no
 * Core (`authService.developerSignIn`) e nunca passa pelo GoTrue — não existe
 * linha em `auth.users` nem sessão remota para o `getUser()` achar. Exigir
 * `user` de todo mundo expulsava o Painel de Engenharia de volta à guarita no
 * instante seguinte ao login, num laço.
 *
 * 🏷️ `systemTitle` É REPASSADO AOS DOIS DASHBOARDS, e antes desta refatoração
 * não era: os dois componentes recebiam a prop mas nenhum a declarava, então o
 * TypeScript reclamava e o título buscado do banco era descartado em silêncio.
 * Os dois painéis mostravam um rótulo fixo enquanto o white-label do banco era
 * lido a cada abertura e jogado fora.
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

      // 2. Sessão e utilizador.
      const { tenantId, role } = await storageService.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const papel = (role as UserRole | null) ?? null;
      const ehDesenvolvedor = papel === 'DEVELOPER';

      if (!ehDesenvolvedor && (!user || !tenantId)) {
        router.replace('/(auth)');
        return;
      }

      setSessionData({
        tenantId,
        role: papel,
        userId: user?.id ?? null,
        email: user?.email ?? null,
      });

      // 3. Contexto da empresa (módulos e permissões).
      // `user` está no teste porque o guarda acima só garante a sessão para
      // quem NÃO é desenvolvedor — o TypeScript não deduz isso sozinho.
      if (!ehDesenvolvedor && tenantId && user) {
        const memberContext = await authService.getTenantMemberContext(tenantId, user.id);
        setContextData(memberContext as TenantMemberContext);
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
   * 📜 O RODAPÉ INSTITUCIONAL ENTRA AQUI, e não mais no `_layout.tsx`. A barra
   * de abas nativa é dona da borda inferior da tela e não empresta o espaço de
   * baixo dela — então o rodapé passou a fechar o CONTEÚDO da aba, fixo logo
   * acima da barra. Ver o cabeçalho de `components/InstitutionalFooter.tsx`.
   *
   * O painel fica em `flex: 1` e o rodapé toma só a altura de que precisa, de
   * modo que ele permanece visível sem depender de o usuário rolar até o fim.
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
