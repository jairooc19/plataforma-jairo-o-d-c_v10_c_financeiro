import React from 'react';
import { Stack } from 'expo-router';

import { BRAND } from '@/constants/Colors';

/**
 * 🧩 A MOLDURA DO MÓDULO NO APLICATIVO (PJODC v10)
 * Local: apps/mobile-app/app/financeiro/_layout.tsx
 *
 * ===========================================================================
 * ⚠️ POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE É DO MÓDULO
 * ===========================================================================
 * O `Stack` da raiz (`app/_layout.tsx`) declara `screenOptions={{ headerShown:
 * false }}` como padrão, e rota não declarada herda esse padrão. Se o módulo não
 * trouxesse a própria moldura, as telas dele nasceriam **sem cabeçalho e sem botão
 * de voltar** — num telefone Android o gesto de voltar salvaria a situação, mas no
 * iOS a pessoa ficaria presa.
 *
 * A alternativa seria declarar um `<Stack.Screen name="financeiro" />` no layout da
 * RAIZ — e isso escreveria o nome de um módulo dentro de um arquivo da plataforma,
 * criando uma quarta solda clandestina. O verificador de LEGO acusaria, com razão.
 * Trazendo a moldura para dentro do território do módulo, a plataforma continua sem
 * saber que esta peça existe.
 *
 * ⚠️ ESTA PASTA NÃO PODE FICAR DENTRO DE `app/(tabs)/`. O `NativeTabs` monta um
 * gatilho por rota do grupo — o módulo viraria uma ABA para todo mundo, inclusive
 * para quem não o contratou. É a mesma razão de `central-comandos` e
 * `ajustes-globais` ficarem fora daquele grupo.
 *
 * 🏷️ O TÍTULO É O DO MÓDULO, e ele é escrito aqui porque **aqui é território do
 * módulo** — este arquivo mora em `app/financeiro/`, que o
 * `scripts/verificar-modulos.mjs` reconhece como pasta do módulo desde o degrau 08.
 */
export default function LayoutFinanceiro() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: BRAND.surface },
        headerTintColor: BRAND.primary,
        headerTitleStyle: { color: BRAND.text, fontSize: 16, fontWeight: '700' },
        contentStyle: { backgroundColor: BRAND.background },
      }}
    >
      {/*
        ⚠️ NÃO PASSE `component` A UM `<Stack.Screen>` DO EXPO ROUTER. Ali as telas
        vêm dos ARQUIVOS desta pasta; a prop é ignorada em silêncio, e quem a escreve
        passa a tarde procurando por que a tela não trocou.
      */}
      <Stack.Screen name="index" options={{ title: 'CONTROLE FINANCEIRO' }} />
      <Stack.Screen name="dinheiro-do-periodo" options={{ title: 'DINHEIRO DO PERÍODO' }} />
      <Stack.Screen name="lancar" options={{ title: 'NOVO LANÇAMENTO' }} />
      <Stack.Screen name="meus-lancamentos" options={{ title: 'MEUS LANÇAMENTOS' }} />
    </Stack>
  );
}
