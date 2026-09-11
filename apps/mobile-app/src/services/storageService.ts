/**
 * 🔐 STORAGE SERVICE — O COFRE DO TELEMÓVEL (PJODC v10)
 * Local: apps/mobile-app/src/services/storageService.ts
 *
 * Guarda DUAS coisas diferentes, em DOIS cofres diferentes, de propósito:
 *
 * ┌─────────────────────┬──────────────────┬────────────────────────────────┐
 * │ O quê               │ Onde             │ Por quê                        │
 * ├─────────────────────┼──────────────────┼────────────────────────────────┤
 * │ contexto da sessão  │ SecureStore      │ 3 strings curtas. Criptografia │
 * │ (token/tenant/role) │                  │ nativa, cabe folgado.          │
 * │ sessão do Supabase  │ AsyncStorage     │ JSON com 2 JWTs + objeto user: │
 * │ (access + refresh)  │                  │ passa de 2 KB.                 │
 * └─────────────────────┴──────────────────┴────────────────────────────────┘
 *
 * ⚠️ POR QUE A SESSÃO NÃO VAI NO SECURESTORE: no Android o SecureStore tem
 * limite de 2048 bytes por valor. Um `Session` do Supabase serializado passa
 * disso com folga (só o access_token costuma ter ~800–1200 caracteres, e ainda
 * vêm o refresh_token e o objeto `user` inteiro). A gravação falha — e falha
 * em silêncio, porque `setItemAsync` só avisa no log. O usuário descobriria na
 * próxima abertura do app, deslogado sem explicação.
 *
 * ⚠️ ESTE ARQUIVO EXISTE PORQUE O CORE NÃO TEM ADAPTADOR DE STORAGE.
 * `packages/core/src/lib/supabase.ts` declara `persistSession: true` mas não
 * passa `storage`. No navegador o supabase-js cai no localStorage sozinho; no
 * React Native não há localStorage, então ele cai em memória e a sessão morre
 * ao fechar o app. Enquanto o Core não receber um adaptador, a persistência é
 * responsabilidade daqui.
 *
 * 🔁 CONSEQUÊNCIA QUE VOCÊ PRECISA CONHECER: como há duas cópias da sessão (a
 * do supabase-js, em memória, e a nossa, no disco), elas podem divergir quando
 * o `autoRefreshToken` troca o access token. Por isso `restoreSession` NÃO
 * confia cegamente no que leu: ela regrava o que o supabase-js devolveu depois
 * do `setSession`, que já vem renovado. Ver a nota no próprio método.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

/** Chaves de persistência. Nomes estáveis: mudá-los desloga todo mundo. */
const KEYS = {
  AUTH_TOKEN: 'pjodc_auth_token',
  ACTIVE_TENANT_ID: 'active_tenant_id',
  USER_ROLE: 'user_role_context',
};

/** Chave da sessão completa do Supabase, no AsyncStorage. */
const SESSION_KEY = 'pjodc_supabase_session';

export interface SessionData {
  token: string | null;
  tenantId: string | null;
  role: string | null;
}

export const storageService = {
  /** Grava um valor de forma segura e criptografada. */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[STORAGE] Erro ao gravar chave (${key}):`, error);
    }
  },

  /** Recupera um valor guardado no cofre. */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[STORAGE] Erro ao ler chave (${key}):`, error);
      return null;
    }
  },

  /** Remove uma entrada específica do cofre. */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[STORAGE] Erro ao remover chave (${key}):`, error);
    }
  },

  /**
   * SALVA O CONTEXTO DA SESSÃO (token de exibição + empresa ativa + papel).
   * Consolida o acesso do utilizador após a triagem da Portaria.
   */
  async saveSession(token: string, tenantId: string, role: string): Promise<void> {
    await this.setItem(KEYS.AUTH_TOKEN, token);
    await this.setItem(KEYS.ACTIVE_TENANT_ID, tenantId);
    await this.setItem(KEYS.USER_ROLE, role);
  },

  /** RECUPERA O CONTEXTO. Utilizado pelo dashboard e pelo Escudo Reativo. */
  async getSession(): Promise<SessionData> {
    const [token, tenantId, role] = await Promise.all([
      this.getItem(KEYS.AUTH_TOKEN),
      this.getItem(KEYS.ACTIVE_TENANT_ID),
      this.getItem(KEYS.USER_ROLE),
    ]);

    return { token, tenantId, role };
  },

  /**
   * LIMPA TUDO (LOGOUT). Os dois cofres saem juntos.
   *
   * ⚠️ Limpar só o SecureStore deixaria a sessão do Supabase no AsyncStorage:
   * a próxima abertura do app restauraria o login que o usuário acabou de
   * encerrar. Sair pela metade não é sair — a mesma lição que a web aprendeu
   * com os cookies HTTP (ver `apps/admin-web/src/lib/logout.ts`).
   */
  async clearSession(): Promise<void> {
    await Promise.all([
      this.removeItem(KEYS.AUTH_TOKEN),
      this.removeItem(KEYS.ACTIVE_TENANT_ID),
      this.removeItem(KEYS.USER_ROLE),
      this.clearAuthSession(),
    ]);
  },

  // ───────────────────────────────────────────────────────────────────────────
  // SESSÃO DO SUPABASE (AsyncStorage)
  // ───────────────────────────────────────────────────────────────────────────

  /** 💾 Persiste a sessão do Supabase para sobreviver ao fechamento do app. */
  async saveAuthSession(session: Session | null): Promise<void> {
    try {
      if (!session) {
        await this.clearAuthSession();
        return;
      }
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('[STORAGE] Erro ao gravar sessão do Supabase:', error);
    }
  },

  /** 📖 Lê a sessão persistida. Devolve `null` quando não há ou está corrompida. */
  async loadAuthSession(): Promise<Session | null> {
    try {
      const bruto = await AsyncStorage.getItem(SESSION_KEY);
      if (!bruto) return null;
      return JSON.parse(bruto) as Session;
    } catch (error) {
      // JSON quebrado é lixo, não é sessão: descarta em vez de propagar o erro
      // para o boot do app, que ficaria preso numa tela de carregamento.
      console.warn('[STORAGE] Sessão persistida ilegível — descartando:', error);
      await this.clearAuthSession();
      return null;
    }
  },

  /** 🧹 Remove a sessão persistida. */
  async clearAuthSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('[STORAGE] Erro ao remover sessão do Supabase:', error);
    }
  },

  /**
   * 🔄 DEVOLVE A SESSÃO GRAVADA AO SUPABASE-JS, no boot do app.
   *
   * ⚠️ O `setSession` aqui não é só "carregar": quando o access token já expirou
   * (o normal, depois de o app passar horas fechado), ele usa o refresh token
   * para emitir um par novo. Por isso REGRAVAMOS o resultado — a cópia em disco
   * envelheceria a cada renovação, e uma reabertura futura tentaria restaurar um
   * token morto. É este passo que fecha o buraco das duas fontes de verdade.
   *
   * Devolve `null` quando não havia nada a restaurar ou quando o refresh falhou
   * (refresh token revogado, conta apagada): nesses casos o cofre é esvaziado e
   * o usuário volta à guarita, que é o comportamento correto.
   */
  async restoreSession(client: SupabaseClient): Promise<Session | null> {
    const gravada = await this.loadAuthSession();
    if (!gravada?.refresh_token) return null;

    try {
      const { data, error } = await client.auth.setSession({
        access_token: gravada.access_token,
        refresh_token: gravada.refresh_token,
      });

      if (error || !data.session) {
        console.warn('[STORAGE] Sessão não pôde ser restaurada:', error?.message);
        await this.clearSession();
        return null;
      }

      await this.saveAuthSession(data.session);
      return data.session;
    } catch (error) {
      console.error('[STORAGE] Falha ao restaurar sessão:', error);
      await this.clearSession();
      return null;
    }
  },
};
