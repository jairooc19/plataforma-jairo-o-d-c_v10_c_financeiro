import { StyleSheet } from 'react-native';
import { BRAND, BRAND_DARK, PLATFORM, elevacao } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, TOQUE, RAIO } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS DO CARTÃO DE MENU (PJODC v10)
 * Local: apps/mobile-app/src/components/card/MenuCard.styles.ts
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 */
export const menuCardStyles = StyleSheet.create({
  /**
   * ⚠️ SEM `borderWidth`. A separação do cartão em relação ao fundo vem da
   * SOMBRA, e só dela. Cartão branco com contorno cinza sobre fundo cinza é o
   * desenho de uma `<div>` com `border: 1px solid #ddd` — some a impressão de
   * profundidade e sobra a de documento. Sombra sem borda é o que as duas
   * plataformas fazem nativamente.
   */
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    paddingVertical: ESPACO.lg,
    paddingHorizontal: ESPACO.lg,
    gap: ESPACO.md,
    minHeight: TOQUE.grande + ESPACO.lg,
    ...elevacao(2),
  },

  /**
   * 🎯 A TINTA POR TRÁS DO ÍCONE é o que separa este cartão de um item de lista
   * com decoração. O quadrado colorido dá ao ícone uma massa própria — ele para
   * de flutuar ao lado do texto e passa a ser o âncora visual da linha, que é a
   * função que esta refatoração lhe deu.
   */
  tintaIcone: {
    width: TOQUE.grande,
    height: TOQUE.grande,
    borderRadius: PLATFORM.radiusControl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** `flex: 1` para o texto empurrar o chevron até a borda direita. */
  textos: { flex: 1 },

  titulo: {
    ...TIPOGRAFIA.secao,
    marginBottom: 2,
  },

  descricao: TIPOGRAFIA.legenda,

  /**
   * O chevron NÃO ganha `flex`: ele toma só a sua largura e fica colado à
   * direita porque o bloco de texto ocupa o resto. Alinhá-lo com `marginLeft:
   * 'auto'` daria o mesmo resultado hoje e quebraria no dia em que o título
   * ficar longo o bastante para não caber.
   */
  chevron: { opacity: 0.6 },

  /**
   * Selo de recurso futuro. Pílula, e não retângulo: em ambas as plataformas a
   * forma de pílula é reservada a ESTADO (etiqueta, contador, distintivo), e o
   * retângulo a AÇÃO. A forma já diz que não há nada a tocar aqui.
   */
  selo: {
    backgroundColor: BRAND.surfaceVariant,
    paddingHorizontal: ESPACO.sm,
    paddingVertical: ESPACO.xs,
    borderRadius: RAIO.pilula,
  },
  seloTexto: {
    ...TIPOGRAFIA.dica,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: BRAND.textMuted,
  },

  /**
   * ⚠️ O CARTÃO INATIVO PERDE A SOMBRA JUNTO COM A OPACIDADE. Manter a elevação
   * num cartão apagado produz o pior dos dois mundos: ele continua parecendo
   * levantado — logo, tocável — enquanto o conteúdo diz que não é. Sombra é
   * promessa de interação.
   */
  inativo: {
    opacity: 0.55,
    ...elevacao(1),
  },
});

/**
 * 🌑 AS CORES QUE MUDAM ENTRE AS DUAS PALETAS.
 *
 * Só cor — forma, folga e altura são as mesmas no claro e no escuro, e por isso
 * continuam no `StyleSheet` acima. Duplicar a geometria aqui criaria duas
 * definições do mesmo cartão que envelheceriam separadas.
 *
 * ⚠️ NO ESCURO O CARTÃO USA A SUPERFÍCIE 2, não a 1. Ele é empilhado sobre o
 * fundo da tela, mas o painel também tem blocos em `surface` (superfície 1) — se
 * os dois usassem a mesma cor, cartão e bloco se fundiriam numa mancha só.
 */
export const menuCardPaleta = {
  claro: {
    fundo: BRAND.surface,
    titulo: BRAND.text,
    descricao: BRAND.textMuted,
    chevron: BRAND.textFaint,
    seloFundo: BRAND.surfaceVariant,
    seloTexto: BRAND.textMuted,
    iconeInativo: BRAND.textMuted,
  },
  escuro: {
    fundo: BRAND_DARK.surfaceHigh,
    titulo: BRAND_DARK.text,
    descricao: BRAND_DARK.textMuted,
    chevron: BRAND_DARK.textFaint,
    seloFundo: BRAND_DARK.border,
    seloTexto: BRAND_DARK.textMuted,
    iconeInativo: BRAND_DARK.textMuted,
  },
} as const;
