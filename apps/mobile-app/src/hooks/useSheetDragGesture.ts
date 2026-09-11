import { useCallback, useMemo } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import { carregarGestos } from '@/lib/gestureRuntime';

/** Quanto o dedo precisa descer, em dp, para que soltar signifique "fechar". */
const LIMIAR_FECHAR = 100;

/** Mola do retorno. Firme o bastante para não parecer gelatina. */
const MOLA = { damping: 20, stiffness: 220 } as const;

type ModuloGestos = ReturnType<typeof carregarGestos>;
type GestoPan = ReturnType<NonNullable<ModuloGestos>['Gesture']['Pan']>;

interface ArrastoDeFolha {
  /** O gesto a entregar ao `GestureDetector`, ou `null` sem gestos nativos. */
  gesto: GestoPan | null;
  /**
   * Estilo animado do painel. Inerte quando não há gesto.
   *
   * ⚠️ O GENÉRICO `<ViewStyle>` É OBRIGATÓRIO. Sem ele, `useAnimatedStyle`
   * infere `DefaultStyle` — a união de estilos de View, Text e Image — e o
   * `Animated.View`, que só aceita estilo de View, recusa o valor. O erro não
   * aparece de imediato: ele só surge quando o programa cresce o bastante para
   * a inferência do array `[estilo, estiloAnimado]` deixar de resolver a favor.
   */
  estiloAnimado: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  /** Há gesto de verdade? Quem desenha a alça de arrasto pergunta isto. */
  disponivel: boolean;
  /** Devolve o painel à posição de repouso, sem animação. */
  reposicionar: () => void;
}

/**
 * ✋ ARRASTAR A FOLHA PARA BAIXO PARA FECHAR (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useSheetDragGesture.ts
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Gesture Handler: `Gesture.Pan` em dev e production builds
 * - Reanimated: o arrasto corre na thread de UI, sem passar pelo JS
 * - Expo Go: `gesto` sai `null` e a folha continua fechando por toque/botão
 *
 * 🧵 POR QUE ISTO É RÁPIDO: o dedo move o painel sem que o thread de JavaScript
 * seja consultado. `translateY` é um valor compartilhado do Reanimated, lido e
 * escrito por worklets que rodam na thread de UI — o painel acompanha o dedo a
 * 60/120fps mesmo que o JS esteja ocupado filtrando 5.570 municípios. Só o
 * instante de "fechou" atravessa para o JS, via `runOnJS`, uma vez por gesto.
 *
 * 🎯 O GESTO É PARA A ALÇA, NÃO PARA A FOLHA INTEIRA — e isso é deliberado.
 * O painel contém uma `FlatList`; um `Pan` sobre ela disputaria cada rolagem
 * com o gesto de fechar, e o usuário veria a folha descer quando quis apenas
 * rolar a lista. Prender o `Pan` à alça é a convenção que as folhas nativas já
 * usam, e elimina a disputa em vez de tentar arbitrá-la com offsets.
 *
 * ⬇️ SÓ DESCE. `Math.max(0, …)` no `onUpdate` ignora o arrasto para cima: sem
 * isso a folha subiria, descolando do rodapé e mostrando uma faixa de fundo
 * onde deveria haver painel.
 *
 * ♻️ `reposicionar` existe porque a folha é reaberta, não recriada. Sem zerar o
 * deslocamento no fechamento, a abertura seguinte nasceria deslocada para baixo
 * — o `withSpring(0)` do `onEnd` anima um painel que já está desmontando e não
 * chega a valer.
 */
export function useSheetDragGesture(aoFechar: () => void): ArrastoDeFolha {
  const deslocamentoY: SharedValue<number> = useSharedValue(0);

  const modulo = carregarGestos();
  const Gesture = modulo?.Gesture ?? null;

  const reposicionar = useCallback(() => {
    deslocamentoY.value = 0;
  }, [deslocamentoY]);

  const gesto = useMemo(() => {
    if (!Gesture) return null;

    return Gesture.Pan()
      .onUpdate((e) => {
        'worklet';
        deslocamentoY.value = Math.max(0, e.translationY);
      })
      .onEnd((e) => {
        'worklet';
        if (e.translationY > LIMIAR_FECHAR) {
          // Fecha primeiro e zera em seguida: o painel some, e a próxima
          // abertura encontra o deslocamento já em zero.
          runOnJS(aoFechar)();
          deslocamentoY.value = 0;
          return;
        }
        deslocamentoY.value = withSpring(0, MOLA);
      });
  }, [Gesture, deslocamentoY, aoFechar]);

  const estiloAnimado = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateY: deslocamentoY.value }],
  }));

  return { gesto, estiloAnimado, disponivel: gesto !== null, reposicionar };
}
