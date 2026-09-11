import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@jairo/core';
import { storageService } from '@/services/storageService';

/**
 * 🔄 VIGILÂNCIA DE SESSÃO E PERMISSÕES, COM CORTE EM BACKGROUND (PJODC v10)
 * Local: apps/mobile-app/src/hooks/usePermissionWatch.ts
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - AppState: o canal Realtime é desligado quando o app sai de cena
 * - Realtime: remontado sozinho ao voltar, sem esperar evento de autenticação
 * - Bateria e rede: nenhum websocket aberto com o app no bolso do usuário
 *
 * 📤 SAIU DO `app/_layout.tsx` NA v9. Lá dentro eram três assuntos no mesmo
 * arquivo — montar a árvore, escutar autenticação e vigiar o ciclo de vida do
 * app. A regra de ouro pede um arquivo por responsabilidade, e aqui o corte é
 * natural: o layout monta telas, este hook cuida do que acontece por trás.
 *
 * ⚠️ O CANAL VIVE NUM `useRef`, E ISSO NÃO É DETALHE. São DOIS efeitos que
 * precisam falar do MESMO canal: o que escuta autenticação e o que escuta o
 * ciclo de vida. Uma variável `let` dentro de cada efeito daria a cada um a sua
 * própria cópia — o efeito do `AppState` fecharia um canal que nunca foi aberto
 * e o de autenticação continuaria com o dele aberto para sempre. O sintoma
 * seria o pior possível: nenhum erro, e a "otimização" simplesmente não
 * acontecendo. Um `ref` é a única caixa que os dois efeitos compartilham.
 *
 * 🛌 SÓ `background` DESLIGA, NÃO TODO ESTADO DIFERENTE DE `active`. O iOS
 * passa por `inactive` a cada gesto trivial — abrir a central de controle,
 * atender uma notificação, entrar no seletor de apps. Cortar o websocket nesses
 * instantes derrubaria e reergueria a conexão dezenas de vezes por sessão, o
 * que gasta MAIS bateria do que mantê-la aberta. `background` é o único estado
 * que significa de verdade "o usuário foi embora".
 *
 * 🔙 O RETORNO É EXPLÍCITO, E TEM QUE SER. É tentador confiar no
 * `onAuthStateChange` para remontar o canal quando o app volta — mas ele não
 * dispara ao voltar do background: ele reage a login, logout e renovação de
 * token, não ao ciclo de vida do aplicativo. Sem o `getSession()` daqui, o
 * canal cairia na primeira ida ao background e NUNCA mais voltaria; o usuário
 * perderia o aviso de mudança de permissões pelo resto da sessão, em silêncio.
 *
 * 🧹 `removeChannel` E NÃO `unsubscribe`. O `unsubscribe` fecha a inscrição mas
 * deixa o canal registrado no cliente do Supabase; ao voltar do background,
 * criar outro canal com o mesmo tópico (`auth_watch_<id>`) empilharia um
 * duplicado sobre o fantasma do anterior. `removeChannel` desfaz as duas
 * coisas, e o tópico fica livre para ser reaberto limpo.
 */
export function usePermissionWatch() {
  const router = useRouter();

  /** O canal vigente. Compartilhado pelos dois efeitos — ver o cabeçalho. */
  const canalRef = useRef<RealtimeChannel | null>(null);

  /** Último estado conhecido do app, para detectar a TRANSIÇÃO e não o estado. */
  const estadoApp = useRef<AppStateStatus>(AppState.currentState);

  const encerrarCanal = useCallback(async () => {
    const canal = canalRef.current;
    if (!canal) return;

    // Zera a referência ANTES de esperar: se uma segunda chamada chegar
    // enquanto o `await` corre, ela encontra `null` e não remove duas vezes.
    canalRef.current = null;

    try {
      await supabase.removeChannel(canal);
    } catch (e) {
      console.error('[MOBILE-WATCH] Falha ao encerrar o canal de permissões:', e);
    }
  }, []);

  const montarCanal = useCallback(
    (userId: string) => {
      if (canalRef.current) return;

      canalRef.current = supabase
        .channel(`auth_watch_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tenant_members',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            Alert.alert(
              'Sessão Atualizada',
              'As suas permissões foram alteradas. Por favor, realize um novo login para atualizar o seu perfil.',
              [
                {
                  text: 'Fazer Login',
                  onPress: async () => {
                    await encerrarCanal();
                    await storageService.clearSession();
                    await supabase.auth.signOut();
                    router.replace('/(auth)');
                  },
                },
              ],
              { cancelable: false }
            );
          }
        )
        .subscribe();
    },
    [router, encerrarCanal]
  );

  // 1. Ciclo de vida do app: desliga ao sair de cena, religa ao voltar.
  useEffect(() => {
    const inscricao = AppState.addEventListener('change', async (proximo) => {
      const anterior = estadoApp.current;
      estadoApp.current = proximo;

      if (anterior === 'active' && proximo === 'background') {
        await encerrarCanal();
        return;
      }

      if (proximo === 'active' && anterior !== 'active') {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) montarCanal(data.session.user.id);
      }
    });

    return () => inscricao.remove();
  }, [encerrarCanal, montarCanal]);

  // 2. Escudo reativo: autenticação e vigilância de permissões.
  useEffect(() => {
    const {
      data: { subscription: inscricaoAuth },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      /**
       * 💾 REGRAVA A SESSÃO A CADA RENOVAÇÃO. É este ramo que impede as duas
       * cópias (memória e disco) de divergirem: o `autoRefreshToken` troca o
       * access token sozinho, e sem gravar o novo par o disco guardaria um
       * token já morto — a próxima abertura do app cairia na guarita sem
       * explicação.
       */
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        if (session) await storageService.saveAuthSession(session);
      }

      if (event === 'SIGNED_OUT') {
        await storageService.clearSession();
        await encerrarCanal();
        router.replace('/(auth)');
        return;
      }

      /**
       * ⏸️ COM O APP EM BACKGROUND, NÃO SE MONTA CANAL. Um `TOKEN_REFRESHED`
       * chega sozinho a cada hora, inclusive com o app fora de cena — sem esta
       * guarda, ele reabriria o websocket que o efeito acima acabou de fechar,
       * e a economia duraria até a primeira renovação de token.
       */
      if (session?.user && estadoApp.current === 'active') {
        montarCanal(session.user.id);
      }
    });

    return () => {
      inscricaoAuth.unsubscribe();
      void encerrarCanal();
    };
  }, [router, encerrarCanal, montarCanal]);
}
