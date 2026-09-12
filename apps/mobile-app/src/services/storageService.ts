/**
 * 🔐 STORAGE SERVICE — O COFRE DO TELEMÓVEL (PJODC v10)
 * Local: apps/mobile-app/src/services/storageService.ts
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: A SESSÃO SAIU DO ARMAZENAMENTO COMUM
 * ===========================================================================
 * Até a v9 a sessão completa do Supabase — que inclui o REFRESH TOKEN, a chave
 * que gera novos acessos — era gravada no AsyncStorage. A documentação do React
 * Native descreve o AsyncStorage como um armazenamento "não criptografado" e diz,
 * na página de segurança, para NÃO usá-lo para tokens nem segredos.
 *
 * O motivo de a v9 ter feito isso era real: o SecureStore rejeita valores
 * grandes (a documentação do Expo cita ~2048 bytes), e uma sessão do Supabase
 * passa disso com folga. A saída não é abrir mão da criptografia — é PARTIR o
 * valor em pedaços que cabem.
 *
 * 🧩 COMO FUNCIONA AGORA:
 *   1. a sessão vira JSON;
 *   2. o JSON é cortado em pedaços de 1.500 caracteres;
 *   3. cada pedaço vai para uma chave própria do SecureStore, que no iOS é o
 *      Keychain e no Android é o Keystore;
 *   4. uma chave extra guarda QUANTOS pedaços existem, para a leitura saber
 *      quando parou.
 *
 * ⚠️ A CONTAGEM É GRAVADA POR ÚLTIMO, E APAGADA PRIMEIRO. Se o app for morto no
 * meio da escrita, é melhor não existir contagem (a sessão se perde e o usuário
 * entra de novo) do que existir uma contagem apontando para pedaços que não
 * chegaram (a leitura montaria um JSON truncado e quebraria o arranque).
 *
 * ⚠️ NÃO SOBROU NADA NO AsyncStorage. Quem atualizar de uma versão antiga tem a
 * sessão velha ignorada e faz login de novo — uma vez. O `limparResiduoAntigo`
 * apaga a chave que ficou para trás.
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

/** Prefixo dos pedaços da sessão e da contagem. */
const SESSAO_PARTES = 'pjodc_sessao_partes';
const SESSAO_PEDACO = 'pjodc_sessao_';

/** Chave do AsyncStorage usada até a v9 — só para limpar o que ficou. */
const CHAVE_ANTIGA_ASYNC = 'pjodc_supabase_session';

/**
 * Tamanho de cada pedaço. Bem abaixo do limite citado pela documentação do Expo
 * (~2048 bytes), com folga para caracteres acentuados, que ocupam mais de um
 * byte em UTF-8.
 */
const TAMANHO_PEDACO = 1500;

/** Teto de pedaços, para uma contagem corrompida não virar laço infinito. */
const MAX_PEDACOS = 40;

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
   * LIMPA TUDO (LOGOUT). Os dois conjuntos saem juntos.
   *
   * ⚠️ Limpar só o contexto deixaria a sessão do Supabase gravada: a próxima
   * abertura do app restauraria o login que o usuário acabou de encerrar.
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
  // SESSÃO DO SUPABASE (SecureStore, em pedaços)
  // ───────────────────────────────────────────────────────────────────────────

  /** 💾 Persiste a sessão do Supabase para sobreviver ao fechamento do app. */
  async saveAuthSession(session: Session | null): Promise<void> {
    try {
      if (!session) {
        await this.clearAuthSession();
        return;
      }

      const texto = JSON.stringify(session);
      const total = Math.ceil(texto.length / TAMANHO_PEDACO);

      if (total > MAX_PEDACOS) {
        console.error('[STORAGE] Sessão grande demais para o cofre; não foi gravada.');
        return;
      }

      // Apaga o que havia antes: uma sessão nova menor deixaria pedaços velhos
      // para trás, e a leitura montaria um JSON misturado.
      await this.clearAuthSession();

      for (let i = 0; i < total; i += 1) {
        const pedaco = texto.slice(i * TAMANHO_PEDACO, (i + 1) * TAMANHO_PEDACO);
        await SecureStore.setItemAsync(`${SESSAO_PEDACO}${i}`, pedaco);
      }

      // A contagem por ÚLTIMO: só depois dela a sessão conta como gravada.
      await SecureStore.setItemAsync(SESSAO_PARTES, String(total));
    } catch (error) {
      console.error('[STORAGE] Erro ao gravar sessão do Supabase:', error);
    }
  },

  /** 📖 Lê a sessão persistida. Devolve `null` quando não há ou está corrompida. */
  async loadAuthSession(): Promise<Session | null> {
    try {
      const bruto = await SecureStore.getItemAsync(SESSAO_PARTES);
      if (!bruto) return null;

      const total = Number(bruto);
      if (!Number.isInteger(total) || total <= 0 || total > MAX_PEDACOS) {
        await this.clearAuthSession();
        return null;
      }

      let texto = '';
      for (let i = 0; i < total; i += 1) {
        const pedaco = await SecureStore.getItemAsync(`${SESSAO_PEDACO}${i}`);
        if (pedaco === null) {
          // Falta um pedaço: a gravação anterior foi interrompida.
          console.warn('[STORAGE] Sessão incompleta no cofre — descartando.');
          await this.clearAuthSession();
          return null;
        }
        texto += pedaco;
      }

      return JSON.parse(texto) as Session;
    } catch (error) {
      // JSON quebrado é lixo, não é sessão: descarta em vez de propagar o erro
      // para o boot do app, que ficaria preso numa tela de carregamento.
      console.warn('[STORAGE] Sessão persistida ilegível — descartando:', error);
      await this.clearAuthSession();
      return null;
    }
  },

  /** 🧹 Remove a sessão persistida (todos os pedaços). */
  async clearAuthSession(): Promise<void> {
    try {
      // A contagem sai PRIMEIRO: a partir daqui, nenhuma leitura tenta montar.
      await SecureStore.deleteItemAsync(SESSAO_PARTES);

      for (let i = 0; i < MAX_PEDACOS; i += 1) {
        await SecureStore.deleteItemAsync(`${SESSAO_PEDACO}${i}`);
      }

      await this.limparResiduoAntigo();
    } catch (error) {
      console.error('[STORAGE] Erro ao remover sessão do Supabase:', error);
    }
  },

  /**
   * 🧽 Apaga a sessão que a v9 deixou no AsyncStorage (sem criptografia).
   * Roda junto com a limpeza normal; some sozinha depois da primeira execução.
   */
  async limparResiduoAntigo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CHAVE_ANTIGA_ASYNC);
    } catch {
      // Sem AsyncStorage disponível não há resíduo a limpar.
    }
  },

  /**
   * 🔄 DEVOLVE A SESSÃO GRAVADA AO SUPABASE-JS, no boot do app.
   *
   * ⚠️ O `setSession` aqui não é só "carregar": quando o access token já expirou
   * (o normal, depois de o app passar horas fechado), ele usa o refresh token
   * para emitir um par novo. Por isso REGRAVAMOS o resultado — a cópia em disco
   * envelheceria a cada renovação, e uma reabertura futura tentaria restaurar um
   * token morto.
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
