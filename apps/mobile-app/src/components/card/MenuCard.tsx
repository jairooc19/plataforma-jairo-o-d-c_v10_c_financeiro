import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

import Icon from '@/components/icon/Icon';
import { BRAND } from '@/constants/Colors';
import { ICONE, DURACAO, ESCALONAMENTO } from '@/constants/Spacing';
import { menuCardStyles, menuCardPaleta } from './MenuCard.styles';
import type { MenuCardProps } from './MenuCard.types';

/**
 * 🗂️ CARTÃO DE MENU — A OPÇÃO COMO CARTÃO (PJODC v10)
 * Local: apps/mobile-app/src/components/card/MenuCard.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 *
 * O componente central desta refatoração de design. Os painéis do app mostravam
 * as suas opções como itens de lista com um ícone à esquerda — o desenho que
 * todo site usa. Aqui cada opção é um CARTÃO: ícone grande sobre tinta própria,
 * título, descrição e chevron, com elevação e resposta física ao toque.
 *
 * 🎯 POR QUE ISSO IMPORTA E NÃO É ENFEITE. Numa lista, o alvo tocável é ambíguo
 * — a linha inteira? o texto? — e o usuário confere pelo realce depois de tocar.
 * Num cartão elevado, a área tocável tem borda visível e sombra: dá para saber
 * onde tocar ANTES de tocar. É a diferença entre navegar por leitura e navegar
 * por reconhecimento, e é ela que faz um painel parecer aplicativo em vez de
 * página.
 *
 * ⏳ `emBreve` É UM ESTADO DE PRIMEIRA CLASSE, e não um `disabled` disfarçado.
 * Quatro das seis opções do Painel de Engenharia ainda não têm destino
 * construído; mostrá-las cinzentas com um selo é honesto e mantém o mapa do que
 * vem. A alternativa — escondê-las — faria o painel encolher e crescer a cada
 * versão, e a outra alternativa — deixá-las tocáveis abrindo uma tela vazia — é
 * a que faz o usuário achar que o app travou.
 *
 * 🎞️ A ENTRADA É ESCALONADA POR `indice`. Os cartões aparecem em cascata, de
 * cima para baixo, com 50ms entre eles. É o efeito que faz uma tela "montar" em
 * vez de "piscar" — mas ele tem teto: ver a nota em `ESCALONAMENTO`
 * (`constants/Spacing.ts`) sobre por que não se escalonam listas longas.
 *
 * ⚠️ `FadeInDown` É DECLARATIVO E RODA INTEIRO NA THREAD DE UI. Não há
 * `useEffect`, nem estado, nem `setTimeout` — o que importa porque estes cartões
 * nascem logo depois de uma consulta ao Supabase, quando a thread de JavaScript
 * ainda está ocupada montando o resto da tela. Uma animação de entrada em JS
 * engasgaria exatamente no quadro em que precisa ser fluida.
 */
function MenuCardBase({
  icon,
  title,
  description,
  onPress,
  emBreve = false,
  cor = BRAND.primary,
  indice,
  escuro = false,
  style,
  testID,
}: MenuCardProps) {
  const pressao = useSharedValue(0);
  const paleta = escuro ? menuCardPaleta.escuro : menuCardPaleta.claro;

  /** Sem `onPress` OU marcado como futuro: o cartão não responde ao toque. */
  const inerte = emBreve || !onPress;

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressao.value * 0.02 }],
  }));

  const aoPressionar = useCallback(() => {
    if (inerte) return;
    pressao.value = withSpring(1, { damping: 22, stiffness: 420 });
  }, [pressao, inerte]);

  const aoSoltar = useCallback(() => {
    pressao.value = withTiming(0, { duration: DURACAO.instantanea });
  }, [pressao]);

  /**
   * A tinta do ícone é a cor dele a 12% — calculada aqui e não guardada em
   * `Colors.ts`, porque a cor chega por prop e pode ser qualquer uma.
   *
   * ⚠️ SUFIXO ALFA DE 8 DÍGITOS (`#rrggbbaa`), que o React Native aceita nas
   * duas plataformas. `rgba()` exigiria decompor o hexadecimal em três números;
   * `opacity` no contêiner apagaria o ícone junto com o fundo.
   */
  const tinta = useMemo(() => `${cor}1f`, [cor]);

  const entrada = useMemo(
    () =>
      indice === undefined
        ? undefined
        : FadeInDown.duration(DURACAO.media).delay(indice * ESCALONAMENTO),
    [indice]
  );

  return (
    <Animated.View entering={entrada} style={estiloAnimado}>
      <Pressable
        onPress={inerte ? undefined : onPress}
        onPressIn={aoPressionar}
        onPressOut={aoSoltar}
        disabled={inerte}
        style={[
          menuCardStyles.base,
          { backgroundColor: paleta.fundo },
          inerte && menuCardStyles.inativo,
          style,
        ]}
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          emBreve ? `${title}. ${description}. Recurso ainda não disponível.` : `${title}. ${description}`
        }
        accessibilityState={{ disabled: inerte }}
        /**
         * 🤖 RIPPLE DO MATERIAL NO ANDROID. É a resposta de toque que o sistema
         * desenha para os seus próprios componentes; a escala cuida do iOS, onde
         * ripple não existe e seria estrangeiro. `borderless: false` mantém a
         * onda contida no raio do cartão em vez de vazar pelos cantos.
         */
        android_ripple={inerte ? undefined : { color: `${cor}14`, borderless: false }}
      >
        <View style={[menuCardStyles.tintaIcone, { backgroundColor: tinta }]}>
          <Icon
            name={icon}
            size={ICONE.destaque}
            color={emBreve ? paleta.iconeInativo : cor}
            strokeWidth={1.75}
          />
        </View>

        <View style={menuCardStyles.textos}>
          <Text style={[menuCardStyles.titulo, { color: paleta.titulo }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[menuCardStyles.descricao, { color: paleta.descricao }]} numberOfLines={2}>
            {description}
          </Text>
        </View>

        {emBreve ? (
          <View style={[menuCardStyles.selo, { backgroundColor: paleta.seloFundo }]}>
            <Text style={[menuCardStyles.seloTexto, { color: paleta.seloTexto }]}>EM BREVE</Text>
          </View>
        ) : (
          <Icon
            name="Avancar"
            size={ICONE.medio}
            color={paleta.chevron}
            style={menuCardStyles.chevron}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export const MenuCard = memo(MenuCardBase);
export default MenuCard;
export type { MenuCardProps } from './MenuCard.types';
