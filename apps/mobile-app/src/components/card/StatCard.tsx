import React, { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import Icon, { type NomeIcone } from '@/components/icon/Icon';
import { BRAND, BRAND_DARK, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE } from '@/constants/Spacing';

export interface StatCardProps {
  /** O número, já formatado. O componente não formata nada. */
  value: string;
  /** O que o número mede. Uma ou duas palavras. */
  label: string;
  icon?: NomeIcone;
  /** Cor do número e do ícone. Padrão: a cor de texto normal. */
  color?: string;
  /** Paleta escura (Painel de Engenharia). */
  escuro?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 📊 CARTÃO DE MÉTRICA (PJODC v10)
 * Local: apps/mobile-app/src/components/card/StatCard.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 *
 * Um número grande, um rótulo pequeno, um ícone discreto. É o bloco que abre um
 * painel e responde à única pergunta que o usuário faz ao abrir o app: "como
 * estão as coisas agora?".
 *
 * 🎯 O NÚMERO É O ELEMENTO, E O RESTO É LEGENDA. Por isso o valor usa o único
 * degrau de 30pt da escala tipográfica e o rótulo usa o menor: a hierarquia
 * precisa ser legível de relance, com o telefone na mão a meio metro do rosto.
 * Número e rótulo em tamanhos próximos produzem dois textos disputando atenção e
 * nenhuma métrica.
 *
 * ⚠️ SEM SOMBRA, DE PROPÓSITO — e é a diferença deste componente para o
 * `MenuCard`. Sombra é promessa de interação, e uma métrica não é tocável: ela
 * informa. Um cartão de número elevado convida ao toque que não existe, e o
 * usuário toca, nada acontece, e ele conclui que o app falhou. A separação aqui
 * vem do fundo levemente tingido, que é o suficiente porque estes cartões vivem
 * lado a lado numa grade e se delimitam mutuamente.
 *
 * 🌑 `escuro` EXISTE PORQUE O PAINEL DE ENGENHARIA É UMA TELA DE FUNDO ESCURO —
 * a única da plataforma. Não é um modo escuro do app; ver a nota sobre
 * `BRAND_DARK` em `constants/Colors.ts`. O sinalizador troca as três cores
 * neutras e nada mais: a cor de destaque continua vindo por `color`, porque
 * verde de "online" é verde nos dois fundos.
 */
function StatCardBase({ value, label, icon, color, escuro = false, style, testID }: StatCardProps) {
  const paleta = escuro ? ESCURO : CLARO;
  const corValor = color ?? paleta.valor;

  return (
    <View
      style={[estilos.base, { backgroundColor: paleta.fundo }, style]}
      testID={testID}
      /**
       * ♿ O CARTÃO INTEIRO É UM ELEMENTO SÓ para o leitor de tela, e a ordem da
       * leitura é invertida de propósito: "5 tarefas", não "tarefas 5". Na tela,
       * o número vem primeiro porque é o que se lê de relance; na fala, o rótulo
       * antes do número produziria "tarefas, cinco", que soa a fragmento.
       */
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}
    >
      <View style={estilos.topo}>
        <Text style={[TIPOGRAFIA.rotulo, { color: paleta.rotulo }]} numberOfLines={1}>
          {label}
        </Text>
        {icon && <Icon name={icon} size={ICONE.mini} color={corValor} strokeWidth={2} />}
      </View>

      <Text style={[TIPOGRAFIA.numeroGrande, { color: corValor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const CLARO = {
  fundo: BRAND.surfaceVariant,
  valor: BRAND.text,
  rotulo: BRAND.textMuted,
};

/**
 * 🪜 O FUNDO ESCURO USA A SUPERFÍCIE 2, NÃO A 1. Estes cartões vivem DENTRO do
 * bloco de infraestrutura, que já é `BRAND_DARK.surface` — repetir a mesma cor
 * apagaria a fronteira entre o cartão e o que o contém. No escuro a
 * profundidade se lê por superfície mais clara, e não por sombra: sombra preta
 * sobre fundo preto não existe.
 */
const ESCURO = {
  fundo: BRAND_DARK.surfaceHigh,
  valor: BRAND_DARK.text,
  rotulo: BRAND_DARK.textMuted,
};

const estilos = StyleSheet.create({
  base: {
    flex: 1,
    borderRadius: PLATFORM.radiusControl,
    padding: ESPACO.md,
    gap: ESPACO.sm,
    // Piso de altura para que uma grade de métricas não fique irregular quando
    // um rótulo ocupa duas linhas e o vizinho, uma.
    minHeight: 84,
    justifyContent: 'space-between',
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACO.xs,
  },
});

export const StatCard = memo(StatCardBase);
export default StatCard;
