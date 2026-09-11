import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface CardProps {
  children: ReactNode;
  /** Sem sombra nem borda — para cartões aninhados dentro de outro cartão. */
  plano?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
