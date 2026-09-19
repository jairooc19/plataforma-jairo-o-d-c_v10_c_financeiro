import React, { memo, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { modulosDoMembro, type ManifestoDeModulo } from '@jairo/core';

import Icon from '@/components/icon/Icon';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MenuCard from '@/components/card/MenuCard';
import { useNativeActionSheet } from '@/hooks/useNativeActionSheet';
import { logoutService } from '@/services/logoutService';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE } from '@/constants/Spacing';
import type { SessionUser, TenantMemberContext, TenantSummary } from '@/types';

export interface ClientDashboardProps {
  sessionData: SessionUser;
  tenantData: TenantMemberContext | null;
  /**
   * ⚠️ `systemTitle` SAIU DAQUI EM 19/09/2026. Ele era desenhado sob o nome da
   * empresa, no cartão de contexto que foi substituído — e continua à vista, no
   * CABEÇALHO das abas, ao lado da logo (ver `app/_layout.tsx`). Mantê-lo como
   * prop sem consumidor deixaria o roteador do painel calculando um dado que
   * ninguém lê.
   */
  /**
   * Os ids dos módulos que ESTE membro pode abrir nesta empresa, já cruzados pelo
   * banco (`modulos_do_membro`). Ver a nota no `(tabs)/index.tsx`.
   */
  modulosPermitidos: string[];
}

/**
 * 🏢 PAINEL OPERACIONAL — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/client/ClientDashboard.tsx
 *
 * A tela de quem entrou por uma empresa: Proprietário ou Dependente.
 *
 * 📦 A GRADE DE MÓDULOS DEIXOU DE ESTAR VAZIA EM 19/09/2026 (degrau 08): o
 * primeiro módulo chegou ao aplicativo. O estado vazio continua, para o caso de
 * uma empresa sem nada contratado.
 *
 * ===========================================================================
 * ⚠️ CORRIGIDO EM 19/09/2026 — ESTE ARQUIVO LIA A COLUNA ERRADA
 * ===========================================================================
 * Ele lia `tenantData.allowed_modules`, que é a chave que o Proprietário entrega
 * à EQUIPE dele — para o próprio dono da empresa ela está vazia. Resultado: com
 * um módulo contratado, o Proprietário lia "Nenhum módulo ativo", sem erro e sem
 * pista. Agora a lista vem de `modulos_do_membro()`, que trata os dois casos.
 *
 * E os cartões passaram a vir dos MANIFESTOS: nome e descrição reais em vez do id
 * cru ("financeiro"), e o toque abre a `rotaMobile` de quem tiver uma.
 *
 * ⚠️ O `SafeAreaView` VEM DE `react-native-safe-area-context` — o do
 * `react-native` está obsoleto e não faz nada no Android.
 *
 * 🔽 `edges={['top']}`, NÃO `['top','bottom']`: a base desta tela é a barra de
 * abas, que já respeita o inset inferior por conta própria.
 */
function ClientDashboard({
  sessionData,
  tenantData,
  modulosPermitidos,
}: ClientDashboardProps) {
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
            // (supabase-js em memória + cofre do aparelho).
            await logoutService.logout();
            router.replace('/(auth)');
          },
        },
      ],
      { titulo: 'Encerrar a sessão?', mensagem: 'Você precisará entrar novamente.' }
    );
  }, [mostrar, router]);

  /**
   * 🧩 ABRIR UM MÓDULO.
   *
   * ⚠️ O `as never` É O ÚNICO PONTO DE CONVERSÃO DE ROTA DO APLICATIVO, e ele está
   * aqui de propósito, com este comentário ao lado. O `typedRoutes` do Expo Router
   * gera a lista das rotas existentes e exige que o destino seja uma delas; o que
   * chega aqui é `string`, porque vem do MANIFESTO — que é dado, não literal.
   *
   * A proibição do `CLAUDE.md` contra "contornar rota nova com `as Href`" continua
   * valendo e é outra coisa: ela proíbe calar o erro quando a rota **não existe**.
   * Aqui a rota existe (`app/financeiro/`, do módulo) — o que o TypeScript não tem
   * como saber é que a string é ela. Se um dia um manifesto declarar uma
   * `rotaMobile` sem pasta correspondente, o sintoma será o "Endereço não
   * encontrado" do Expo Router, e a culpa é do manifesto, não deste cast.
   */
  const abrirModulo = useCallback(
    (modulo: ManifestoDeModulo) => {
      if (!modulo.rotaMobile) return;
      router.push(modulo.rotaMobile as never);
    },
    [router],
  );

  /**
   * ⚠️ O PAPEL NÃO APARECE MAIS NESTA TELA (19/09/2026) — nem como selo, nem como
   * métrica. Quem precisa dele é a permissão, e ela mora no banco: `fin_pode()`
   * dá tudo ao OWNER sem perguntar à interface. Mostrar o papel era informação
   * verdadeira e sem utilidade para quem lê.
   */
  const empresa = nomeDaEmpresa(tenantData) || 'Meu painel';
  const modulos = modulosDoMembro(modulosPermitidos);

  return (
    <SafeAreaView style={estilos.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader onSair={handleLogout} mostrarSaudacao={false} />

        {/*
          🏢 O CONTEXTO ATIVO EM UM CARTÃO SÓ. Numa plataforma multi-empresa, a
          pergunta "em qual empresa eu estou agora?" precede qualquer outra —
          uma ação disparada na empresa errada é um estrago silencioso.
        */}
        <View style={estilos.cartaoContexto}>
          <Text style={estilos.linhaContexto} numberOfLines={2}>
            <Text style={estilos.rotuloContexto}>LOGADO COM: </Text>
            {sessionData.email ?? '—'}
          </Text>

          <Text style={[estilos.linhaContexto, estilos.linhaSegunda]} numberOfLines={2}>
            <Text style={estilos.rotuloContexto}>ATUANDO PARA: </Text>
            {empresa}
          </Text>
        </View>

        {/*
          🗓️ 19/09/2026 — SAÍRAM DAQUI, POR PEDIDO DO DONO DO PROJETO:
            • a faixa "MÓDULOS 1 · ACESSO Total";
            • o título "Módulos operacionais".

          ⚠️ E A REMOÇÃO TEM RAZÃO DE SER, não foi só gosto: as duas métricas
          respondiam perguntas que a própria tela logo abaixo já responde. "Módulos:
          1" fica evidente ao ver um cartão; "Acesso: Total" repete o que o papel já
          diz. Número que só confirma o que está à vista rouba a linha de quem tem
          algo a dizer.
        */}
        {modulos.length === 0 ? (
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
            {modulos.map((modulo, i) => (
              /*
                🧩 UM CARTÃO POR MANIFESTO — e note o que este arquivo NÃO tem: o
                nome de nenhum módulo. Ele recebe ids do banco, pede os manifestos
                ao registro do Core e desenha. Plugar o décimo módulo não vai
                exigir tocar aqui.

                ⚠️ QUEM TEM `rotaMobile` ABRE; QUEM NÃO TEM FICA "EM BREVE". A
                ausência do campo é a única forma de um módulo dizer "eu ainda não
                existo no telefone" — e sem ela o cartão levaria a pessoa ao
                "Endereço não encontrado", que se lê como aplicativo quebrado.
              */
              <MenuCard
                key={modulo.id}
                icon="Modulos"
                title={modulo.nome.toUpperCase()}
                description={
                  modulo.rotaMobile ? modulo.descricao : 'Disponível no painel web.'
                }
                onPress={modulo.rotaMobile ? () => abrirModulo(modulo) : undefined}
                emBreve={!modulo.rotaMobile}
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
 * 🏢 O NOME DA EMPRESA, VENHA O EMBED COMO VIER.
 *
 * ⚠️ O PostgREST devolve a relação "para um" ora como objeto, ora como array de
 * um elemento, conforme a forma do `select`. Ler `.tenant_name` direto quebra no
 * dia em que a inferência mudar — é o mesmo achatamento que a web faz em
 * `lib/empresaDoContexto.ts`.
 */
function nomeDaEmpresa(contexto: TenantMemberContext | null): string | undefined {
  const embed = contexto?.tenants;
  if (!embed) return undefined;
  const empresa: TenantSummary | undefined = Array.isArray(embed) ? embed[0] : embed;
  return empresa?.tenant_name;
}

/**
 * 👤 UM NOME APRESENTÁVEL A PARTIR DO E-MAIL.
 *
 * ⚠️ ESTA TELA NÃO TEM O NOME DO USUÁRIO: `full_name` mora em `public.users` e
 * custaria uma consulta a mais só para escrever a saudação. Então derivamos:
 * "jairo.cunha@exemplo.com" vira "Jairo".
 *
 * 🎯 É UMA APROXIMAÇÃO, E ASSUMIDAMENTE. "contato@empresa.com" produz "Contato",
 * que não é o nome de ninguém — mas continua sendo uma saudação legível, e
 * melhor do que estampar o endereço inteiro no maior corpo de texto da tela.
 */
function nomeDeTratamento(email?: string | null): string {
  const local = (email ?? '').split('@')[0] ?? '';
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
  /**
   * ⚠️ O NOME DA EMPRESA USAVA `TIPOGRAFIA.titulo` (26pt) E ISSO ERA UM DEFEITO
   * DE PROPORÇÃO (corrigido em 19/09/2026). Aquele degrau é de título de TELA; um
   * dado dentro de um cartão não é título de nada. E o valor real piorava o
   * estrago: o nome da empresa deste sistema costuma trazer o e-mail do dono
   * ("jairooc19@gmail.com - EMPRESA 01"), o que a 26pt ocupava TRÊS linhas e
   * dominava a tela inteira.
   *
   * `legenda` (13pt) é o corpo de dado dentro de cartão, e é o mesmo que o resto
   * do aplicativo usa para a mesma função.
   */
  linhaContexto: {
    ...TIPOGRAFIA.legenda,
    color: BRAND.text,
  },
  linhaSegunda: { marginTop: ESPACO.sm },

  /**
   * O rótulo vai INLINE, dentro do mesmo `<Text>` da frase — por isso ele não
   * tem `marginBottom`. Em React Native, um `<Text>` dentro de outro herda o
   * fluxo do pai e só sobrepõe o que declara: é assim que se compõe "RÓTULO: valor"
   * numa linha só que quebra junto.
   */
  rotuloContexto: {
    ...TIPOGRAFIA.dica,
    fontWeight: '700',
    color: BRAND.textMuted,
    letterSpacing: 1,
  },

  lista: { gap: ESPACO.md },

  /**
   * ⚠️ SEM BORDA TRACEJADA. Borda tracejada é a convenção de "solte um arquivo
   * aqui" — um convite a agir que este estado não pode cumprir, porque quem
   * habilita módulos é o Desenvolvedor, não o usuário que está lendo.
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
