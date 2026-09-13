// Local: packages/core/src/services/platform/authService.ts

import { supabase } from '../../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { googleAuthService, type GoogleSignInResult } from './googleAuthService';

/**
 * 🛰️ AUTHSERVICE: O CÉREBRO ÚNICO DA GUARITA (PJODC v10)
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: O DESENVOLVEDOR VIROU UM USUÁRIO DE VERDADE
 * ===========================================================================
 * Até a v9 existia aqui um `developerSignIn` que comparava duas strings:
 *
 *     if (email === 'admin@pjodc.ia' && pass === '1qaz') { ... }
 *
 * Isso significava que a senha do Painel de Engenharia viajava dentro do
 * JavaScript do site e dentro do APK do aplicativo — qualquer pessoa que
 * abrisse o código a lia. E o "crachá" resultante era uma marca no
 * `sessionStorage`, que o próprio navegador escreve: dava para entrar sem senha
 * nenhuma, digitando uma linha no console.
 *
 * Agora o Desenvolvedor entra pela MESMA porta que todo mundo (e-mail e senha do
 * Supabase) e o que o distingue é a coluna `is_superuser` no banco, que o
 * cliente não consegue escrever. Quem confere é o Postgres, dentro das funções
 * `admin_*`.
 *
 * 🗑️ TAMBÉM SAÍRAM DAQUI:
 *   • `promoteToOwner` e `getPendingUsers` — viraram funções SQL transacionais
 *     (`admin_promote_to_owner`, `admin_list_users`), chamadas pelo
 *     `tenantService`. A versão antiga fazia três gravações separadas: se a
 *     segunda falhasse, sobrava uma empresa sem dono.
 *   • `notifyAdminNewUser` — apontava para uma rota que só escrevia no log do
 *     servidor e que estava aberta na internet. A fila de triagem já mostra
 *     quem se cadastrou; a notificação não entregava nada que a tela não
 *     mostrasse.
 *   • `getAdminNotificationEmails` — só existia para alimentar aquela rota.
 */

export interface TenantEmbutido {
  tenant_name: string;
  slug?: string;
  is_active?: boolean;
  users?: {
    full_name?: string | null;
    email?: string | null;
    is_active?: boolean;
  } | null;
}

/** Vínculo devolvido pela triagem (`getUserTenants`). */
export interface VinculoDeEmpresa {
  tenant_id: string;
  role: string;
  tenants: TenantEmbutido;
}

/** Contexto do membro dentro da empresa ativa. */
export interface ContextoDeMembro {
  role: string;
  allowed_modules: string[];
  module_configs: Record<string, unknown>;
  tenants: TenantEmbutido | TenantEmbutido[] | null;
}

export interface AuthService {
  signIn(email: string, pass: string): Promise<{ user: User | null; session: Session | null }>;
  googleSignIn(idToken: string, papel?: 'OWNER' | 'DEPENDENT'): Promise<GoogleSignInResult>;
  signOut(): Promise<{ success: boolean }>;
  refreshSession(): Promise<Session | null>;
  ehDesenvolvedor(): Promise<boolean>;
  getUserTenants(userId: string, role: 'OWNER' | 'DEPENDENT'): Promise<VinculoDeEmpresa[]>;
  getTenantMemberContext(tenantId: string, userId: string): Promise<ContextoDeMembro | null>;
  pingDatabase(): Promise<{ status: 'Online'; latency: number }>;
}

export const authService: AuthService = {
  async signIn(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return { user: data.user, session: data.session };
  },

  /**
   * 🔑 LOGIN PELO GOOGLE — PROPRIETÁRIO **E** DEPENDENTE (desde 13/09/2026)
   *
   * Fachada fina: a lógica mora no googleAuthService, que é o dono do assunto.
   * Existe aqui para que a guarita tenha uma porta só.
   *
   * ⚠️ CHAMAVA-SE `googleSignInOwner` E FOI RENOMEADA. O nome antigo dizia que a
   * porta era do Proprietário; ela deixou de ser. Como o Dependente não tinha
   * NENHUM caminho para criar conta (o cadastro saiu do menu na v7), manter o
   * nome antigo esconderia justamente a mudança que resolveu isso.
   */
  async googleSignIn(idToken: string, papel: 'OWNER' | 'DEPENDENT' = 'OWNER') {
    return googleAuthService.signInComGoogle(idToken, papel);
  },

  /**
   * 🚪 ENCERRA A SESSÃO DO CLIENTE.
   *
   * ⚠️ NO ADMIN-WEB ISTO SOZINHO NÃO É O LOGOUT COMPLETO: a sessão também vive
   * nos cookies HTTP, que o servidor escreveu. A metade que falta é a rota
   * `/auth/logout`. Ver `apps/admin-web/src/lib/logout.ts`.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  /**
   * 🔄 RENOVA O TOKEN DE ACESSO A PARTIR DO REFRESH TOKEN.
   * Devolve `null` quando não há sessão para renovar — "não há o que renovar"
   * não é falha.
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (error.message?.includes('Auth session missing')) return null;
      throw error;
    }
    return data.session;
  },

  /**
   * 🔧 QUEM ESTÁ LOGADO É O DESENVOLVEDOR?
   *
   * Pergunta ao BANCO, não ao navegador. A função `is_superuser()` lê a coluna
   * `is_superuser` da linha de quem está autenticado — e essa coluna não está
   * entre as que o cliente pode gravar (ver a seção 8 do schema).
   *
   * Falha de rede devolve `false`: na dúvida, o Painel de Engenharia não abre.
   */
  async ehDesenvolvedor() {
    const { data, error } = await supabase.rpc('is_superuser');
    if (error) {
      console.warn('[CORE-AUTH] Não foi possível confirmar o papel:', error.message);
      return false;
    }
    return data === true;
  },

  async getUserTenants(userId: string, role: 'OWNER' | 'DEPENDENT') {
    const { data, error } = await supabase
      .from('tenant_members')
      .select(`
        tenant_id,
        role,
        tenants!inner(
          tenant_name,
          slug,
          is_active,
          users!owner_id (
            full_name,
            email,
            is_active
          )
        )
      `)
      .eq('user_id', userId)
      .eq('role', role)
      .eq('is_active', true)
      .eq('tenants.is_active', true);

    if (error) {
      console.error('[CORE-AUTH] Erro na busca de vínculos:', error.message);
      throw error;
    }
    return (data ?? []) as unknown as VinculoDeEmpresa[];
  },

  async getTenantMemberContext(tenantId: string, userId: string) {
    const { data, error } = await supabase
      .from('tenant_members')
      .select(`
        role,
        allowed_modules,
        module_configs,
        tenants!inner(
          tenant_name,
          is_active,
          users!owner_id (
            full_name,
            email,
            is_active
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('tenants.is_active', true)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as ContextoDeMembro) ?? null;
  },

  /**
   * 📡 O banco responde? Mede a ida e volta lendo a linha pública do
   * white-label — a única consulta que qualquer pessoa pode fazer.
   */
  async pingDatabase() {
    const start = Date.now();
    const { error } = await supabase.from('global_settings').select('id').limit(1);
    const end = Date.now();
    if (error) throw error;
    return { status: 'Online', latency: end - start };
  },
};
