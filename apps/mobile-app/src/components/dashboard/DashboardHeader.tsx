import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Icon from '@/components/icon/Icon';
import { useGreeting } from '@/hooks/useGreeting';
import { BRAND, BRAND_DARK } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE, TOQUE, RAIO, DURACAO } from '@/constants/Spacing';

export interface DashboardHeaderProps {
  /** Nome de quem está logado. Só o primeiro nome aparece. */
  nome?: string | null;
  /** Linha de apoio sob a saudação — e-mail, empresa, papel. */
  detalhe?: string | null;
  /** Ação do ícone de saída, no canto direito. */
  onSair: () => void;
  /**
   * Desenha a saudação ("Boa tarde, Jairo") e o detalhe.
   *
   * ⚠️ PROP POSITIVA, COM PADRÃO `true`, e não um `semSaudacao`. O Painel de
   * Engenharia continua com a saudação e não precisou ser tocado; quem abre mão
   * dela é que diz. Prop negativa com padrão falso obriga a ler duas negações
   * para entender o caso comum.
   *
   * 🗓️ 19/09/2026: o painel do cliente passou a `false` por pedido do dono do
   * projeto. Sem ela, sobra no cabeçalho só o botão de sair — e a identificação
   * de quem está logado subiu para o cartão de contexto, em uma linha só.
   */
  mostrarSaudacao?: boolean;
  /** Paleta escura (Painel de Engenharia). */
  escuro?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 👋 CABEÇALHO DE PAINEL (PJODC v10)
 * Local: apps/mobile-app/src/components/dashboard/DashboardHeader.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 *
 * Saudação à esquerda, botão de saída à direita. É a primeira linha dos dois
 * painéis, e existe como componente porque os dois a desenhavam por conta
 * própria, com blocos de `View`/`Text` parecidos mas não iguais.
 *
 * 🚪 A SAÍDA VIROU UM ÍCONE NO CANTO, e não mais um botão de largura total lá
 * embaixo. Os dois painéis terminavam com "Encerrar Sessão" ocupando a linha
 * inteira — o elemento mais largo e mais destacado de uma tela cuja função é
 * qualquer outra coisa. Sair é uma ação rara; ela pertence ao canto, no lugar
 * onde todo aplicativo a coloca, não ao centro do palco.
 *
 * ⚠️ O ÍCONE DE SAIR PRECISA DE `accessibilityLabel`, E AQUI ISSO NÃO É
 * OPCIONAL. Um ícone sem texto ao lado é mudo para o leitor de tela — sem o
 * rótulo, o VoiceOver anuncia apenas "botão", e o usuário cego descobre o que
 * ele faz tocando. Numa ação que encerra a sessão, descobrir tocando é caro.
 *
 * 🎯 O ALVO TEM 48pt EMBORA O DESENHO TENHA 24. Área tocável e área desenhada
 * são coisas diferentes; a segunda é o que se vê, a primeira é o que decide se
 * o toque acerta. Um ícone de 24pt sem folga é o alvo que o polegar mais erra
 * numa interface.
 */
function DashboardHeaderBase({
  nome,
  detalhe,
  onSair,
  mostrarSaudacao = true,
  escuro = false,
  style,
}: DashboardHeaderProps) {
  const { texto } = useGreeting(nome);
  const paleta = escuro ? ESCURO : CLARO;

  return (
    <Animated.View
      entering={FadeInDown.duration(DURACAO.media)}
      style={[estilos.raiz, style]}
    >
      <View style={estilos.textos}>
        {mostrarSaudacao && (
          <>
            <Text style={[estilos.saudacao, { color: paleta.texto }]} numberOfLines={1}>
              {texto}
            </Text>

            {!!detalhe && (
              <Text style={[estilos.detalhe, { color: paleta.detalhe }]} numberOfLines={1}>
                {detalhe}
              </Text>
            )}
          </>
        )}
      </View>

      <Pressable
        onPress={onSair}
        style={[estilos.botaoSair, { backgroundColor: paleta.botaoFundo }]}
        hitSlop={8}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
        accessibilityHint="Encerra a sessão e volta à tela de entrada"
        testID="btn-sair-cabecalho"
        android_ripple={{ color: paleta.ripple, borderless: true }}
      >
        <Icon name="Sair" size={ICONE.medio} color={paleta.botaoIcone} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

const CLARO = {
  texto: BRAND.text,
  detalhe: BRAND.textMuted,
  botaoFundo: BRAND.surface,
  botaoIcone: BRAND.textMuted,
  ripple: BRAND.border,
};

const ESCURO = {
  texto: BRAND_DARK.text,
  detalhe: BRAND_DARK.textMuted,
  botaoFundo: BRAND_DARK.surface,
  botaoIcone: BRAND_DARK.textMuted,
  ripple: BRAND_DARK.border,
};

const estilos = StyleSheet.create({
  raiz: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACO.md,
    marginBottom: ESPACO.xl,
  },

  /** `flex: 1` para a saudação empurrar o botão até a borda e truncar sozinha. */
  textos: { flex: 1 },

  saudacao: TIPOGRAFIA.titulo,
  detalhe: {
    ...TIPOGRAFIA.legenda,
    marginTop: 2,
  },

  botaoSair: {
    width: TOQUE.minimo,
    height: TOQUE.minimo,
    borderRadius: RAIO.circulo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const DashboardHeader = memo(DashboardHeaderBase);
export default DashboardHeader;
