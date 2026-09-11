import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import type { GlobalSettings } from '@jairo/core';
import { BRAND } from '@/constants/Colors';

/**
 * As cores do white-label que valem a pena animar. É um subconjunto de
 * `GlobalSettings` de propósito: `system_title` e `admin_emails` não são cor, e
 * `color_footer_*` não tem rodapé no mobile.
 */
export interface PaletaAnimavel {
  fundo: string;
  cabecalho: string;
  textoCabecalho: string;
  borda: string;
}

/** Chaves interpoláveis — o que `useCorDeTemaAnimada` aceita. */
export type CorDeTema = keyof PaletaAnimavel;

interface ThemeAnimationContextType {
  /** 0 = paleta de origem, 1 = paleta de destino. É o que anima. */
  progresso: SharedValue<number>;
  /** De onde a transição parte (a paleta que estava valendo). */
  origem: SharedValue<PaletaAnimavel>;
  /** Para onde vai (a paleta recém-chegada do banco). */
  destino: SharedValue<PaletaAnimavel>;
  /** Recebe `global_settings` e dispara a transição. Ignora repetições. */
  atualizarTema: (settings: GlobalSettings | null) => void;
}

const ThemeAnimationContext = createContext<ThemeAnimationContextType | null>(null);

/** Paleta de partida: a marca compilada, antes de o banco responder. */
const PALETA_BASE: PaletaAnimavel = {
  fundo: BRAND.background,
  cabecalho: BRAND.surface,
  textoCabecalho: BRAND.text,
  borda: BRAND.border,
};

/** Duração da transição. Curta o bastante para não parecer lentidão. */
const DURACAO_MS = 320;

/** Converte o registro do banco na paleta animável, com reserva por campo. */
function extrairPaleta(settings: GlobalSettings | null): PaletaAnimavel {
  if (!settings) return PALETA_BASE;
  return {
    fundo: settings.color_bg_general || PALETA_BASE.fundo,
    cabecalho: settings.color_header_bg || PALETA_BASE.cabecalho,
    textoCabecalho: settings.color_header_text || PALETA_BASE.textoCabecalho,
    borda: settings.color_button_border || PALETA_BASE.borda,
  };
}

/**
 * 🎨 THEME ANIMATION PROVIDER — WHITE-LABEL DINÂMICO (PJODC v10)
 * Local: apps/mobile-app/src/context/ThemeAnimationContext.tsx
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Reanimated: a interpolação de cor roda na thread de UI, sem re-render
 * - Shared Values: trocar de paleta não remonta componente nenhum
 *
 * 🎯 O PROBLEMA QUE ELE RESOLVE: as cores desta plataforma vêm do banco
 * (`global_settings`), e o `app/_layout.tsx` já as lê no arranque. Hoje elas
 * chegam de uma vez e a tela troca de cor num piscar. Quando o white-label
 * passar a mudar com o app aberto, esse piscar vira defeito visível — e a
 * correção óbvia (guardar a cor num `useState` e animar em JS) custaria um
 * re-render da árvore inteira a cada quadro.
 *
 * ⚙️ COMO FUNCIONA, E POR QUE SÃO TRÊS VALORES E NÃO UM:
 *   `origem`   guarda a paleta que estava valendo;
 *   `destino`  guarda a que acabou de chegar;
 *   `progresso` anda de 0 a 1 e é a ÚNICA coisa que anima.
 * Cada componente interessado interpola entre `origem` e `destino` usando
 * `progresso`, dentro de um worklet. Nenhum `setState`, nenhum render: as cores
 * mudam na thread de UI, do mesmo jeito que uma animação de transform.
 *
 * ⚠️ INTERPOLAR EXIGE OS DOIS EXTREMOS AO MESMO TEMPO. É por isso que a paleta
 * antiga não é simplesmente descartada quando a nova chega — sem ela, o
 * `interpolateColor` não teria de onde partir e a cor saltaria, que é
 * exatamente o defeito que este arquivo existe para evitar.
 *
 * 🔁 CHAMADAS REPETIDAS SÃO IGNORADAS. O `_layout` reentrega `settings` a cada
 * render seu; sem a comparação com `assinaturaAtual`, cada um deles reiniciaria
 * a transição do zero e a cor ficaria tremendo enquanto o app tivesse trabalho
 * a fazer.
 *
 * 📌 QUEM CONSOME: por enquanto, ninguém obrigatoriamente — as telas seguem
 * lendo `BRAND` pelo `useTheme`. Este provedor está montado e alimentado, e a
 * adesão é por componente, via `hooks/useAnimatedThemeColor.ts`. É preparação
 * ligada, não código morto: `atualizarTema` já recebe o que o banco devolveu.
 */
export function ThemeAnimationProvider({ children }: { children: React.ReactNode }) {
  const progresso = useSharedValue(1);
  const origem = useSharedValue<PaletaAnimavel>(PALETA_BASE);
  const destino = useSharedValue<PaletaAnimavel>(PALETA_BASE);

  /**
   * Assinatura da última paleta aplicada. Fica num `ref`, e não num shared
   * value, porque quem a compara é o JS — levá-la para a thread de UI seria
   * pagar uma travessia por nada.
   */
  const assinaturaAtual = useRef<string>(JSON.stringify(PALETA_BASE));

  const atualizarTema = useCallback(
    (settings: GlobalSettings | null) => {
      const nova = extrairPaleta(settings);
      const assinatura = JSON.stringify(nova);

      if (assinatura === assinaturaAtual.current) return;
      assinaturaAtual.current = assinatura;

      /**
       * A paleta que estava em `destino` vira o novo ponto de partida. Se uma
       * troca chegar no meio de outra, isto faz a transição recomeçar da cor
       * final anterior — um salto de meio caminho, aceitável e raro, contra a
       * alternativa de congelar `origem` na cor de dois temas atrás.
       */
      origem.value = destino.value;
      destino.value = nova;

      progresso.value = 0;
      progresso.value = withTiming(1, {
        duration: DURACAO_MS,
        easing: Easing.out(Easing.cubic),
      });
    },
    [origem, destino, progresso]
  );

  const valor = useMemo(
    () => ({ progresso, origem, destino, atualizarTema }),
    [progresso, origem, destino, atualizarTema]
  );

  return (
    <ThemeAnimationContext.Provider value={valor}>
      {children}
    </ThemeAnimationContext.Provider>
  );
}

/**
 * Porta de entrada do contexto.
 *
 * Lança fora do provedor de propósito: devolver `null` silenciosamente faria a
 * cor simplesmente não animar, e o desenvolvedor procuraria o defeito no
 * Reanimated em vez de na árvore de componentes.
 */
export function useThemeAnimation(): ThemeAnimationContextType {
  const contexto = useContext(ThemeAnimationContext);
  if (!contexto) {
    throw new Error(
      'useThemeAnimation precisa estar dentro de <ThemeAnimationProvider>. ' +
        'Ele é montado em apps/mobile-app/app/_layout.tsx.'
    );
  }
  return contexto;
}
