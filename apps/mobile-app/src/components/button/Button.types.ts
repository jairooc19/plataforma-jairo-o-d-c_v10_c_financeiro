import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';
import type { NomeIcone } from '@/components/icon/Icon';

/**
 * Variantes visuais do botão.
 *
 * `primary`   → ação principal da tela. UMA por tela. Fundo cheio, azul-marca.
 * `secondary` → alternativa de mesmo peso. Fundo cinza claro, sem borda.
 * `outline`   → mesma hierarquia da `secondary`, mas sobre fundo já colorido,
 *               onde um cinza sobre cinza desapareceria. Só contorno.
 * `danger`    → ação destrutiva. Usa o vermelho da PLATAFORMA (#FF3B30 no iOS,
 *               #B3261E no Android), não o da marca: destruir é convenção do
 *               sistema, e o usuário a reconhece pelo aparelho que tem.
 * `ghost`     → link disfarçado de botão ("← Voltar"). Sem fundo, sem borda.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

/**
 * Alturas do botão.
 *
 * ⚠️ NENHUMA DELAS DESCE ABAIXO DE 40pt, e a `small` já é o piso. O Material
 * pede 48dp e o HIG pede 44pt de alvo tocável; a `small` fica abaixo dos dois de
 * propósito, e só deve ser usada quando o botão está DENTRO de uma linha já
 * tocável (o alvo real é a linha, não ele). Botão solto usa `medium` ou
 * `large`.
 */
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  /** Texto do botão. */
  title: string;
  onPress: () => void;

  variant?: ButtonVariant;
  /** Padrão: `medium` (48pt). */
  size?: ButtonSize;

  /** Troca o texto por um indicador e bloqueia o toque. */
  loading?: boolean;
  disabled?: boolean;

  /**
   * Ícone pelo nome do registro (`components/icon/Icon.tsx`).
   *
   * 🎨 A COR DELE É HERDADA DA VARIANTE e não se declara aqui. Um ícone com cor
   * própria dentro de um botão de fundo cheio é o caminho mais curto para texto
   * branco ao lado de ícone azul — que foi exatamente o que aconteceu nas telas
   * antes desta refatoração.
   */
  icon?: NomeIcone;
  /** Padrão: `'left'`. Use `'right'` só para avanço ("Continuar →"). */
  iconPosition?: 'left' | 'right';

  /**
   * Escotilha para um ícone que o registro não cobre — hoje só a marca "G" do
   * Google, que é letra, não ícone. Prefira `icon` sempre que der.
   */
  icone?: ReactNode;

  /** Ocupa toda a largura disponível. Padrão: `true`. */
  fullWidth?: boolean;

  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;

  /** Identificador para testes automatizados. */
  testID?: string;
  /**
   * Rótulo lido por leitor de tela. Quando ausente, o `title` é usado — mas
   * informe-o quando o texto visível não bastar ("G" precisa virar
   * "Entrar com Google").
   */
  accessibilityLabel?: string;
}
