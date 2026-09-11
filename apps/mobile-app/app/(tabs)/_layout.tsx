import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { BRAND } from '@/constants/Colors';
import { useSessionRole } from '@/hooks/useSessionRole';

/**
 * 🛠️ LAYOUT DE ABAS — BARRA DO SISTEMA (PJODC v10)
 * Local: apps/mobile-app/app/(tabs)/_layout.tsx
 *
 * v9: [100% NATIVO — LAYOUT]
 * - iOS: `UITabBarController` de verdade, via `RNSTabsHostIOS`
 * - Android: `BottomNavigationView` do Material, via `RNSTabsHostAndroid`
 * - Ícones do sistema: SF Symbols no iOS, Material Symbols no Android
 * - Zero dependência nova: `NativeTabs` vem do próprio expo-router
 *
 * 🔄 O QUE MUDOU DA v8 PARA CÁ. Antes este arquivo montava `<Tabs>`, que é o
 * `createBottomTabNavigator` do React Navigation — uma barra desenhada em
 * JavaScript, com `View` e `Text`, imitando a do sistema. Agora monta
 * `<NativeTabs>`, que instancia o controlador de abas REAL de cada plataforma.
 * A diferença aparece nas coisas que não escrevemos: o desfoque translúcido do
 * iOS, o ripple do Material, o realce ao segurar, o comportamento com fontes de
 * acessibilidade grandes e a minimização ao rolar no iOS 26 — tudo do sistema.
 *
 * ⚠️ **NÃO INSTALE `@react-navigation/bottom-tabs`.** O expo-router já traz o
 * navegador embutido (`build/react-navigation/bottom-tabs`), e instalar o
 * pacote avulso colocaria uma SEGUNDA cópia no bundle, em versão que ninguém
 * garante casar com a que o expo-router usa.
 *
 * 🚫 O CABEÇALHO NÃO MORA MAIS AQUI. Uma barra de abas nativa não desenha
 * cabeçalho — quem o faz agora é o `<Stack.Screen name="(tabs)">` do
 * `app/_layout.tsx`, que já tinha o `system_title` do banco em mãos. De quebra,
 * isso apagou a SEGUNDA busca de `global_settings` que este arquivo fazia: o
 * título era lido duas vezes por abertura, uma aqui e outra no layout raiz.
 *
 * 📜 O RODAPÉ TAMBÉM SAIU. A barra nativa é dona da borda inferior da tela e
 * não empresta aquele espaço; o rodapé institucional passou a ser o último
 * elemento do conteúdo de cada aba, fixo acima da barra. Ver o cabeçalho de
 * `components/InstitutionalFooter.tsx`.
 *
 * 🎭 AS ABAS DEPENDEM DO PAPEL, E POR ISSO ESPERAMOS A LEITURA. O Expo Router
 * avisa que alternar `hidden` DEPOIS de montado remonta o navegador e zera o
 * estado — a aba trocaria sozinha sob o dedo do usuário. Por isso o retorno
 * antecipado com o indicador enquanto `carregando`: quando a barra nasce, ela
 * já nasce com a composição certa e nunca mais muda.
 *
 * 🔧 O DESENVOLVEDOR NÃO VÊ "PERFIL" porque não tem perfil: a credencial dele é
 * fixa no Core e não existe linha em `public.users` para carregar. Esconder a
 * aba é conveniência de interface, não segurança — quem protege dado é a RLS.
 *
 * 🎨 OS ÍCONES SÃO DO SISTEMA, não uma fonte empacotada. `sf` recebe um SF
 * Symbol (iOS) e `md` um Material Symbol (Android); cada plataforma desenha o
 * seu, na espessura e no peso que o usuário configurou no aparelho. É por isso
 * que o `lucide-react-native` saiu daqui: um ícone vetorial nosso ficaria
 * correto e, ainda assim, estrangeiro no meio da barra do sistema.
 */
export default function TabLayout() {
  const { ehDesenvolvedor, carregando } = useSessionRole();

  if (carregando) {
    return (
      <View style={estilos.carregando}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  return (
    /*
      🎨 O ÍCONE INATIVO USA `textMuted` (#757575), NÃO `textFaint` (#bdbdbd).
      A barra de abas é o controle mais usado do aplicativo e precisa passar no
      contraste mínimo de 3:1 para elementos gráficos (WCAG 1.4.11): #bdbdbd
      sobre branco dá cerca de 1,9:1 e desaparece sob luz do sol, que é onde um
      aplicativo de telefone mais é usado. #757575 dá 4,6:1 e continua sendo
      visivelmente "o não selecionado" ao lado do azul da marca.
    */
    <NativeTabs
      tintColor={BRAND.primary}
      backgroundColor={BRAND.surface}
      iconColor={{ default: BRAND.textMuted, selected: BRAND.primary }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="dashboard" />
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil" hidden={ehDesenvolvedor}>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const estilos = StyleSheet.create({
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.background,
  },
});
