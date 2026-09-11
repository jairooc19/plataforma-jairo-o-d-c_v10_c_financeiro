import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Icon from '@/components/icon/Icon';
import { BRAND, PLATFORM, elevacao } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE, DURACAO } from '@/constants/Spacing';

export interface BrandMarkProps {
  /** Nome exibido sob o símbolo. Padrão: o nome da plataforma. */
  titulo?: string;
  /** Frase de uma linha sob o nome. */
  legenda?: string;
  /** Sem animação de entrada — use quando a marca não abre a tela. */
  estatica?: boolean;
}

/**
 * 🔷 A MARCA (PJODC v10)
 * Local: apps/mobile-app/src/components/BrandMark.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 *
 * Símbolo, nome e legenda. Abre as telas da guarita, que antes começavam direto
 * no cartão de login — sem nada dizendo em que aplicativo o usuário está.
 *
 * 🎯 O SÍMBOLO É UM QUADRADO AZUL COM UM ÍCONE DENTRO, e não uma imagem. A
 * decisão é deliberada e tem três consequências boas: ele acompanha a cor da
 * marca sem alguém precisar reexportar um PNG, é nítido em qualquer densidade de
 * tela porque é vetor, e não acrescenta um único byte de recurso ao pacote. Um
 * logotipo de verdade, quando existir, entra AQUI — e nenhuma tela muda, porque
 * todas conhecem apenas `<BrandMark />`.
 *
 * ⚠️ NÃO É O ÍCONE DO APLICATIVO. Aquele vive em `src/assets/images/icon.png` e
 * é desenhado pelo sistema operacional na tela inicial e no seletor de apps —
 * não se confundem, e trocar um não troca o outro.
 *
 * 📐 O QUADRADO TEM 72pt E O ÍCONE 40. A proporção de ~55% é a mesma que iOS e
 * Android usam nos seus próprios ícones de aplicativo: menos que isso e o
 * símbolo boia num campo azul vazio, mais e ele encosta nos cantos arredondados,
 * onde o arredondamento come o traço.
 */
function BrandMarkBase({
  titulo = 'Plataforma Jairo O D C',
  legenda,
  estatica = false,
}: BrandMarkProps) {
  /**
   * A marca inteira entra como UM bloco, e não elemento a elemento. Escalonar
   * símbolo, nome e legenda separadamente faria a identidade do produto se
   * montar em pedaços diante do usuário — o efeito é de tela carregando devagar,
   * não de tela viva.
   */
  const entrada = estatica ? undefined : FadeInDown.duration(DURACAO.media);

  return (
    <Animated.View entering={entrada} style={estilos.raiz}>
      <View style={estilos.simbolo}>
        <Icon name="Raio" size={ICONE.grande} color={BRAND.onPrimary} strokeWidth={2.2} />
      </View>

      <Text style={estilos.nome} numberOfLines={2}>
        {titulo}
      </Text>

      {!!legenda && (
        <Text style={estilos.legenda} numberOfLines={2}>
          {legenda}
        </Text>
      )}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    alignItems: 'center',
    marginBottom: ESPACO.xxl,
  },

  simbolo: {
    width: 72,
    height: 72,
    borderRadius: PLATFORM.radiusCard + 6,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACO.lg,
    ...elevacao(3),
  },

  nome: {
    ...TIPOGRAFIA.titulo,
    textAlign: 'center',
  },

  legenda: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
    marginTop: ESPACO.sm,
  },
});

export const BrandMark = memo(BrandMarkBase);
export default BrandMark;
