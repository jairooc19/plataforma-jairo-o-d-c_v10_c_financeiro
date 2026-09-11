import React, { memo } from 'react';
import { View } from 'react-native';
import { cardStyles } from './Card.styles';
import type { CardProps } from './Card.types';

/**
 * 🃏 CARTÃO — A MOLDURA DE TODO CONTEÚDO (PJODC v10)
 * Local: apps/mobile-app/src/components/card/Card.tsx
 *
 * Substitui as onze ocorrências de `<View style={authStyles.cartao}>`. O ganho
 * não é digitar menos: é que a sombra correta por plataforma passa a existir
 * num lugar só (ver `Card.styles.ts`), em vez de depender de cada tela ter
 * copiado o bloco de `shadow*` inteiro.
 */
function CardBase({ children, plano = false, style, testID }: CardProps) {
  return (
    <View style={[plano ? cardStyles.plano : cardStyles.base, style]} testID={testID}>
      {children}
    </View>
  );
}

export const Card = memo(CardBase);
export default Card;
export type { CardProps } from './Card.types';
