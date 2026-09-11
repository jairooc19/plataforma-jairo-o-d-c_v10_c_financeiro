import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * ⌨️ O TECLADO ESTÁ ABERTO? (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useKeyboardOpen.ts
 *
 * Serve para esconder o que não cabe enquanto o teclado ocupa metade da tela —
 * rodapé de versão, ilustração de topo — sem que cada tela reescreva a mesma
 * assinatura de eventos.
 *
 * ⚠️ OS NOMES DOS EVENTOS DIFEREM POR PLATAFORMA, e usar os errados é uma falha
 * silenciosa: no iOS existem `keyboardWillShow`/`keyboardWillHide`, que
 * disparam ANTES da animação e por isso deixam a interface se ajustar junto com
 * o teclado; no Android só existem `keyboardDidShow`/`keyboardDidHide`. Assinar
 * `keyboardWillShow` no Android não dá erro — simplesmente nunca dispara, e o
 * rodapé fica visível sob o teclado só naquela plataforma.
 *
 * 🧹 Os dois `remove()` no retorno não são cerimônia: sem eles o listener
 * sobrevive à tela desmontada e chama `setState` num componente que não existe
 * mais — vazamento de memória com aviso no console a cada navegação.
 */
export function useKeyboardOpen(): boolean {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const eventoAbrir = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoFechar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const aoAbrir = Keyboard.addListener(eventoAbrir, () => setAberto(true));
    const aoFechar = Keyboard.addListener(eventoFechar, () => setAberto(false));

    return () => {
      aoAbrir.remove();
      aoFechar.remove();
    };
  }, []);

  return aberto;
}
