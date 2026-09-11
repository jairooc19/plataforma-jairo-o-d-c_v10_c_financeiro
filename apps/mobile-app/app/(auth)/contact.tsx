import React from 'react';
import { useRouter } from 'expo-router';
import AuthScreen from '@/components/auth/AuthScreen';
import MiscViews from '@/components/auth/MiscViews';

/**
 * 💬 ROTA: FALE CONOSCO (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/contact.tsx
 *
 * Destino do "Fale Conosco" no menu de Ajuda. Mesmo conteúdo do `MiscViews`
 * da web: título "CONTATO", o e-mail de suporte e a volta ao início.
 *
 * `replace` e não `push` no retorno: a guarita já está na base da pilha, e um
 * push criaria uma segunda cópia dela por cima de si mesma.
 */
export default function ContactScreen() {
  const router = useRouter();
  return (
    <AuthScreen>
      <MiscViews view="contact" onBack={() => router.replace('/(auth)')} />
    </AuthScreen>
  );
}
