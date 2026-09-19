import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import MenuCard from '@/components/card/MenuCard';
import { estilosFin as e } from '@/modules/financeiro/estilos';

/**
 * 🧩 A PORTA DO MÓDULO NO APLICATIVO (PJODC v10)
 * Local: apps/mobile-app/app/financeiro/index.tsx
 *
 * Responde por `/financeiro` — o endereço que o manifesto declara em `rotaMobile`.
 *
 * ===========================================================================
 * ⚠️ UMA TELA ATIVA, AS OUTRAS COMO "EM BREVE" — E ISSO É HONESTIDADE, NÃO PREGUIÇA
 * ===========================================================================
 * O módulo tem 18 telas no site. O dono do projeto pediu para trazê-lo ao aplicativo
 * **em partes**, e a parte 1 é o DINHEIRO DO PERÍODO. As demais aparecem aqui com o
 * selo "EM BREVE" porque a alternativa — não listá-las — faria a pessoa concluir que
 * o módulo do telefone é outro produto, menor, e ir procurar no site sem saber o quê.
 *
 * ⚠️ E O `MenuCard` SEM `onPress` NASCE INERTE DE PROPÓSITO: ele se anuncia como
 * indisponível ao leitor de tela e ignora o toque. **Nunca passe uma função vazia**
 * para "resolver" o tipo — um cartão que responde ao toque com silêncio lê-se como
 * aplicativo quebrado, que é precisamente o que o `emBreve` evita.
 */

/**
 * O que existe no telefone, e o que ainda não.
 *
 * ⚠️ A LISTA É DESTE ARQUIVO, e não do manifesto. O manifesto diz à PLATAFORMA como
 * chegar ao módulo; o que há DENTRO dele é assunto do módulo, e a plataforma não
 * pode passar a conhecer as telas de cada peça — é a mesma razão de as 22 permissões
 * não morarem no manifesto.
 */
const TELAS = [
  {
    chave: 'dinheiro-do-periodo',
    titulo: 'Dinheiro do período',
    descricao: 'O orçado contra o realizado do mês, em barras.',
    rota: '/financeiro/dinheiro-do-periodo',
  },
  {
    chave: 'lancamentos',
    titulo: 'Lançamentos',
    descricao: 'Lançar, pesquisar e conferir. Por enquanto, no painel web.',
    rota: null,
  },
  {
    chave: 'extrato',
    titulo: 'Extrato com saldo',
    descricao: 'O movimento de uma conta, com saldo acumulado. No painel web.',
    rota: null,
  },
  {
    chave: 'orcamento',
    titulo: 'Orçamento',
    descricao: 'Montar e copiar o plano do mês. No painel web.',
    rota: null,
  },
  {
    chave: 'dashboards',
    titulo: 'Dashboards',
    descricao: 'Saldos mês a mês, por conta. No painel web.',
    rota: null,
  },
] as const;

export default function PortaDoFinanceiro() {
  const router = useRouter();

  /**
   * ⚠️ O `as never` É A MESMA CONVERSÃO EXPLICADA NO `ClientDashboard`: as rotas
   * vivem numa lista de dados, e o `typedRoutes` do Expo Router só reconhece
   * literais. A rota existe — é o arquivo vizinho `dinheiro-do-periodo.tsx`.
   */
  const abrir = useCallback(
    (rota: string) => {
      router.push(rota as never);
    },
    [router],
  );

  return (
    <SafeAreaView style={e.tela} edges={['bottom']}>
      <ScrollView contentContainerStyle={e.conteudo} showsVerticalScrollIndicator={false}>
        <Text style={e.portaSecao}>Disponível no telefone</Text>

        <View style={e.portaLista}>
          {TELAS.filter((t) => t.rota).map((t, i) => (
            <MenuCard
              key={t.chave}
              icon="Painel"
              title={t.titulo}
              description={t.descricao}
              onPress={() => abrir(t.rota as string)}
              indice={i}
            />
          ))}
        </View>

        <Text style={e.portaSecao}>Ainda só no painel web</Text>

        <View style={e.portaLista}>
          {TELAS.filter((t) => !t.rota).map((t, i) => (
            <MenuCard
              key={t.chave}
              icon="Modulos"
              title={t.titulo}
              description={t.descricao}
              emBreve
              indice={i}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
