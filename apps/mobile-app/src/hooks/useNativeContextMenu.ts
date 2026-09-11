import { useCallback } from 'react';
import {
  useNativeActionSheet,
  type OpcaoDeAcao,
  type ConfigDeAcao,
} from '@/hooks/useNativeActionSheet';

export type ItemDeMenu = OpcaoDeAcao;

interface UseNativeContextMenu {
  /** Abre o menu de contexto do item. Ligue no `onLongPress`. */
  abrir: (itens: ItemDeMenu[], config?: ConfigDeAcao) => void;
}

/**
 * 📎 MENU DE CONTEXTO — O QUE APARECE AO SEGURAR (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useNativeContextMenu.ts
 *
 * v9: [100% NATIVO — HOOK]
 * - iOS: menu do `UIAlertController`, desenhado pelo sistema
 * - Android: `AlertDialog` do Material, desenhado pelo sistema
 * - Zero dependências novas
 *
 * 🪞 ESTE HOOK É UMA FACHADA FINA SOBRE `useNativeActionSheet`, E ISSO É O
 * PONTO. Segurar um item e escolher uma ação é, do ponto de vista do sistema, o
 * mesmo menu — o que muda é o gesto que o abre, e o gesto pertence ao
 * componente, não ao menu. Duplicar a lógica de `Platform.OS` aqui daria duas
 * cópias para manter e dois lugares para errar o índice do botão.
 *
 * ⚠️ **ISTO NÃO É O `UIMenu` DO iOS 13, e é importante não prometer que é.** O
 * `UIMenu` de verdade — aquele que escurece o fundo, levanta o item numa
 * prévia e desenha ícones SF Symbols ao lado de cada ação — **não é exposto
 * pelo React Native**. Chegar até ele exige um módulo nativo (por exemplo
 * `react-native-context-menu-view`), o que significa mais uma dependência
 * nativa, mais uma peça a recompilar a cada SDK e nenhuma cobertura decente no
 * Android. O que este hook entrega é o menu do sistema pelo caminho que já
 * existe no núcleo — nativo de verdade, só sem a prévia levantada.
 *
 * 🧭 SE UM DIA O `UIMenu` FOR MESMO NECESSÁRIO: a troca acontece INTEIRA aqui
 * dentro, porque as telas só conhecem `abrir(itens)`. Foi para isso que a
 * fachada existe.
 *
 * 🎯 Uso típico, no `onLongPress` de um item de lista:
 *
 * ```tsx
 * const { abrir } = useNativeContextMenu();
 *
 * <Pressable
 *   onLongPress={() =>
 *     abrir([
 *       { titulo: 'Editar', aoTocar: editar },
 *       { titulo: 'Excluir', aoTocar: excluir, destrutiva: true },
 *     ], { titulo: item.nome })
 *   }
 * >
 * ```
 *
 * ⚠️ Lembre-se do teto de três ações no Android — ele vale aqui igual, porque é
 * o mesmo `AlertDialog`. Ver o cabeçalho de `useNativeActionSheet`.
 */
export function useNativeContextMenu(): UseNativeContextMenu {
  const { mostrar } = useNativeActionSheet();

  const abrir = useCallback(
    (itens: ItemDeMenu[], config?: ConfigDeAcao) => mostrar(itens, config),
    [mostrar]
  );

  return { abrir };
}
