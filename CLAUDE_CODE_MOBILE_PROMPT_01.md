CONTEXTO DO PROJETO:
Repositório Monorepo com 3 aplicações:
1. apps/admin-web (Next.js - Web)
2. apps/mobile-app (React Native + Expo - Mobile)
3. packages/core (Shared)

FOCO DESTE PROMPT: apps/mobile-app APENAS

===== CONFIGURAÇÃO DO PROJETO (v9 - ATUALIZADO) =====

Estrutura Real do apps/mobile-app:
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── complete-profile.tsx
│   │   ├── select-tenant.tsx
│   │   ├── contact.tsx
│   │   ├── about.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── index.tsx (📍 v9: condicional por useSessionRole — ClientDashboard ou DeveloperDashboard)
│   │   ├── perfil.tsx (✨ v9 NOVO: segunda aba — ProfileScreen)
│   │   └── _layout.tsx (📍 v9: NativeTabs — Bottom Tab Navigator nativo iOS/Android)
│   ├── _layout.tsx (root) (📍 v9: ThemeAnimationProvider + GestureRoot + usePermissionWatch)
│   ├── +html.tsx
│   ├── +not-found.tsx
│   ├── modal.tsx
│   └── index.tsx (redirect)
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   │   └── SpaceMono-Regular.ttf
│   │   └── images/
│   │       ├── adaptive-icon.png
│   │       ├── favicon.png
│   │       ├── icon.png
│   │       └── splash-icon.png
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AccessOptionsView.tsx
│   │   │   ├── AuthMessage.tsx
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── authStyles.ts
│   │   │   ├── CompleteProfileView.tsx
│   │   │   ├── LoginFormsView.tsx
│   │   │   ├── LoginGoogleView.tsx
│   │   │   ├── MainMenuView.tsx
│   │   │   ├── MiscViews.tsx
│   │   │   ├── SelectTenantView.tsx
│   │   │   └── SignUpView.tsx
│   │   ├── button/ (✨ v9 NOVO: componentes reutilizáveis)
│   │   │   ├── Button.tsx (Botão com animações Reanimated)
│   │   │   ├── Button.styles.ts
│   │   │   └── Button.types.ts
│   │   ├── card/ (✨ v9 NOVO: componentes reutilizáveis)
│   │   │   ├── Card.tsx (Cartão com sombra/elevation)
│   │   │   ├── Card.styles.ts
│   │   │   └── Card.types.ts
│   │   ├── client/
│   │   │   └── ClientDashboard.tsx
│   │   ├── developer/
│   │   │   └── DeveloperDashboard.tsx
│   │   ├── GestureRoot.tsx (✨ v9 NOVO: wrapper para GestureHandlerRootView)
│   │   ├── InstitutionalFooter.tsx (✨ v9 NOVO: © + versão — fixo acima barra nativa)
│   │   ├── EditScreenInfo.tsx
│   │   ├── ExternalLink.tsx
│   │   ├── SearchableSelect.tsx (📍 v9: com Gesture.Pan + Reanimated)
│   │   ├── StyledText.tsx
│   │   ├── Themed.tsx
│   │   ├── useClientOnlyValue.ts
│   │   ├── useClientOnlyValue.web.ts
│   │   ├── useColorScheme.ts
│   │   ├── input/ (✨ v9 NOVO: componentes reutilizáveis)
│   │   │   ├── Input.tsx (TextInput com validação)
│   │   │   └── Input.styles.ts
│   │   └── useColorScheme.web.ts
│   ├── constants/
│   │   └── Colors.ts (📍 v9: atualizado com Material Design 3 + HIG)
│   ├── context/ (✨ v9 NOVO: pasta para contexts)
│   │   └── ThemeAnimationContext.tsx (✨ v9 NOVO: white-label dinâmico com Reanimated)
│   ├── hooks/
│   │   ├── useAuthForm.ts
│   │   ├── useAuthLogicMobile.ts
│   │   ├── useBiometrics.ts (📍 v9: Face ID + Biometric + fallback)
│   │   ├── useBrazilCitiesMobile.ts
│   │   ├── useTenantTriage.ts
│   │   ├── useSessionRole.ts (✨ v9 NOVO: lê papel da sessão — DEVELOPER vs CLIENT)
│   │   ├── useNativeActionSheet.ts (✨ v9 NOVO: ActionSheetIOS + Alert.alert)
│   │   ├── useNativeContextMenu.ts (✨ v9 NOVO: context menu nativo onLongPress)
│   │   ├── useSheetDragGesture.ts (✨ v9 NOVO: Gesture.Pan + Reanimated para SearchableSelect)
│   │   ├── usePermissionWatch.ts (✨ v9 NOVO: AppState listener — cleanup em background)
│   │   ├── usePlatform.ts (✨ v9 NOVO: Platform.OS + tokens iOS/Android)
│   │   ├── useTheme.ts (📍 v9: paleta de cores centralizada)
│   │   ├── useKeyboardOpen.ts (✨ v9 NOVO: detecta teclado aberto)
│   │   ├── useDimensions.ts (✨ v9 NOVO: dimensões responsivas)
│   │   └── auth/
│   │       ├── types.ts
│   │       ├── useGoogleLogin.ts
│   │       ├── usePasswordLogin.ts
│   │       ├── useProfileCompletion.ts
│   │       └── useSignUpFlow.ts
│   ├── lib/
│   │   ├── authErrors.ts
│   │   ├── googleOAuthMobile.ts
│   │   └── gestureRuntime.ts (✨ v9 NOVO: TurboModuleRegistry para detectar Gesture Handler)
│   ├── screens/ (✨ v9 NOVO: pasta para telas complexas)
│   │   └── ProfileScreen.tsx (✨ v9 NOVO: perfil do usuário + logout nativo)
│   └── services/
│       ├── logoutService.ts (📍 v9: usa useNativeActionSheet para confirmação)
│       └── storageService.ts (📍 v9: expo-secure-store + AsyncStorage)

DEPENDÊNCIAS OBRIGATÓRIAS JÁ INSTALADAS (v9):
✅ React Native 0.86.3
✅ Expo ~57.0.20
✅ Expo Router ~57.0.19 (file-based routing)
✅ react-native-gesture-handler ~3.2.1 (gestos fluidos)
✅ react-native-reanimated 4.5.1 (animações thread nativa)
✅ react-native-worklets 0.10.1 (plugin para Reanimated)
✅ @react-navigation/native ^7.1.8
✅ @react-navigation/bottom-tabs (instalado via Expo Router)
✅ react-native-safe-area-context ~5.7.0
✅ react-native-screens ~4.26.0
✅ expo-local-authentication ~57.0.2 (biometria)
✅ @expo/vector-icons ^15.0.2 (ícones SF Symbols + Material)

ADICIONE QUANDO NECESSÁRIO:
npm install react-native-paper @react-native-async-storage/async-storage expo-secure-store

===== REQUISITOS DE DESENVOLVIMENTO =====

1. DETECÇÃO AUTOMÁTICA DE PLATAFORMA (iOS vs Android):
   - SEMPRE usar Platform.OS para detectar iOS vs Android
   - Criar arquivos .ios.ts e .android.ts quando necessário
   - Exemplo: useColorScheme.ts + useColorScheme.web.ts (já existe no projeto)
   - NUNCA harcoding estilos específicos sem função
   - v9: usar usePlatform() hook para tokens iOS/Android

2. SAFE AREA & NOTCH:
   - Seu projeto JÁ usa SafeAreaView (bom!)
   - VERIFICAR: Todos os screens usam SafeAreaView
   - USAR: useSafeAreaInsets() para cálculos precisos
   - iOS: Respeitar notch do iPhone
   - Android: Respeitar barra de sistema
   - v9: NativeTabs cuida de SafeAreaInsets automaticamente

3. NAVEGAÇÃO - Expo Router 6:
   - Seu projeto JÁ usa Expo Router (estrutura (auth), (tabs))
   - Pasta entre parênteses = layout group (não aparece na URL)
   - _layout.tsx = arquivo de configuração de navegação
   - SEMPRE usar native-stack para navegação principal
   - Transições: iOS (push) e Android (fade) automáticas
   - v9: NativeTabs para Bottom Tab Navigator nativo

4. CORES - Constantes Existentes:
   - Arquivo: src/constants/Colors.ts (MODIFICAR COM CUIDADO)
   - Android: Material Design 3 (#2196F3, etc)
   - iOS: Tons claros (#007AFF, #f2f2f7, etc)
   - CRIAR função: getColorByPlatform() se não existir
   - NEVER hardcode colors sem usar Constants/Colors.ts
   - v9: useTheme() hook para acesso centralizado
   - v9: ThemeAnimationContext para interpolação dinâmica (white-label)

5. AUTENTICAÇÃO - Hooks Existentes:
   - Arquivo: src/hooks/auth/ (useGoogleLogin.ts, usePasswordLogin.ts, etc)
   - RESPEITAR estrutura existente
   - Adicionar nova lógica em novo arquivo se necessário
   - Usar useAuthLogicMobile.ts como referência
   - v9: integrar com useSessionRole() para abas condicionais

6. BIOMETRIA - Hook Existente:
   - Arquivo: src/hooks/useBiometrics.ts (JÁ EXISTE)
   - USAR este hook, não criar novo
   - Implementa Face ID (iOS) + Biometric (Android)
   - Fallback para autenticação padrão
   - v9: chama authenticate() no boot (app/_layout.tsx)

7. ARMAZENAMENTO SEGURO:
   - Arquivo: src/services/storageService.ts (VERIFICAR)
   - USAR expo-secure-store para dados sensíveis (tokens)
   - USAR @react-native-async-storage para dados não-sensíveis
   - NUNCA armazenar tokens em AsyncStorage comum
   - v9: lê papel da sessão via getSession()

8. LOGOUT:
   - Arquivo: src/services/logoutService.ts (EXISTE)
   - USAR este serviço para logout consistente
   - Limpar tokens, dados, e navegar para login
   - v9: confirmação via useNativeActionSheet (nativo)

9. TECLADO:
   - USAR KeyboardAvoidingView em screens com TextInput
   - iOS: behavior='padding'
   - Android: behavior='height'
   - Detectar com Platform.OS
   - v9: useKeyboardOpen() hook para detectar teclado aberto

10. GESTURAS (Gesture Handler - OBRIGATÓRIO):
    - GestureHandlerRootView deve envolver toda a app (ver _layout.tsx)
    - Usar Gesture.Pan para deslize
    - Usar Gesture.LongPress para ações longas
    - iOS e Android com mesmo comportamento
    - v9: GestureRoot wrapper (src/components/GestureRoot.tsx)
    - v9: detecta automaticamente via gestureRuntime.ts
    - v9: Expo Go = fallback (View comum), dev build = GestureHandlerRootView

11. ANIMAÇÕES (Reanimated - OBRIGATÓRIO):
    - SEMPRE Reanimated 2+ (não Animated básico)
    - useSharedValue para estado compartilhado
    - useAnimatedStyle para estilos animados
    - Exemplo: Button press = scale 0.95 com spring
    - 60fps em ambas plataformas
    - v9: ThemeAnimationContext para interpolação de cores
    - v9: useSheetDragGesture para SearchableSelect
    - v9: Button.tsx com withSpring animado

12. COMPONENTES REUTILIZÁVEIS:
    - Arquivo: src/components/ (EXPANDIR AQUI)
    - Padrão: Component.tsx (lógica) + Component.styles.ts (estilos) + Component.types.ts (types)
    - Exemplo existente: authStyles.ts (usar como referência)
    - v9: Button.tsx, Card.tsx, Input.tsx já existem
    - CRIAR componentes para: Modal, Picker, Tab, Badge, etc
    - Usar memo() para componentes puros
    - Passar systemTitle prop para dashboards

13. HOOKS REUTILIZÁVEIS:
    - Arquivo: src/hooks/ (EXPANDIR AQUI)
    - Padrão: useSomething.ts
    - Referência: useAuthForm.ts, useBiometrics.ts
    - v9: useSessionRole, useNativeActionSheet, useNativeContextMenu, useSheetDragGesture, usePermissionWatch, usePlatform, useTheme, useKeyboardOpen, useDimensions
    - CRIAR hooks para: Notificações, Cache, etc

14. TIPOS TYPESCRIPT:
    - Arquivo: src/hooks/auth/types.ts (JÁ EXISTE)
    - EXPANDIR conforme necessário
    - SEMPRE type-safe (evitar any)
    - Exportar types de components
    - v9: adicionar types em cada pasta (Button.types.ts, etc)

15. ESTRUTURA DE ARQUIVOS PARA NOVO COMPONENTE:
    Exemplo: src/components/button/
    ├── Button.tsx (componente)
    ├── Button.styles.ts (estilos)
    ├── Button.types.ts (types/interfaces)
    └── Button.utils.ts (funções auxiliares - opcional)

16. ESTRUTURA DE ARQUIVOS PARA NOVO SCREEN:
    Exemplo: app/(tabs)/new-screen.tsx
    ├── Importar componentes
    ├── Usar SafeAreaView
    ├── Usar KeyboardAvoidingView se necessário
    ├── Integrar com hooks de auth
    └── Navegar com Expo Router
    Exemplo de tela complexa: src/screens/ProfileScreen.tsx

17. PADRÃO DE DESENVOLVIMENTO:
    - Componentes funcionais com hooks (OBRIGATÓRIO)
    - TypeScript .tsx ou .ts (NÃO .jsx/.js)
    - PropTypes ou TypeScript interfaces
    - Comments em português
    - Nomeação: PascalCase (componentes), camelCase (funções)
    - v9: marcar novos arquivos com comentário /**v9: [100% NATIVO]**/

18. PERFORMANCE:
    - React.memo para componentes puros
    - useMemo para computações pesadas
    - useCallback para funções em listas
    - FlatList para listas grandes
    - NUNCA criar components dentro de renders
    - v9: Object.freeze() para temas estáticos

19. TRATAMENTO DE ERROS:
    - Try/catch em chamadas de API
    - authErrors.ts como referência
    - User-friendly messages (não erros técnicos)
    - Logging estruturado
    - v9: console.warn/error com prefixo [MODULO]

20. SUPABASE INTEGRATION:
    - Arquivo: packages/core/src/lib/supabase.ts (verificar)
    - Usar serviços em packages/core/src/services/platform/
    - authService.ts, profileService.ts, settingsService.ts, etc
    - RESPEITAR lógica existing
    - v9: authService.getTenantMemberContext() em (tabs)/index.tsx

===== v9: NOVOS REQUISITOS (100% NATIVO) =====

21. NATIVE TABS - Bottom Tab Navigator Nativo (v9 NOVO):
    - iOS: UITabBarController real (via RNSTabsHostIOS)
    - Android: BottomNavigationView Material real (via RNSTabsHostAndroid)
    - Arquivo: app/(tabs)/_layout.tsx
    - Usar: import { NativeTabs } from 'expo-router/unstable-native-tabs'
    - Abas condicionais por papel: useSessionRole().ehDesenvolvedor
    - Developer vê: Engenharia + Perfil (ocultado)
    - Cliente vê: Painel + Perfil
    - Ícones do sistema: sf (SF Symbols iOS) + md (Material Symbols Android)
    - Exemplo: NativeTabs.Trigger com sf="square.grid.2x2.fill" md="dashboard"
    - ⚠️ CRÍTICO: usar NativeTabs.Trigger.Icon, não ícones empacotados

22. NATIVE ACTION SHEETS - Menus do Sistema (v9 NOVO):
    - iOS: ActionSheetIOS.showActionSheetWithOptions (UIActionSheetController)
    - Android: Alert.alert (AlertDialog Material nativo)
    - Arquivo: src/hooks/useNativeActionSheet.ts
    - Usar em: confirmações, menus, logout, deletar, etc
    - Interface: mostrar(opcoes: OpcaoDeAcao[], config?: ConfigDeAcao)
    - Opções: { titulo, aoTocar, destrutiva? }
    - Retorno de índice: handleIndex(buttonIndex) para escolha
    - ⚠️ Android MAX 3 AÇÕES (AlertDialog limitation)
    - ⚠️ Cancelar sempre é a última opção

23. NATIVE CONTEXT MENU - Menu ao Segurar (v9 NOVO):
    - iOS: UIAlertController (mesmo que ActionSheet)
    - Android: AlertDialog Material
    - Arquivo: src/hooks/useNativeContextMenu.ts
    - Usar em: onLongPress de itens de lista
    - Fachada sobre useNativeActionSheet
    - Exemplo: Pressable com onLongPress={() => abrir(items)}
    - ⚠️ Mesmas limitações do ActionSheet (MAX 3 no Android)

24. APP LIFECYCLE & REALTIME CLEANUP (v9 NOVO):
    - Detectar app em foreground vs background
    - Arquivo: src/hooks/usePermissionWatch.ts
    - Usar: AppState listener (React Native nativo)
    - AppState.currentState: "active" | "inactive" | "background"
    - Limpar realtime listeners (Supabase) ao ir para background
    - Restaurar ao voltar para foreground
    - ⚠️ iOS: "inactive" = não é background ainda (notificação, etc)
    - ⚠️ Android: diferencia bem entre estados

25. PROFILE SCREEN - Tela de Perfil do Usuário (v9 NOVO):
    - Arquivo: src/screens/ProfileScreen.tsx
    - Rota: app/(tabs)/perfil.tsx
    - Usar: useNativeActionSheet para logout com confirmação
    - Usar: useSessionRole para guardar Dev (sem profile)
    - Exibir: nome, email, país, estado, cidade, provider (Google vs senha)
    - Botão "SAIR" com confirmação nativa
    - Integrar: InstitutionalFooter no final
    - ⚠️ Developer nunca chega aqui (aba ocultada)

26. INSTITUTIONAL FOOTER - Rodapé © + Versão (v9 NOVO):
    - Arquivo: src/components/InstitutionalFooter.tsx
    - Conteúdo: © 2026. Todos os direitos... + Versão: APP_VERSION
    - Posicionamento: FIXO ACIMA da barra nativa
    - Antes: estava embaixo da barra (não funciona mais)
    - Agora: dentro do conteúdo da aba
    - ScrollView last element = InstitutionalFooter
    - ⚠️ NÃO colocar ao pé da barra (insets já ocupados)

27. THEME ANIMATION CONTEXT - White-Label Dinâmico (v9 NOVO):
    - Arquivo: src/context/ThemeAnimationContext.tsx
    - Usar: Reanimated Shared Values (useSharedValue)
    - Interpolar cores do banco (global_settings)
    - Duração: 320ms com Easing.out(Easing.cubic)
    - Paleta: fundo, cabecalho, textoCabecalho, borda
    - Provider wrapper em app/_layout.tsx
    - Exemplo: atualizarTema(settings) dispara interpolação
    - ⚠️ Ignora mudanças repetidas (comparar assinatura)

28. GESTURE RUNTIME - Detectar Gesture Handler (v9 NOVO):
    - Arquivo: src/lib/gestureRuntime.ts
    - Usar: TurboModuleRegistry.get('RNGestureHandlerModule')
    - Constante: GESTOS_NATIVOS = boolean
    - Função: carregarGestos() → módulo ou null
    - Fallback: require() preguiçoso (não import)
    - ⚠️ Expo Go: devolvem false/null (app funciona igual)
    - ⚠️ Dev build: devolvem true/módulo (gestos ativos)

29. GESTURE ROOT - Wrapper Inteligente (v9 NOVO):
    - Arquivo: src/components/GestureRoot.tsx
    - Usa: gestureRuntime.ts para detectar
    - Renderiza: GestureHandlerRootView (dev) ou View (Expo Go)
    - Envolve: app/_layout.tsx root
    - Antes: GestureHandlerRootView quebrava Expo Go
    - Agora: fallback automático
    - ⚠️ Constante de módulo (não por render)

30. ENVIRONMENT DETECTION (v9 NOVO):
    - Expo Go: Gesture Handler = false, NativeTabs = customizado
    - Dev Build: Gesture Handler = true, NativeTabs = nativo
    - Production: Gesture Handler = true, NativeTabs = nativo
    - Teste em Expo Go primeiro (prototipagem rápida)
    - Depois em dev build (testar nativos)
    - Finalmente em production (publicar)

===== GERAR SEMPRE =====

✅ Código TypeScript type-safe (.tsx ou .ts)
✅ Estrutura de arquivo seguindo convenção do projeto
✅ Comments explicativos em português
✅ Integração com estrutura existing
✅ Detecção automática iOS/Android (Platform.OS)
✅ SafeAreaView quando necessário
✅ Componentes reutilizáveis quando possível
✅ Sem dependências externas desnecessárias
✅ Seguindo Material Design 3 (Android) + HIG (iOS)
✅ Hooks customizados para lógica reutilizável
✅ v9: marcar com comentário /**v9: [100% NATIVO]**/ quando criar novo

===== NUNCA GERAR =====

❌ Código sem types (.js puro)
❌ Estilos hardcoded por plataforma sem função
❌ Componentes não TypeScript
❌ Navegação fora de Expo Router
❌ Screens sem SafeAreaView
❌ Keyboard sem KeyboardAvoidingView
❌ Duplicação de lógica (sempre criar hook)
❌ Colors hardcoded (SEMPRE usar src/constants/Colors.ts)
❌ Animações com Animated simples (usar Reanimated)
❌ Imports que quebram estrutura monorepo
❌ GestureHandlerRootView direto (usar GestureRoot wrapper)
❌ @react-navigation/bottom-tabs instalado (usa NativeTabs do Expo Router)
❌ Action Sheets customizados (usar useNativeActionSheet)
❌ Rodapé embaixo da barra nativa (usar dentro do conteúdo)

===== PATHNAMES IMPORTANTES =====

/apps/mobile-app/app/ → Screens (Expo Router)
/apps/mobile-app/app/(auth)/ → Telas de autenticação
/apps/mobile-app/app/(tabs)/ → Telas do painel (com NativeTabs)
/apps/mobile-app/src/components/ → Componentes reutilizáveis
/apps/mobile-app/src/components/button/ → Botão com Reanimated
/apps/mobile-app/src/components/card/ → Cartão reutilizável
/apps/mobile-app/src/components/input/ → Input reutilizável
/apps/mobile-app/src/context/ → Contexts (ThemeAnimationContext, etc)
/apps/mobile-app/src/hooks/ → Hooks customizados (useSessionRole, useNativeActionSheet, etc)
/apps/mobile-app/src/hooks/auth/ → Hooks de autenticação
/apps/mobile-app/src/lib/ → Utilitários (gestureRuntime, authErrors, etc)
/apps/mobile-app/src/screens/ → Telas complexas (ProfileScreen, etc)
/apps/mobile-app/src/constants/ → Constantes (Colors, etc)
/apps/mobile-app/src/services/ → Serviços (storage, logout, etc)
/packages/core/src/services/platform/ → API Services (Supabase)

===== EXEMPLOS DE SOLICITAÇÕES CORRETAS =====

1. "Crie um componente Button reutilizável com animações Reanimated..."
   → src/components/button/Button.tsx + Button.styles.ts + Button.types.ts
   → useSharedValue + useAnimatedStyle + withSpring
   → marcar com /**v9: [100% NATIVO]**/

2. "Crie screen de configurações em app/(tabs)/settings.tsx..."
   → Respeita estrutura Expo Router
   → Aberta via NativeTabs.Trigger
   → Usar useSessionRole para condicionar acesso
   → Integrar InstitutionalFooter

3. "Crie hook useSettings para gerenciar dados..."
   → src/hooks/useSettings.ts
   → Abstrair lógica de banco/storage
   → Exportar tipos em arquivo separado

4. "Integre confirmação nativa no logout..."
   → Use useNativeActionSheet
   → iOS: ActionSheetIOS, Android: Alert
   → Chamar logoutService após confirmação

5. "Crie menu de contexto ao segurar item..."
   → Use useNativeContextMenu
   → onLongPress={() => abrir(items)}
   → MAX 3 opções no Android

6. "Crie service para sincronizar dados com Supabase..."
   → packages/core/src/services/platform/newService.ts
   → Respeitar patterns existentes (authService, etc)
   → Usar em (tabs)/index.tsx ou hooks

7. "Implemente white-label dinâmico com cores animadas..."
   → Use ThemeAnimationContext
   → Chamar atualizarTema(settings) em app/_layout.tsx
   → Componentes consomem via useThemeAnimation()

8. "Detecte se app está em foreground ou background..."
   → Use usePermissionWatch (já existe)
   → AppState listener automático
   → Limpa realtime listeners em background

===== HISTÓRICO DE VERSÕES =====

v8 (2026-09-06-01):
- Gesture Handler removido (Expo Go incompatível)
- Abas customizadas (Expo Router)
- Rodapé embaixo da barra
- Sem menu nativo
- Sem ProfileScreen

v9 (2026-09-06-02):
- Gesture Handler reativado (GestureRoot wrapper inteligente)
- NativeTabs (Bottom Tab Navigator nativo iOS/Android)
- Rodapé repositionado (dentro conteúdo, fixo acima barra)
- Action Sheets nativos (useNativeActionSheet)
- Context Menu nativo (useNativeContextMenu)
- ProfileScreen + perfil.tsx criado
- ThemeAnimationContext (white-label dinâmico)
- AppState listener (cleanup background)
- useSessionRole (abas condicionais por papel)
- Button + Card componentes reutilizáveis
- 100% NATIVO: tab bar, menus, gestos, animações, transições
- 100% MULTIPLATAFORMA: um código, iOS + Android
- Zero código específico Android/iOS (Platform.OS automático)

v9-06-03 (atual):
- Implementação completa e validada
- Todas as 28-30 recomendações incluídas
- Pronto para produção (Play Store + App Store)
- CLAUDE_CODE_MOBILE_PROMPT_01.md atualizado