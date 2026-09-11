import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';

// Importações do Cérebro Único e Serviços
import { supabase, settingsService, GlobalSettings } from '@jairo/core';
import { storageService } from '@/services/storageService';
import { useBiometrics } from '@/hooks/useBiometrics';
import { usePermissionWatch } from '@/hooks/usePermissionWatch';
import { ThemeAnimationProvider, useThemeAnimation } from '@/context/ThemeAnimationContext';
import GestureRoot from '@/components/GestureRoot';
import { BRAND } from '@/constants/Colors';
import { TAMANHO, PESO } from '@/constants/Typography';

export {
  // Captura erros de navegação inesperados
  ErrorBoundary,
} from 'expo-router';

// Impede que o Splash Screen feche antes da inicialização completa
SplashScreen.preventAutoHideAsync();

/**
 * 🚪 LAYOUT RAIZ + PORTEIRO (PJODC v10)
 * Local: apps/mobile-app/app/_layout.tsx
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Gesture Handler: raiz de gestos ativa em dev e production builds
 * - Reanimated: transições de cor do white-label na thread de UI
 * - AppState: canal Realtime desligado enquanto o app está em background
 *
 * ⚠️ ESTE ARQUIVO ABSORVEU O ANTIGO `app/index.tsx` (o AuthGuard). Ele precisou
 * sair de `app/` porque `(auth)/index.tsx` também responde em `/` — duas rotas
 * com o mesmo endereço, e o Expo Router não escolhe entre elas. A triagem de
 * entrada virou parte do boot, o que é melhor de qualquer forma: decidir para
 * onde ir ANTES de montar tela nenhuma evita o piscar da guarita aparecendo por
 * um instante para quem já estava logado.
 *
 * 🔄 A RESTAURAÇÃO DA SESSÃO É O PRIMEIRO PASSO, e é ela que faz o app lembrar
 * do usuário. Sem isso o supabase-js nasce vazio: o Core declara
 * `persistSession: true` mas não passa `storage`, e no React Native não existe
 * `localStorage` para ele cair — a sessão viveria só em memória e morreria com o
 * app. Ver o cabeçalho de `services/storageService.ts`.
 *
 * 📤 A VIGILÂNCIA DE PERMISSÕES SAIU DAQUI NA v9, para `hooks/usePermissionWatch.ts`.
 * Ela cresceu ao ganhar o corte por `AppState` e passou a ser um assunto
 * próprio — montar a árvore e administrar websockets são duas coisas.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts({ ...FontAwesome.font });

  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [temSessao, setTemSessao] = useState(false);
  const [retornoOAuth, setRetornoOAuth] = useState(false);

  const { authenticate, hasHardware, isEnrolled } = useBiometrics();

  // 1. Gestão de erros no carregamento de fontes
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // 2. Inicialização: identidade visual + sessão persistida + biometria
  useEffect(() => {
    if (!loaded) return;

    async function initialize() {
      try {
        const globalSettings = await settingsService.getGlobalSettings();
        setSettings(globalSettings);
      } catch (e) {
        console.warn('[MOBILE-LAYOUT] Erro ao carregar configurações iniciais:', e);
      }

      /**
       * 🔵 O APP FOI ABERTO PELO DEEP LINK DO GOOGLE?
       *
       * ⚠️ ESTA PERGUNTA PRECISA SER FEITA ANTES DA TRIAGEM DE BOOT, e a resposta
       * precisa estar pronta antes de `isReady`. Quando o retorno do OAuth abre o
       * app do zero, o Expo Router monta a pilha já em `/auth/google` — e o
       * `router.replace` do porteiro, logo abaixo, atropelaria essa tela antes de
       * ela concluir o login. O usuário voltaria à guarita como se nada tivesse
       * acontecido, com a sessão pendurada no meio do caminho.
       *
       * `getInitialURL()` é a pergunta certa aqui porque é DETERMINÍSTICA: ela
       * devolve a URL que abriu o app, resolvida antes de qualquer navegação.
       * Olhar para os segmentos da rota dependeria de o roteador já ter montado.
       */
      try {
        const urlInicial = await Linking.getInitialURL();
        if (urlInicial?.includes('auth/google')) setRetornoOAuth(true);
      } catch (e) {
        console.warn('[MOBILE-LAYOUT] URL inicial não pôde ser lida:', e);
      }

      try {
        const sessao = await storageService.restoreSession(supabase);

        if (sessao) {
          /**
           * 🔐 BIOMETRIA COMO SEGUNDA TRANCA. A sessão é válida, mas isso prova
           * apenas que ESTE APARELHO estava logado — não que quem o segura agora
           * é o dono. Quando o aparelho tem biometria cadastrada, exigimos.
           * Cancelar não desloga: apenas manda para a guarita, onde o login
           * manual continua disponível.
           */
          if (hasHardware && isEnrolled) {
            const bio = await authenticate();
            setTemSessao(bio.success);
          } else {
            setTemSessao(true);
          }
        }
      } catch (e) {
        console.error('[MOBILE-LAYOUT] Falha na triagem de entrada:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    initialize();
    // `authenticate` é recriada a cada render; segui-la reabriria o prompt de
    // biometria em laço. O boot roda uma vez, quando as fontes ficam prontas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, hasHardware, isEnrolled]);

  return (
    /**
     * ✋ `GestureRoot` É O `GestureHandlerRootView` DE VOLTA — atrás de um
     * comutador de ambiente. A v8 o arrancou porque a v3 do
     * `react-native-gesture-handler` mata o Expo Go no arranque; a v9 o traz de
     * volta sem reabrir aquela porta, porque a biblioteca só é AVALIADA quando o
     * ambiente a suporta. Toda a mecânica está em `lib/gestureRuntime.ts`, e o
     * porquê de `require()` em vez de `import` está documentado lá.
     *
     *   ✅ eas build --profile development  → gestos ativos
     *   ✅ eas build --profile preview      → gestos ativos
     *   ✅ eas build --profile production   → gestos ativos
     *   ⚪ expo start (Expo Go)             → vira um `View`, e o app sobe igual
     *
     * 🎨 `ThemeAnimationProvider` ENVOLVE TUDO, e por fora do `GestureRoot`: ele
     * não renderiza nada visível, só carrega os shared values das cores. Estar
     * na borda de fora garante que qualquer tela — inclusive a de carregamento
     * — possa consumir a paleta animada sem hierarquia intermediária.
     *
     * `SafeAreaProvider` continua sendo o nó que mede os insets do aparelho; sem
     * ele `useSafeAreaInsets()` devolve zeros e o conteúdo passa por baixo do
     * notch sem que nada acuse o problema.
     */
    <ThemeAnimationProvider>
      <GestureRoot style={estilos.raiz}>
        <SafeAreaProvider>
          {!isReady ? (
            <View style={estilos.carregando}>
              <ActivityIndicator size="large" color={BRAND.text} />
            </View>
          ) : (
            <RootLayoutNav settings={settings} temSessao={temSessao} retornoOAuth={retornoOAuth} />
          )}
        </SafeAreaProvider>
      </GestureRoot>
    </ThemeAnimationProvider>
  );
}

function RootLayoutNav({
  settings,
  temSessao,
  retornoOAuth,
}: {
  settings: GlobalSettings | null;
  temSessao: boolean;
  retornoOAuth: boolean;
}) {
  const router = useRouter();
  const jaRedirecionou = useRef(false);
  const { atualizarTema } = useThemeAnimation();

  /**
   * 3. Destino inicial, uma vez só: quem tem sessão vai ao painel, o resto à
   * guarita.
   *
   * 🔵 EXCEÇÃO ÚNICA: o retorno do Google. O app foi aberto pelo deep link
   * `plataformajairo://auth/google` e a pilha já nasceu naquela tela, que está
   * concluindo o login e sabe sozinha para onde ir depois (painel, completar
   * cadastro ou seletor de empresa). Redirecionar aqui a mataria no berço.
   */
  useEffect(() => {
    if (jaRedirecionou.current) return;
    jaRedirecionou.current = true;
    if (retornoOAuth) return;
    router.replace(temSessao ? '/(tabs)' : '/(auth)');
  }, [temSessao, router, retornoOAuth]);

  /**
   * 🎨 ALIMENTA A ANIMAÇÃO DE TEMA COM O QUE O BANCO DEVOLVEU. Chamadas
   * repetidas com a mesma paleta são descartadas dentro do provedor, então
   * depender de `settings` aqui é seguro mesmo que o objeto mude de referência.
   */
  useEffect(() => {
    atualizarTema(settings);
  }, [settings, atualizarTema]);

  // 4. Escudo reativo: sessão, permissões e corte do Realtime em background.
  usePermissionWatch();

  // A cor de fundo vem dinamicamente do banco (white-label do `global_settings`).
  // `BRAND.background` é a reserva para quando o banco não respondeu — é a mesma
  // cor que as telas usam, então a troca passa despercebida.
  const backgroundColor = settings?.color_bg_general || BRAND.background;

  /**
   * 🏷️ O CABEÇALHO DAS ABAS MIGROU PARA CÁ NA v9. A barra de abas nativa não
   * desenha cabeçalho — o `UITabBarController` e o `BottomNavigationView`
   * cuidam do rodapé da tela e nada mais. Quem passa a desenhar o topo é o
   * cabeçalho do `Stack`, que também é nativo, e que já tinha o título do
   * white-label em mãos: o `settings` deste layout.
   *
   * ✅ ISSO ELIMINOU UMA BUSCA REPETIDA. Até a v8 o `(tabs)/_layout.tsx` fazia
   * o seu próprio `settingsService.getGlobalSettings()` só para descobrir o
   * `system_title` — a mesma linha do banco que este arquivo já havia lido no
   * boot, buscada uma segunda vez a cada abertura do painel.
   */
  const tituloDoSistema = settings?.system_title || 'PLATAFORMA JAIRO O D C';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor } }}>
      <Stack.Screen name="(auth)" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: 'slide_from_right',
          headerShown: true,
          title: tituloDoSistema,
          headerBackVisible: false,
          ...opcoesCabecalho,
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

      {/*
        🔵 RETORNO DO GOOGLE. `auth/google` é o destino do deep link
        `plataformajairo://auth/google` — o mesmo endereço cadastrado em
        Supabase › Authentication › URL Configuration › Redirect URLs.

        ⚠️ SEM ESTE ARQUIVO O APP CAI EM "ENDEREÇO NÃO ENCONTRADO". O Expo Router
        recebe o deep link e procura a rota; não achando, vai para `+not-found`.
        Ver o cabeçalho de `app/auth/google.tsx`.

        Sem animação e sem gesto de voltar: é uma passagem, não uma tela. Voltar
        para cá depois de autenticado tentaria concluir um login já concluído.
      */}
      <Stack.Screen name="auth/google" options={{ animation: 'none', gestureEnabled: false }} />

      {/*
        ℹ️ SOBRE E SUPORTE SÃO AS ÚNICAS TELAS COM CABEÇALHO E BOTÃO DE VOLTAR.
        Elas são destinos empilhados, abertos pelos cartões do Painel de
        Engenharia — e o cabeçalho nativo do `Stack` traz de graça o gesto de
        arrastar da borda no iOS e o botão físico de voltar no Android.

        ⚠️ NÃO PONHA `component` NESTES `Stack.Screen`. No expo-router as telas
        vêm dos ARQUIVOS de `app/` (`app/sobre.tsx`, `app/suporte.tsx`); a prop
        é ignorada e só faria alguém procurar por que a edição não teve efeito.
        É proibição explícita do CLAUDE.md.
      */}
      <Stack.Screen
        name="sobre"
        options={{
          headerShown: true,
          title: 'Sobre',
          headerBackTitle: 'Voltar',
          ...opcoesCabecalho,
        }}
      />
      <Stack.Screen
        name="suporte"
        options={{
          headerShown: true,
          title: 'Suporte',
          headerBackTitle: 'Voltar',
          ...opcoesCabecalho,
        }}
      />

      {/*
        🛠️ AS DUAS TELAS DO PAINEL DE ENGENHARIA, empilhadas como "Sobre" e
        "Suporte" e pelo mesmo motivo: são destinos de um `MenuCard`, abertos e
        fechados pelo botão voltar. Elas fecham a paridade com o painel do
        `admin-web`, que tem exatamente estas duas ferramentas — "Central de
        Comandos" (`/dashboard/tenants`) e "Ajustes Globais" (`/dashboard/settings`).
      */}
      <Stack.Screen
        name="central-comandos"
        options={{
          headerShown: true,
          title: 'Central de Comandos',
          headerBackTitle: 'Voltar',
          ...opcoesCabecalho,
        }}
      />
      <Stack.Screen
        name="ajustes-globais"
        options={{
          headerShown: true,
          title: 'Ajustes Globais',
          headerBackTitle: 'Voltar',
          ...opcoesCabecalho,
        }}
      />
    </Stack>
  );
}

/**
 * 🏷️ APARÊNCIA COMUM DOS CABEÇALHOS NATIVOS.
 *
 * Três telas usam cabeçalho — o painel, "Sobre" e "Suporte" — e os três precisam
 * da mesma barra. Repetir o bloco em cada `Stack.Screen` foi o que produziu, na
 * versão anterior, um título em peso 900 que não existia em nenhuma outra parte
 * da interface.
 *
 * ⚠️ `headerShadowVisible: false` É O QUE FAZ A BARRA PARECER PARTE DA TELA. Por
 * padrão o `Stack` desenha uma sombra (iOS) ou uma linha de elevação (Android)
 * sob o cabeçalho, e ela cria um degrau visível entre a barra branca e o
 * conteúdo. Sem a sombra, cabeçalho e conteúdo leem-se como uma superfície só —
 * que é o que aplicativos de transporte fazem nas suas telas internas.
 *
 * 🔤 O TÍTULO USA O CORPO DE SEÇÃO (16pt, peso 600), e não um tamanho próprio.
 * Cabeçalho de navegação é o texto que mais aparece no app; deixá-lo fora da
 * escala tipográfica seria abrir a primeira exceção da qual as outras nascem.
 */
const opcoesCabecalho = {
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerTintColor: BRAND.primary,
  headerStyle: { backgroundColor: BRAND.surface },
  headerTitleStyle: {
    fontSize: TAMANHO.secao,
    fontWeight: PESO.medio,
    color: BRAND.text,
  },
};

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  carregando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.background,
  },
});
