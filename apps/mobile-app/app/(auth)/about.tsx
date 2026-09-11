import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import MiscViews from '@/components/auth/MiscViews';

/**
 * ℹ️ ROTA: SOBRE / AVISO (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/about.tsx
 *
 * Atende duas telas informativas com o mesmo formato: "Sobre a Plataforma" e o
 * aviso do acesso "Apenas Veja" (`?modo=viewer-only`), que não é um login e por
 * isso não tem tela de credencial — só a informação de que falta liberação.
 */
export default function AboutScreen() {
  const router = useRouter();
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const view = modo === 'viewer-only' ? 'viewer-only' : 'about';

  return (
    <AuthScreen>
      <MiscViews view={view} onBack={() => router.replace('/(auth)')} />
    </AuthScreen>
  );
}
