import { StyleSheet } from 'react-native';
import { BRAND, PLATFORM, elevacao } from '@/constants/Colors';
import { ESPACO } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS DO CARTÃO (PJODC v10)
 * Local: apps/mobile-app/src/components/card/Card.styles.ts
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 *
 * ⚠️ A SOMBRA VEM DE `elevacao()`, e isso é o ponto do arquivo. O iOS desenha
 * sombra por `shadowColor/Opacity/Radius/Offset`; o Android as ignora e só
 * entende `elevation`. Declarar apenas um dos conjuntos deixa metade dos
 * aparelhos com o cartão chapado, e ninguém percebe até abrir o app na outra
 * plataforma.
 *
 * 🚫 A BORDA SAIU NESTA REFATORAÇÃO. O cartão tinha sombra E contorno cinza ao
 * mesmo tempo — os dois cumprindo a mesma função de separar do fundo, e o
 * contorno vencendo a disputa, porque uma linha nítida se impõe sobre um
 * degradê suave. O resultado lia-se como caixa desenhada, não como superfície
 * levantada. Sombra sozinha é o que as duas plataformas fazem.
 *
 * 📏 O RECHEIO CAIU DE 28 PARA 24. Vinte e oito era uma medida fora da grade de
 * 8 e roubava largura útil num aparelho estreito: num telefone de 360dp com
 * margem lateral de 16, um cartão com 28 de recheio deixa 272dp de linha, contra
 * 280 com 24 — e é nesses 8 pontos que um rótulo de duas palavras cabe ou quebra.
 */
export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.xl,
    ...elevacao(2),
  },

  /**
   * Cartão dentro de cartão: sem sombra e sem elevação, porque sombra sobre
   * branco dentro de branco vira sujeira. A separação aqui é o fundo cinza.
   */
  plano: {
    backgroundColor: BRAND.surfaceVariant,
    borderRadius: PLATFORM.radiusControl,
    padding: ESPACO.md,
  },
});
