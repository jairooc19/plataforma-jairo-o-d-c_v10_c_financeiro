import React, { memo, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Icon from '@/components/icon/Icon';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MenuCard from '@/components/card/MenuCard';
import StatCard from '@/components/card/StatCard';
import { useNativeActionSheet } from '@/hooks/useNativeActionSheet';
import { logoutService } from '@/services/logoutService';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE } from '@/constants/Spacing';
import type { SessionUser, TenantMemberContext } from '@/types';

export interface ClientDashboardProps {
  sessionData: SessionUser;
  tenantData: TenantMemberContext | null;
  /** Título do white-label, lido de `global_settings` pelo roteador de dashboard. */
  systemTitle: string;
}

/**
 * 🏢 PAINEL OPERACIONAL — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/client/ClientDashboard.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Cabeçalho com saudação e saída no canto
 * - Métricas em `StatCard`, opções em `MenuCard`
 * - Confirmação de saída pelo menu do sistema, não por `Alert` escrito à mão
 *
 * A tela de quem entrou por uma empresa: Proprietário ou Dependente.
 *
 * 📦 A GRADE DE MÓDULOS ESTÁ VAZIA POR DESIGN, não por falta. Os três módulos de
 * negócio foram removidos da plataforma em 2026-08-30 e só o CORE está ativo. O
 * estado vazio existe para dizer isso, em vez de mostrar uma área em branco que
 * parece defeito.
 *
 * 🚪 A SAÍDA MUDOU DE LUGAR E DE MECANISMO. Era um botão vermelho de largura
 * total no fim da rolagem, disparando um `Alert.alert` escrito aqui dentro.
 * Agora é o ícone do cabeçalho e a pergunta vem de `useNativeActionSheet` — que
 * é `UIAlertController` no iOS e `AlertDialog` no Android. O CLAUDE.md proíbe
 * action sheets escritos à mão exatamente para que as confirmações do app não
 * divirjam entre si.
 *
 * ⚠️ O `SafeAreaView` VEM DE `react-native-safe-area-context` — o do
 * `react-native` está obsoleto e não faz nada no Android, onde este app roda com
 * `edgeToEdgeEnabled: true` e portanto desenha sob as barras do sistema.
 *
 * 🔽 `edges={['top']}`, NÃO `['top','bottom']`: a base desta tela é a barra de
 * abas, que já respeita o inset inferior por conta própria. Reservar o espaço
 * duas vezes deixaria uma faixa vazia entre o conteúdo e as abas.
 */
function ClientDashboard({ sessionData, tenantData, systemTitle }: ClientDashboardProps) {
  const router = useRouter();
  const { mostrar } = useNativeActionSheet();

  const handleLogout = useCallback(() => {
    mostrar(
      [
        {
          titulo: 'Sair da conta',
          destrutiva: true,
          aoTocar: async () => {
            // Uma chamada só: o logoutService encerra as duas metades da sessão
            // (supabase-js em memória + cofre do aparelho). Chamar `signOut` sem
            // limpar o disco deixaria a sessão gravada, e o boot seguinte a
            // restauraria — o usuário reapareceria logado depois de sair.
            await logoutService.logout();
            router.replace('/(auth)');
          },
        },
      ],
      { titulo: 'Encerrar a sessão?', mensagem: 'Você precisará entrar novamente.' }
    );
  }, [mostrar, router]);

  const ehProprietario = tenantData?.role === 'OWNER';
  const empresa = tenantData?.tenants?.tenant_name || 'Meu painel';
  const modulos = tenantData?.allowed_modules?.length ?? 0;

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader
          nome={nomeDeTratamento(sessionData.email)}
          detalhe={sessionData.email}
          onSair={handleLogout}
        />

        {/*
          🏢 O CONTEXTO ATIVO EM UM CARTÃO SÓ. Numa plataforma multi-empresa, a
          pergunta "em qual empresa eu estou agora?" precede qualquer outra —
          uma ação disparada na empresa errada é um estrago silencioso. Por isso
          o nome da empresa é o maior texto depois da saudação.
        */}
        <View style={estilos.cartaoContexto}>
          <View style={estilos.contextoTopo}>
            <Text style={estilos.rotuloContexto}>ATUANDO EM</Text>

            <View style={estilos.selo}>
              <Icon
                name={ehProprietario ? 'Usuario' : 'Equipe'}
                size={ICONE.mini}
                color={BRAND.primary}
                strokeWidth={2.2}
              />
              <Text style={estilos.seloTexto}>
                {ehProprietario ? 'Proprietário' : 'Colaborador'}
              </Text>
            </View>
          </View>

          <Text style={estilos.empresa} numberOfLines={2}>
            {empresa}
          </Text>
          <Text style={estilos.sistema} numberOfLines={1}>
            {systemTitle}
          </Text>
        </View>

        {/*
          📊 DUAS MÉTRICAS, E NÃO QUATRO. Uma faixa de métricas só funciona
          enquanto cada número responde a uma pergunta real; encher a linha com
          contadores inventados ("100% online", "0 alertas") é o que faz um
          painel parecer decoração de demonstração.
        */}
        <View style={estilos.metricas}>
          <StatCard value={String(modulos)} label="Módulos" icon="Modulos" />
          <StatCard
            value={ehProprietario ? 'Total' : 'Parcial'}
            label="Acesso"
            icon="EscudoOk"
            color={BRAND.success}
          />
        </View>

        <Text style={estilos.tituloSecao}>Módulos operacionais</Text>

        {modulos === 0 ? (
          <View style={estilos.vazio}>
            <View style={estilos.vazioIcone}>
              <Icon name="Modulos" size={ICONE.grande} color={BRAND.textFaint} strokeWidth={1.5} />
            </View>
            <Text style={estilos.vazioTitulo}>Nenhum módulo ativo</Text>
            <Text style={estilos.vazioTexto}>
              Aguardando habilitação de recursos pelo Desenvolvedor.
            </Text>
          </View>
        ) : (
          <View style={estilos.lista}>
            {tenantData?.allowed_modules?.map((modulo, i) => (
              /*
                Os módulos vêm do banco mas ainda não têm tela no mobile — a
                plataforma removeu os três de negócio em 2026-08-30. Listá-los
                como `emBreve` é honesto: diz que o acesso existe e que a tela
                ainda não.
              */
              <MenuCard
                key={modulo}
                icon="Modulos"
                title={modulo}
                description="Disponível no painel web."
                emBreve
                indice={i}
              />
            ))}
          </View>
        )}

        {/* Respiro final: o conteúdo não encosta no rodapé institucional. */}
        <View style={estilos.espacador} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 👤 UM NOME APRESENTÁVEL A PARTIR DO E-MAIL.
 *
 * ⚠️ ESTA TELA NÃO TEM O NOME DO USUÁRIO. A sessão que o `(tabs)/index.tsx`
 * monta carrega `email`, `userId`, `tenantId` e `role` — `full_name` mora em
 * `public.users` e custaria uma consulta a mais só para escrever a saudação.
 * Então derivamos: "jairo.cunha@exemplo.com" vira "Jairo".
 *
 * 🎯 É UMA APROXIMAÇÃO, E ASSUMIDAMENTE. Um e-mail como "contato@empresa.com"
 * produz "Contato", que não é o nome de ninguém — mas continua sendo uma
 * saudação legível, e melhor do que estampar o endereço inteiro no maior corpo
 * de texto da tela. Quem quiser o nome real busca o perfil; a aba "Perfil" já
 * o faz, e é lá que ele importa.
 */
function nomeDeTratamento(email?: string | null): string {
  const local = (email ?? '').split('@')[0] ?? '';
  // Separadores comuns em e-mail corporativo viram fronteira de palavra.
  const primeiro = local.split(/[._-]/)[0] ?? '';
  if (!primeiro) return '';
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.lg,
  },

  cartaoContexto: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginBottom: ESPACO.md,
  },
  contextoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACO.sm,
  },
  rotuloContexto: TIPOGRAFIA.rotulo,

  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.xs,
    backgroundColor: BRAND.primarySoft,
    paddingHorizontal: ESPACO.sm,
    paddingVertical: ESPACO.xs,
    borderRadius: PLATFORM.radiusField,
  },
  seloTexto: {
    ...TIPOGRAFIA.dica,
    color: BRAND.primary,
    fontWeight: '600',
  },

  empresa: {
    ...TIPOGRAFIA.titulo,
    marginTop: ESPACO.sm,
  },
  sistema: {
    ...TIPOGRAFIA.dica,
    marginTop: ESPACO.xs,
  },

  metricas: {
    flexDirection: 'row',
    gap: ESPACO.md,
    marginBottom: ESPACO.xl,
  },

  tituloSecao: {
    ...TIPOGRAFIA.secao,
    marginBottom: ESPACO.md,
  },

  lista: { gap: ESPACO.md },

  /**
   * ⚠️ SEM BORDA TRACEJADA. O estado vazio a usava, e borda tracejada é a
   * convenção de "solte um arquivo aqui" — um convite a agir que este estado
   * não pode cumprir, porque quem habilita módulos é o Desenvolvedor, não o
   * usuário que está lendo.
   */
  vazio: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    paddingVertical: ESPACO.xxl,
    paddingHorizontal: ESPACO.xl,
    alignItems: 'center',
  },
  vazioIcone: {
    width: 72,
    height: 72,
    borderRadius: PLATFORM.radiusCard,
    backgroundColor: BRAND.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACO.lg,
  },
  vazioTitulo: TIPOGRAFIA.subtitulo,
  vazioTexto: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
    marginTop: ESPACO.sm,
  },

  espacador: { height: ESPACO.xxl },
});

export default memo(ClientDashboard);
