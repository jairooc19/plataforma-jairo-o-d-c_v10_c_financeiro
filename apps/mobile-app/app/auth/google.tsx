import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { profileService } from '@jairo/core';
import type { Session } from '@supabase/supabase-js';

import {
  concluirSessaoOAuth,
  esperarSessao,
  pareceRetornoOAuth,
} from '@/lib/oauthCallbackSession';
import { storageService } from '@/services/storageService';
import { useTenantTriage } from '@/hooks/useTenantTriage';
import { errorService } from '@/services/errorService';
import { BRAND } from '@/constants/Colors';
import { TAMANHO, PESO } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

/**
 * 🔵 ROTA: RETORNO DO GOOGLE (PJODC v10)
 * Local: apps/mobile-app/app/auth/google.tsx
 *
 * ESTE É O ENDEREÇO `plataformajairo://auth/google` — o mesmo que está
 * cadastrado em Supabase › Authentication › URL Configuration › Redirect URLs.
 *
 * ⚠️ ELE NÃO EXISTIA, E ERA ESSA A CAUSA DO "ENDEREÇO NÃO ENCONTRADO". O sistema
 * operacional entrega o deep link ao app; o Expo Router tenta casá-lo com um
 * arquivo de `app/` e, não achando nenhum, cai em `+not-found.tsx`.
 *
 * ⚠️ E A PRIMEIRA VERSÃO DESTA TELA TRAVAVA EM "CONCLUINDO O LOGIN…", porque
 * lia o deep link com `Linking.useURL()`. Aquele hook NÃO SERVE AQUI quando o
 * app já está aberto — e é justamente o caso mais comum:
 *
 *   • `getInitialURL()` devolve a URL que ABRIU o app; com o app rodando, null;
 *   • o evento `url` já disparou ANTES — foi ele que fez o roteador navegar para
 *     cá. Quando esta tela monta e assina o evento, ele já passou.
 *
 * O sintoma escondia a causa: só o Proprietário SEM EMPRESA via o travamento.
 * No fluxo normal o `useGoogleLogin` termina com `router.replace('/(tabs)')`,
 * que destrói a pilha e leva esta tela junto; já `tratarSemVinculos` apenas
 * troca o estado da tela de login, sem navegar — e esta tela ficava por cima,
 * girando. Voltar revelava a tela de "Aguardando Triagem" correta embaixo.
 *
 * 🤝 A SAÍDA FOI PARAR DE DEPENDER DA URL, e passar a esperar a SESSÃO:
 *
 *   1. app aberto pelo deep link (frio) → `getInitialURL()` traz os tokens e
 *      esta tela conclui o login sozinha;
 *   2. app já rodando (quente) → quem tem o retorno é o `openAuthSessionAsync`,
 *      que estabelece a sessão em paralelo. Esta tela só espera ela aparecer.
 *
 * O supabase-js é a fonte comum aos dois caminhos, e é por isso que esperar por
 * ele funciona nos dois. Ver `lib/oauthCallbackSession.ts`.
 *
 * 🎯 DEPOIS DA SESSÃO, O RESTO É IGUAL AO `hooks/auth/useGoogleLogin.ts`:
 * portão do `profile_completed` e triagem de empresas. A diferença é o ponto de
 * partida — lá é um toque no botão, aqui é um deep link que pode ter chegado com
 * o app fechado.
 *
 * 🚫 NÃO PONHA ESTA TELA EM `app/(tabs)/` NEM EM `app/(auth)/`. Em `(tabs)` ela
 * viraria uma aba; em `(auth)` o grupo some da URL e o endereço passaria a ser
 * `/google`, que não é o que está cadastrado no Supabase. O segmento `auth`
 * precisa ser real.
 */
export default function GoogleCallbackScreen() {
  const router = useRouter();
  const { triar } = useTenantTriage();

  const jaTratou = useRef(false);
  const vivo = useRef(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(
    () => () => {
      vivo.current = false;
    },
    []
  );

  useEffect(() => {
    if (jaTratou.current) return;
    jaTratou.current = true;

    const concluir = async () => {
      try {
        // Caminho frio: o deep link abriu o app e os tokens estão na URL inicial.
        const urlInicial = await Linking.getInitialURL();

        let sessao: Session | null = null;

        if (pareceRetornoOAuth(urlInicial)) {
          try {
            sessao = await concluirSessaoOAuth(urlInicial as string);
          } catch (falhaDeTroca) {
            // Provável corrida com o `openAuthSessionAsync` (no PKCE o código é
            // de uso único). Só vira erro de verdade se a espera abaixo também
            // não encontrar sessão nenhuma.
            errorService.registrar('AUTH', falhaDeTroca);
          }
        }

        // Caminho quente: a sessão está a caminho pelo outro fluxo. Esperar é o
        // que substitui a leitura da URL, que aqui não existe.
        if (!sessao) sessao = await esperarSessao();

        if (!vivo.current) return;

        // Ninguém autenticou dentro do tempo: não há login a concluir. Voltar à
        // guarita é o desfecho honesto — melhor que girar para sempre.
        if (!sessao) {
          router.replace('/(auth)');
          return;
        }

        await storageService.saveAuthSession(sessao);

        /**
         * 🏁 PORTÃO DO `profile_completed`, o mesmo do `useGoogleLogin`. O Google
         * entrega e-mail e nome, nada mais: sem planeta, país, estado e cidade o
         * usuário não segue para a triagem. A tela de destino carrega o usuário
         * sozinha a partir da sessão, então não é preciso passar nada por rota.
         */
        if (!(await profileService.isProfileCompleted(sessao.user.id))) {
          if (vivo.current) router.replace('/(auth)/complete-profile');
          return;
        }

        /**
         * ⚠️ A CHECAGEM DE MONTAGEM VEM ANTES DA TRIAGEM, e não só depois: o
         * `triar` NAVEGA POR DENTRO quando encontra uma empresa. Se o outro
         * caminho já concluiu e nos desmontou, chamá-lo produziria uma segunda
         * navegação para o mesmo lugar, refazendo consultas à toa.
         */
        if (!vivo.current) return;

        const resultado = await triar(sessao.user.id, 'OWNER');

        /**
         * Proprietário autenticado e sem empresa vinculada. O seletor é quem
         * desenha "Aguardando Triagem" quando a lista volta vazia — mandar para
         * lá evita duplicar aquela tela aqui.
         */
        if (resultado === 'sem-vinculos' && vivo.current) {
          router.replace({ pathname: '/(auth)/select-tenant', params: { papel: 'OWNER' } });
        }
      } catch (falha) {
        errorService.registrar('AUTH', falha);
        if (vivo.current) setErro(errorService.mensagem(falha));
      }
    };

    concluir();
  }, [router, triar]);

  return (
    <View style={estilos.tela}>
      <ActivityIndicator size="large" color={BRAND.primary} />
      <Text style={estilos.titulo}>{erro ? 'Não foi possível concluir' : 'Concluindo o login…'}</Text>
      <Text style={estilos.corpo}>
        {erro ?? 'Estamos confirmando os dados que o Google devolveu.'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ESPACO.xl,
    backgroundColor: BRAND.background,
  },
  titulo: {
    fontSize: TAMANHO.secao,
    fontWeight: PESO.medio,
    color: BRAND.text,
    marginTop: ESPACO.lg,
    textAlign: 'center',
  },
  corpo: {
    fontSize: TAMANHO.corpo,
    color: BRAND.textMuted,
    marginTop: ESPACO.sm,
    textAlign: 'center',
  },
});
