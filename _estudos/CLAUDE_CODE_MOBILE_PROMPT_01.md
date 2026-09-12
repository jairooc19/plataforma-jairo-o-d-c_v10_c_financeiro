> ⚠️ **DOCUMENTO HISTÓRICO — LEIA ESTE AVISO ANTES DE SEGUIR QUALQUER INSTRUÇÃO.**
>
> Este arquivo foi escrito para orientar o desenvolvimento do `apps/mobile-app`
> na **v9** (setembro de 2026). Ele descreve o app daquele momento, e a auditoria
> do degrau 1 (`_estudos/degrau-01-engenharia-reversa.html`) encontrou aqui
> várias afirmações que **já não eram verdade quando foram lidas**:
>
> | O documento dizia | Realidade |
> |---|---|
> | `EditScreenInfo.tsx`, `ExternalLink.tsx`, `StyledText.tsx`, `Themed.tsx`, `useClientOnlyValue*`, `useColorScheme*`, `app/index.tsx` | **Nenhum desses arquivos existe** no repositório |
> | "Expo Router 6" | É o `~57.0.19` (o Expo passou a numerar os pacotes pelo SDK) |
> | "Pronto para produção (Play Store + App Store)" | **Nenhum build de loja foi gerado**; o iOS nunca foi testado |
> | "Teste em Expo Go primeiro" | O login Google **não funciona** no Expo Go: o Supabase rejeita o esquema `exp://` |
> | `adminApiService` → `/api/admin/*` | **Removidos na v10**: o app fala direto com o banco |
>
> **O que vale hoje:**
> - a fonte da verdade sobre a stack são os `package.json`;
> - as regras de arquitetura estão no `CLAUDE.md` da raiz;
> - o dossiê do login Google e do Painel de Engenharia está em
>   `apps/mobile-app/AGENTS.md`.
>
> O conteúdo original segue abaixo, **sem alterações**, como registro do que foi
> pedido na v9 — as marcações "v9 NOVO" continuam corretas naquilo que dizem:
> em que versão cada peça entrou.

---

CONTEXTO DO PROJETO:
Repositório Monorepo com 3 aplicações:
1. apps/admin-web (Next.js - Web)
2. apps/mobile-app (React Native + Expo - Mobile)
3. packages/core (Shared)

FOCO DESTE PROMPT: apps/mobile-app APENAS

===== CONFIGURAÇÃO DO PROJETO (v9 - HISTÓRICO) =====

Estrutura do apps/mobile-app como descrita na v9:
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
│   │   ├── index.tsx (v9: condicional por papel — ClientDashboard ou DeveloperDashboard)
│   │   ├── perfil.tsx (v9: segunda aba — ProfileScreen)
│   │   └── _layout.tsx (v9: NativeTabs — Bottom Tab Navigator nativo iOS/Android)
│   ├── _layout.tsx (root) (v9: ThemeAnimationProvider + GestureRoot + usePermissionWatch)
│   ├── +html.tsx
│   ├── +not-found.tsx
│   └── modal.tsx
├── src/
│   ├── assets/
│   ├── components/ (auth, button, card, input, client, developer, icon, …)
│   ├── constants/ (Colors, Typography, Spacing)
│   ├── context/ (ThemeAnimationContext)
│   ├── hooks/ (auth/, useBiometrics, useSessionRole, useNativeActionSheet, …)
│   ├── lib/ (authErrors, googleOAuthMobile, gestureRuntime, oauthCallbackSession)
│   ├── screens/ (ProfileScreen, AboutScreen, SupportScreen, admin/)
│   └── services/ (logoutService, storageService, errorService)

DEPENDÊNCIAS (confirmadas no package.json):
- React Native 0.86.3
- Expo ~57.0.20
- Expo Router ~57.0.19
- react-native-gesture-handler ~3.2.1
- react-native-reanimated 4.5.1
- react-native-worklets 0.10.1
- @react-navigation/native ^7.1.8
- react-native-safe-area-context ~5.7.0
- react-native-screens ~4.26.0
- expo-local-authentication ~57.0.2
- @expo/vector-icons ^15.0.2

===== REQUISITOS DE DESENVOLVIMENTO (v9) =====

1. DETECÇÃO DE PLATAFORMA: sempre `Platform.OS`; usar o hook `usePlatform()`.
2. SAFE AREA: `SafeAreaView` de `react-native-safe-area-context`, nunca o do core.
3. NAVEGAÇÃO: Expo Router; `(pasta)` é grupo e não aparece na URL.
4. CORES: `src/constants/Colors.ts`; nunca hexadecimal solto.
5. AUTENTICAÇÃO: hooks de `src/hooks/auth/`.
6. BIOMETRIA: `src/hooks/useBiometrics.ts`.
7. ARMAZENAMENTO SEGURO: tokens no SecureStore.
   ⚠️ v10: a sessão do Supabase saiu do AsyncStorage e passou a ser gravada no
   SecureStore em pedaços — ver `src/services/storageService.ts`.
8. LOGOUT: `src/services/logoutService.ts`.
9. TECLADO: `KeyboardAvoidingView` + `useKeyboardOpen()`.
10. GESTOS: `GestureRoot`/`GestureArea` com detecção em `lib/gestureRuntime.ts`.
11. ANIMAÇÕES: Reanimated, nunca o `Animated` clássico.
12. COMPONENTES: `Component.tsx` + `.styles.ts` + `.types.ts`.
13. HOOKS: um arquivo por responsabilidade.
14. TIPOS: sem `any`.
15./16. ESTRUTURA DE ARQUIVO para componente e tela.
17. PADRÃO: funcionais com hooks, TypeScript, comentários em português.
18. PERFORMANCE: `memo`, `useMemo`, `useCallback`, `FlatList`.
19. ERROS: `errorService` + `authErrors`.
20. SUPABASE: sempre pelos serviços do `packages/core`.

===== v9: REQUISITOS "100% NATIVO" =====

21. NATIVE TABS — `expo-router/unstable-native-tabs`; abas por papel.
22. NATIVE ACTION SHEETS — `useNativeActionSheet` (⚠️ máximo 3 ações no Android;
    ⚠️ v10: passar lista VAZIA faz o menu não aparecer — foi um bug real no
    SupportScreen, corrigido).
23. NATIVE CONTEXT MENU — `useNativeContextMenu` no `onLongPress`.
24. APP LIFECYCLE & REALTIME — `usePermissionWatch` com `AppState`.
25. PROFILE SCREEN — `src/screens/ProfileScreen.tsx`.
    ⚠️ v10: o Desenvolvedor TAMBÉM tem perfil agora (virou usuário real).
26. INSTITUTIONAL FOOTER — dentro do conteúdo, acima da barra nativa.
27. THEME ANIMATION CONTEXT — white-label com shared values.
28. GESTURE RUNTIME — `TurboModuleRegistry.get('RNGestureHandlerModule')`.
29. GESTURE ROOT — wrapper que vira `View` quando não há gestos.
30. AMBIENTES — Expo Go, development build e produção.
    ⚠️ v10: o login Google exige development build; no Expo Go ele NÃO funciona.

===== GERAR SEMPRE =====

✅ TypeScript type-safe · estrutura do projeto · comentários em português
✅ Detecção iOS/Android · SafeAreaView · componentes reutilizáveis
✅ Sem dependências desnecessárias · Material 3 (Android) + HIG (iOS)

===== NUNCA GERAR =====

❌ Código sem tipos · estilos hardcoded por plataforma · navegação fora do Expo Router
❌ Screens sem SafeAreaView · cores hardcoded · `Animated` clássico
❌ `GestureHandlerRootView` direto · `@react-navigation/bottom-tabs` instalado
❌ Action sheets customizados · rodapé embaixo da barra nativa
❌ (v10) chave de serviço no aparelho · rota HTTP sem autenticação · papel de
   acesso lido do cofre local como se fosse autorização

===== HISTÓRICO DE VERSÕES =====

v8 (2026-09-06-01): Gesture Handler removido; abas customizadas; rodapé abaixo da barra.

v9 (2026-09-06/07): Gesture Handler de volta via `GestureRoot`; NativeTabs; rodapé
dentro do conteúdo; action sheets e context menus nativos; ProfileScreen;
ThemeAnimationContext; AppState listener; `useSessionRole`; Button/Card/Input;
login Google por deep link com development build.

v10 (2026-09-11): correções de segurança e integridade — Desenvolvedor virou
usuário real do Supabase (`is_superuser`), rotas `/api/admin/*` e
`adminApiService` removidos, sessão no SecureStore, `allowed_modules` virou
`text[]`, datas corrigidas, auditoria no banco, testes automatizados. Ver o
`CLAUDE.md` da raiz.
