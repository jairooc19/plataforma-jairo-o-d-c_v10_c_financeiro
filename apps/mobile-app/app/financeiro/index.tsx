import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
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
 * ⚠️ UMA TELA, E SÓ O QUE FUNCIONA APARECE
 * ===========================================================================
 * O módulo tem 18 telas no site. O dono do projeto pediu para trazê-lo ao aplicativo
 * **em partes**, e a parte 1 é o DINHEIRO DO PERÍODO.
 *
 * ⚠️ **A LISTA "AINDA SÓ NO PAINEL WEB" SAIU EM 19/09/2026**, por pedido do dono do
 * projeto. Ela trazia quatro cartões com o selo "EM BREVE" — lançamentos, extrato,
 * orçamento e dashboards —, e a intenção era honestidade: dizer que o módulo tem
 * mais coisas e que elas ficam no site.
 *
 * O argumento contra venceu, e vale registrá-lo: uma lista de quatro itens
 * INERTES acima de **um** item que funciona inverte o peso da tela. Quem abre lê
 * primeiro o que não pode fazer. A honestidade continua — o que existe está à vista
 * e nada promete o que não cumpre —, mas sem transformar a porta do módulo num
 * inventário do que falta.
 *
 * ⚠️ O SUPORTE A "EM BREVE" **NÃO** FOI REMOVIDO DO CÓDIGO: a lista `TELAS` ainda
 * aceita `rota: null`, e o `MenuCard` continua tratando o caso. É o que permite a
 * parte 2 acrescentar uma tela pela metade sem reescrever nada.
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
    titulo: 'DINHEIRO DO PERÍODO',
    descricao: 'O orçado contra o realizado do mês, em barras.',
    rota: '/financeiro/dinheiro-do-periodo',
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
        {/*
          ⚠️ SEM TÍTULO DE SEÇÃO. "Disponível no telefone" só fazia sentido em
          contraste com "Ainda só no painel web", que saiu — sozinho, ele rotularia
          uma lista de um item, dizendo o que já está à vista.
        */}
        <View style={e.portaLista}>
          {TELAS.map((t, i) => (
            <MenuCard
              key={t.chave}
              icon="Painel"
              title={t.titulo}
              description={t.descricao}
              onPress={t.rota ? () => abrir(t.rota as string) : undefined}
              emBreve={!t.rota}
              indice={i}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
