import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export interface Dimensions {
  width: number;
  height: number;
  /** Largura < 360dp: aparelho estreito, onde grade de 2 colunas não cabe. */
  isCompact: boolean;
  /** Largura ≥ 768dp: tablet. O mesmo corte que o `useIsMobile` da web usa. */
  isTablet: boolean;
  isLandscape: boolean;
}

/**
 * 📐 MEDIDAS DA JANELA (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useDimensions.ts
 *
 * Envelope sobre `useWindowDimensions` que devolve as três perguntas que as
 * telas de fato fazem, em vez do par de números cru.
 *
 * ⚠️ `useWindowDimensions` (hook), NUNCA `Dimensions.get('window')` (função). A
 * função lê o valor UMA VEZ, no render em que foi chamada, e não reavalia: gira
 * o aparelho, abre a tela dividida do Android ou aparece o teclado, e o layout
 * fica com a medida antiga. O hook reassina o evento de mudança sozinho.
 *
 * 📏 OS CORTES SÃO EM dp, NÃO EM PIXELS. `useWindowDimensions` já devolve
 * unidades independentes de densidade — 768 aqui é o mesmo `md` do Tailwind que
 * o `useIsMobile.ts` do admin-web usa, e é por isso que os dois concordam sobre
 * o que é um tablet.
 */
export function useDimensions(): Dimensions {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      isCompact: width < 360,
      isTablet: width >= 768,
      isLandscape: width > height,
    }),
    [width, height]
  );
}
