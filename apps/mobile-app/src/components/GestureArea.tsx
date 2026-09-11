import React from 'react';
import { carregarGestos } from '@/lib/gestureRuntime';

type ModuloGestos = ReturnType<typeof carregarGestos>;
type GestoPan = ReturnType<NonNullable<ModuloGestos>['Gesture']['Pan']>;

const Detector = carregarGestos()?.GestureDetector ?? null;

/**
 * ✋ ZONA SENSÍVEL A GESTO (PJODC v10)
 * Local: apps/mobile-app/src/components/GestureArea.tsx
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Gesture Handler: `GestureDetector` real em dev e production builds
 * - Expo Go: some da árvore e entrega os filhos crus
 *
 * 🫥 QUANDO NÃO HÁ GESTO, ESTE COMPONENTE NÃO DEIXA RASTRO. Devolve os filhos
 * dentro de um fragmento — nenhum `View` extra. Isso importa porque um `View`
 * a mais no meio de um layout com `flex` muda medidas e pode alterar o desenho
 * da tela só no Expo Go, o que produz o pior tipo de bug: o que só aparece no
 * ambiente onde você não estava olhando.
 *
 * ⚠️ `GestureDetector` EXIGE UM ÚNICO FILHO capaz de receber `ref`. Um
 * fragmento, um texto solto ou dois irmãos fazem a biblioteca reclamar em tempo
 * de execução. Passe sempre um `View` (ou `Animated.View`) único.
 *
 * A resolução é de módulo, pelo mesmo motivo do `GestureRoot`: um tipo de
 * componente estável evita remontagem da subárvore a cada render.
 */
export default function GestureArea({
  gesto,
  children,
}: {
  gesto: GestoPan | null;
  children: React.ReactNode;
}) {
  if (!Detector || !gesto) return <>{children}</>;
  return <Detector gesture={gesto}>{children}</Detector>;
}
