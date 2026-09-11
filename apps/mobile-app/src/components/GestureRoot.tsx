import React from 'react';
import { View, type ViewProps } from 'react-native';
import { GESTOS_NATIVOS, carregarGestos } from '@/lib/gestureRuntime';

/**
 * 🚪 RAIZ DA ÁRVORE DE GESTOS (PJODC v10)
 * Local: apps/mobile-app/src/components/GestureRoot.tsx
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Gesture Handler: `GestureHandlerRootView` real em dev e production builds
 * - Expo Go: um `View` comum, e o app arranca igual
 *
 * ✅ ESTE É O `GestureHandlerRootView` QUE A v8 TINHA ARRANCADO — de volta, mas
 * atrás de um comutador. O motivo da remoção continua válido (a v3 da biblioteca
 * não roda no Expo Go); o que muda na v9 é que o caminho com gestos deixou de
 * ser exclusivo do outro. Ver o cabeçalho de `lib/gestureRuntime.ts` para o
 * porquê de `require()` e não `import`.
 *
 * 🎯 POR QUE UM COMPONENTE SÓ PARA ISTO, em vez de resolver dentro do
 * `_layout.tsx`: o layout raiz é o primeiro nó da árvore e o mais caro de
 * errar. Deixá-lo com um ternário de `require` no meio do JSX misturaria
 * "montar o app" com "descobrir o ambiente" — duas responsabilidades, um
 * arquivo, exatamente o que a regra de ouro proíbe. Aqui a decisão é tomada
 * uma vez e o layout só monta o resultado.
 *
 * ⚠️ A ESCOLHA É FEITA NO NÍVEL DO MÓDULO, DE PROPÓSITO. Resolvê-la dentro do
 * corpo do componente devolveria um tipo de componente potencialmente novo a
 * cada render, e o React desmontaria e remontaria a árvore INTEIRA por baixo —
 * o app piscaria e todo estado de tela se perderia. Como o ambiente não muda no
 * meio da execução, a constante é a forma correta.
 *
 * 📐 `GestureHandlerRootView` aceita as mesmas props de um `View`, então a
 * troca é transparente para quem monta: `style`, `children` e o resto passam
 * direto nos dois caminhos.
 */
const Raiz: React.ComponentType<ViewProps> =
  carregarGestos()?.GestureHandlerRootView ?? View;

export default function GestureRoot({ children, ...props }: ViewProps) {
  return <Raiz {...props}>{children}</Raiz>;
}

/**
 * Reexportado para quem precisa DECIDIR (e não apenas montar) — o
 * `SearchableSelect` usa isto para saber se deve desenhar a alça de arrasto.
 * Prometer visualmente um gesto que não existe é pior do que não o oferecer.
 */
export { GESTOS_NATIVOS };
