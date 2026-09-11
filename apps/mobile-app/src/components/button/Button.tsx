import React, { memo, useCallback, useMemo } from 'react';
import { Text, ActivityIndicator, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import Icon from '@/components/icon/Icon';
import { DURACAO } from '@/constants/Spacing';
import { buttonStyles, estiloVariante, estiloTamanho } from './Button.styles';
import type { ButtonProps } from './Button.types';

/**
 * 🔘 BOTÃO ÚNICO DA PLATAFORMA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/button/Button.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Cinco variantes, três tamanhos, ícone à esquerda ou à direita
 * - Toque com encolhimento E levantamento de sombra, na thread de UI
 *
 * ⚡ A ANIMAÇÃO RODA NA THREAD DE UI, NÃO NA DE JAVASCRIPT. `useSharedValue` e
 * `useAnimatedStyle` são do Reanimated: o valor vive no lado nativo e a
 * interpolação acontece lá, então o encolhimento continua a 60fps mesmo com o
 * JavaScript ocupado — que é exatamente o instante de um login, quando a thread
 * de JS está esperando a rede. Com o `Animated` clássico do React Native o mesmo
 * efeito engasgaria justamente aí, porque cada quadro precisaria de uma ida e
 * volta pela ponte.
 *
 * 🌓 O TOQUE LEVANTA O BOTÃO, ALÉM DE ENCOLHÊ-LO. Só a escala lê-se como um
 * salto; a sombra crescendo junto lê-se como o botão vindo em direção ao dedo,
 * que é a metáfora do Material e o que o iOS faz com o realce dos seus próprios
 * controles. São dois valores compartilhados porque a sombra usa `withTiming`
 * (linear, previsível) e a escala usa `withSpring` (física) — misturá-los num
 * valor só faria a sombra pulsar junto com o repique da mola.
 *
 * ⚠️ A SOMBRA ANIMADA SÓ APARECE ONDE JÁ HÁ SOMBRA. No Android o Reanimated
 * anima `elevation` sem problema; no iOS o que se anima é `shadowOpacity`. Ambos
 * estão no mesmo `useAnimatedStyle` e cada plataforma ignora em silêncio a
 * propriedade que não entende — que aqui é o comportamento desejado, não um
 * descuido.
 *
 * 🎯 `Pressable`, NÃO `TouchableOpacity`. O `TouchableOpacity` anima a opacidade
 * por conta própria, na thread de JS — e essa animação brigaria com a nossa,
 * produzindo um botão que apaga e encolhe ao mesmo tempo. O `Pressable` só
 * reporta os eventos e deixa a aparência conosco.
 *
 * ♿ `accessibilityState` informa ao leitor de tela que o botão está ocupado ou
 * bloqueado. Sem isso o VoiceOver anuncia "Entrar, botão" durante um envio em
 * andamento e o usuário toca de novo, disparando o login duas vezes.
 */
function ButtonBase({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  icone,
  fullWidth = true,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const pressao = useSharedValue(0);
  const inativo = disabled || loading;

  const cores = useMemo(() => estiloVariante(variant), [variant]);
  const medidas = useMemo(() => estiloTamanho(size), [size]);

  /**
   * Um valor só (0 → 1) alimenta as três propriedades. Interpolar a partir de um
   * progresso comum mantém escala e sombra em fase; três valores independentes
   * poderiam terminar em instantes diferentes e produzir um botão pequeno com
   * sombra de botão grande.
   */
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressao.value, [0, 1], [1, 0.96]) }],
    shadowOpacity: interpolate(pressao.value, [0, 1], [0.08, 0.16]),
    elevation: interpolate(pressao.value, [0, 1], [2, 6]),
  }));

  /**
   * `withSpring` na escala e não `withTiming`: o encolhimento de um toque
   * responde à física do gesto, não a uma duração fixa. Toques rápidos em
   * sequência se acumulam suavemente em vez de reiniciar a contagem.
   */
  const aoPressionar = useCallback(() => {
    if (inativo) return;
    pressao.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [pressao, inativo]);

  const aoSoltar = useCallback(() => {
    pressao.value = withTiming(0, { duration: DURACAO.instantanea });
  }, [pressao]);

  const desenhoIcone = icon ? (
    <Icon name={icon} size={medidas.icone} color={cores.cor} strokeWidth={2} />
  ) : (
    icone
  );

  return (
    <Animated.View style={[estiloAnimado, fullWidth && buttonStyles.larguraTotal, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={aoPressionar}
        onPressOut={aoSoltar}
        disabled={inativo}
        style={[
          buttonStyles.base,
          medidas.container,
          cores.container,
          inativo && buttonStyles.desabilitado,
        ]}
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: inativo, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={cores.cor} size="small" />
        ) : (
          <>
            {iconPosition === 'left' && desenhoIcone}
            <Text style={[medidas.texto, { color: cores.cor }, textStyle]} numberOfLines={1}>
              {title}
            </Text>
            {iconPosition === 'right' && desenhoIcone}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * 🧊 `memo` porque o botão é puro: mesmas props, mesma saída. Nas telas de
 * autenticação o formulário re-renderiza a cada tecla digitada, e sem isto os
 * dois ou três botões do cartão seriam reconciliados a cada caractere.
 */
export const Button = memo(ButtonBase);
export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button.types';

/**
 * Espaçador vertical entre botões empilhados.
 *
 * Existe para que as telas parem de escrever `style={{ marginTop: 12 }}` solto —
 * era o literal mais repetido do app antes desta refatoração.
 */
export const EspacoBotao = memo(function EspacoBotao({ altura = 12 }: { altura?: number }) {
  return <View style={{ height: altura }} />;
});
