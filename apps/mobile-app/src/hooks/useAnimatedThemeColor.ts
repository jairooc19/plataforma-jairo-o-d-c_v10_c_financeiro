import { useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import { useThemeAnimation, type CorDeTema } from '@/context/ThemeAnimationContext';

/**
 * 🎨 UMA COR DO WHITE-LABEL, JÁ ANIMADA (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useAnimatedThemeColor.ts
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Reanimated: `interpolateColor` dentro de worklet, na thread de UI
 * - Zero re-render: a cor muda sem que o React seja avisado
 *
 * 🧩 COMO USAR — o componente precisa ser `Animated.View`, não `View`:
 *
 * ```tsx
 * const estiloFundo = useEstiloDeFundoAnimado('fundo');
 * return <Animated.View style={[estilos.tela, estiloFundo]}>…</Animated.View>;
 * ```
 *
 * ⚠️ UM `View` COMUM IGNORA ESTE ESTILO EM SILÊNCIO. O objeto devolvido pelo
 * `useAnimatedStyle` só é entendido pelos componentes do Reanimated; num `View`
 * cru ele não gera erro nem aviso — a cor simplesmente nunca muda, e o defeito
 * parece estar no tema.
 *
 * 🎚️ A INTERPOLAÇÃO LÊ AS DUAS PALETAS A CADA QUADRO, e é isso que permite que
 * uma troca de tema no meio de outra não dê salto: `origem` e `destino` são
 * shared values, então o worklet enxerga sempre o par vigente.
 */

/** Estilo animado de `backgroundColor` para a chave de paleta escolhida. */
export function useEstiloDeFundoAnimado(chave: CorDeTema = 'fundo') {
  const { progresso, origem, destino } = useThemeAnimation();

  return useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progresso.value,
      [0, 1],
      [origem.value[chave], destino.value[chave]]
    ),
  }));
}

/** Estilo animado de `color` (texto) para a chave de paleta escolhida. */
export function useEstiloDeTextoAnimado(chave: CorDeTema = 'textoCabecalho') {
  const { progresso, origem, destino } = useThemeAnimation();

  return useAnimatedStyle(() => ({
    color: interpolateColor(
      progresso.value,
      [0, 1],
      [origem.value[chave], destino.value[chave]]
    ),
  }));
}

/** Estilo animado de `borderColor` para a chave de paleta escolhida. */
export function useEstiloDeBordaAnimado(chave: CorDeTema = 'borda') {
  const { progresso, origem, destino } = useThemeAnimation();

  return useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progresso.value,
      [0, 1],
      [origem.value[chave], destino.value[chave]]
    ),
  }));
}
