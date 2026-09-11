import React, { useCallback } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useNativeContextMenu, type ItemDeMenu } from '@/hooks/useNativeContextMenu';
import type { ConfigDeAcao } from '@/hooks/useNativeActionSheet';

interface Props {
  itens: ItemDeMenu[];
  config?: ConfigDeAcao;
  /** Toque curto. Segurar continua abrindo o menu. */
  aoTocar?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * 📎 SEGURE PARA ABRIR O MENU DO SISTEMA (PJODC v10)
 * Local: apps/mobile-app/src/components/NativeContextMenu.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 * - O menu é desenhado pelo sistema operacional, não por nós
 * - `onLongPress` do `Pressable`, sem gesture-handler: funciona no Expo Go também
 *
 * 🤝 POR QUE `Pressable` E NÃO `Gesture.LongPress`: um menu de contexto não
 * precisa acompanhar o dedo — ele abre e o sistema assume. O `Pressable` do
 * núcleo já reconhece o toque longo, e usá-lo mantém este componente funcionando
 * em TODOS os ambientes, inclusive no Expo Go, onde o gesture-handler está fora
 * (ver `lib/gestureRuntime.ts`). Gastar um gesto da thread de UI aqui seria
 * pagar caro por nada.
 *
 * ♿ `accessibilityHint` ANUNCIA O TOQUE LONGO. Sem isso, quem usa VoiceOver ou
 * TalkBack não tem como descobrir que o item esconde ações — o menu existiria
 * só para quem enxerga a tela.
 *
 * 🎯 Uso:
 *
 * ```tsx
 * <NativeContextMenu
 *   itens={[
 *     { titulo: 'Editar', aoTocar: editar },
 *     { titulo: 'Excluir', aoTocar: excluir, destrutiva: true },
 *   ]}
 *   config={{ titulo: empresa.nome }}
 * >
 *   <LinhaDaEmpresa empresa={empresa} />
 * </NativeContextMenu>
 * ```
 */
export default function NativeContextMenu({
  itens,
  config,
  aoTocar,
  style,
  children,
}: Props) {
  const { abrir } = useNativeContextMenu();

  const aoSegurar = useCallback(() => abrir(itens, config), [abrir, itens, config]);

  return (
    <Pressable
      style={style}
      onPress={aoTocar}
      onLongPress={aoSegurar}
      accessible
      accessibilityHint="Toque e segure para ver as ações disponíveis"
    >
      {children}
    </Pressable>
  );
}
