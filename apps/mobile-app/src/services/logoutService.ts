/**
 * 🚪 LOGOUT DO MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/services/logoutService.ts
 *
 * O equivalente mobile de `apps/admin-web/src/lib/logout.ts` — e existe
 * separado justamente porque o da web NÃO serve aqui: aquele chama
 * `fetch('/auth/logout')`, uma rota do Next.js que só existe no servidor da
 * web. No telemóvel não há servidor, não há cookie HTTP e não há essa rota.
 *
 * 🧮 AS METADES SÃO OUTRAS. Na web a sessão vive em dois lugares (navegador e
 * cookies do servidor). Aqui ela também vive em dois, mas outros:
 *
 *   1. supabase-js, em memória  → `supabase.auth.signOut()`
 *   2. cofre do aparelho        → `storageService.clearSession()`
 *
 * Limpar só o primeiro deixaria a sessão gravada em disco: o `restoreSession`
 * do boot a devolveria ao supabase-js e o usuário reapareceria logado depois
 * de ter saído. Limpar só o segundo deixaria o cliente autenticado até o app
 * ser morto. As duas saem juntas, sempre — por isso isto é um arquivo só, e
 * não duas chamadas espalhadas por cada tela que tem botão de sair.
 */
import { supabase, telemetry } from '@jairo/core';
import { storageService } from './storageService';

export const logoutService = {
  /**
   * Encerra a sessão por inteiro. Não lança: um logout que falha pela metade é
   * pior do que um logout que segue em frente — se o `signOut` remoto falhar
   * (aparelho sem rede, por exemplo), o cofre local ainda precisa ser esvaziado,
   * senão o usuário continua "dentro" no próximo boot.
   */
  async logout(): Promise<void> {
    try {
      telemetry.reset();
    } catch {
      // Telemetria é observação, não função: nunca deve impedir alguém de sair.
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('[LOGOUT] signOut remoto falhou — limpando local mesmo assim:', error);
    }

    await storageService.clearSession();
  },
};
