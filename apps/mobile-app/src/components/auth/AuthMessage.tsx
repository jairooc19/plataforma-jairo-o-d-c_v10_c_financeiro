import React, { memo } from 'react';
import { Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { authStyles, estiloMensagem } from './authStyles';
import type { FeedbackMessage } from '@/types';

interface Props {
  message: FeedbackMessage | null;
}

/**
 * 💬 CAIXA DE MENSAGEM DA GUARITA (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/AuthMessage.tsx
 *
 * As sete telas de autenticação mostram sucesso, erro e aviso exatamente do
 * mesmo jeito. Um componente só evita que a mensagem de erro do cadastro fique
 * vermelha e a do login, laranja — divergência que só aparece depois de a tela
 * já estar no ar.
 *
 * ⚠️ NÃO USA `Alert` DO REACT NATIVE de propósito: um alerta nativo interrompe,
 * exige toque para sair e some sem deixar rastro. Erro de formulário precisa
 * ficar visível enquanto o usuário corrige o campo — que é o comportamento da
 * web, onde a mensagem vive dentro do cartão.
 *
 * ✨ A ENTRADA É ANIMADA porque a caixa aparece do nada no meio do cartão,
 * empurrando o botão para baixo. Surgir instantaneamente lê-se como um salto de
 * layout; entrar em fade lê-se como resposta ao que o usuário acabou de fazer.
 * `FadeIn` é uma animação declarativa do Reanimated: roda inteira na thread de
 * UI, sem uma linha de estado.
 *
 * ♿ `accessibilityLiveRegion` (Android) e `accessibilityRole="alert"` (iOS)
 * fazem o leitor de tela ANUNCIAR a mensagem quando ela surge. Sem isso um
 * usuário cego toca em "Entrar", nada é dito, e ele não tem como saber que a
 * senha foi recusada.
 */
function AuthMessage({ message }: Props) {
  if (!message) return null;

  const cores = estiloMensagem(message.type);

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[
        authStyles.mensagem,
        { backgroundColor: cores.backgroundColor, borderColor: cores.borderColor },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[authStyles.mensagemTexto, { color: cores.cor }]}>{message.text}</Text>
    </Animated.View>
  );
}

export default memo(AuthMessage);
