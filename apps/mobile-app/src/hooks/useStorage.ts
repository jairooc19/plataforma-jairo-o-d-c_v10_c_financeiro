import { useCallback, useEffect, useState } from 'react';
import { storageService, type SessionData } from '@/services/storageService';

export interface UseStorageResult {
  /** Contexto lido do cofre. `null` enquanto a leitura não terminou. */
  sessao: SessionData | null;
  carregando: boolean;
  /** Relê o cofre (depois de trocar de empresa, por exemplo). */
  recarregar: () => Promise<void>;
}

/**
 * 🔐 CONTEXTO DO COFRE, COMO ESTADO DE REACT (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useStorage.ts
 *
 * O `storageService` é assíncrono e não é React: toda tela que precisava do
 * `tenantId` repetia o mesmo `useEffect` + `useState` + bandeira de
 * cancelamento. Isto é esse trio, escrito uma vez.
 *
 * ⚠️ ESTE HOOK NÃO É UMA SEGUNDA FONTE DE VERDADE. Quem grava continua sendo o
 * `storageService` — aqui só se lê. Se um dia ele ganhar um `salvar`, passam a
 * existir duas portas de escrita para o mesmo cofre e a divergência entre elas
 * vira um bug que só aparece na terceira tela.
 *
 * 🚫 A BANDEIRA DE CANCELAMENTO É OBRIGATÓRIA: a leitura do SecureStore é
 * assíncrona e o usuário pode sair da tela antes de ela voltar. Sem a bandeira,
 * o `setState` cai num componente já desmontado — vazamento com aviso no
 * console a cada navegação rápida.
 */
export function useStorage(): UseStorageResult {
  const [sessao, setSessao] = useState<SessionData | null>(null);
  const [carregando, setCarregando] = useState(true);

  const ler = useCallback(async () => {
    setCarregando(true);
    try {
      setSessao(await storageService.getSession());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const dados = await storageService.getSession();
      if (cancelado) return;
      setSessao(dados);
      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  return { sessao, carregando, recarregar: ler };
}
