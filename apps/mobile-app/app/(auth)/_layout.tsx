import { Stack } from 'expo-router';

/**
 * 🚪 LAYOUT DO GRUPO DE AUTENTICAÇÃO (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/_layout.tsx
 *
 * `(auth)` entre parênteses é um GRUPO do Expo Router: organiza os arquivos sem
 * aparecer na URL. Por isso `(auth)/index.tsx` responde em `/`, e não em
 * `/auth` — foi essa a razão de os antigos `app/login.tsx`, `app/index.tsx` e
 * `app/select-tenant.tsx` terem saído de `app/`: colidiam nas mesmas rotas.
 *
 * 🚫 `gestureEnabled: false` NA TELA DE COMPLETAR CADASTRO: o gesto de voltar do
 * iOS é uma saída que a tela não pode ter. Deslizar para trás devolveria o
 * usuário à guarita ainda autenticado, e o portão do `profile_completed` o
 * traria de volta — o mesmo laço que a web evita não desenhando um botão
 * "voltar". A única saída é SAIR, que encerra a sessão.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="complete-profile" options={{ gestureEnabled: false }} />
      <Stack.Screen name="select-tenant" options={{ gestureEnabled: false }} />
      <Stack.Screen name="contact" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
