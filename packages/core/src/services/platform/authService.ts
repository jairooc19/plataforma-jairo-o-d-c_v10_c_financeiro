// Local: packages/core/src/services/platform/authService.ts

import { supabase, supabaseAdmin } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { googleAuthService, type GoogleSignInResult } from './googleAuthService';

/**
 * 🔐 INTERFACE DE CONTRATO AUTHSERVICE
 * Define explicitamente todas as funções para evitar erros de tipagem no Build do Vercel.
 */
export interface AuthService {
  signIn(email: string, pass: string): Promise<any>;
  googleSignInOwner(idToken: string): Promise<GoogleSignInResult>;
  signOut(): Promise<{ success: boolean }>;
  refreshSession(): Promise<Session | null>;
  getUserTenants(userId: string, role: 'OWNER' | 'DEPENDENT'): Promise<any[]>;
  getTenantMemberContext(tenantId: string, userId: string): Promise<any>;
  developerSignIn(email: string, pass: string): Promise<{ success: boolean; role?: string }>;
  pingDatabase(): Promise<{ status: "Online"; latency: number }>;
  getAdminNotificationEmails(): Promise<string[]>;
  notifyAdminNewUser(name: string, email: string): Promise<any>;
  getPendingUsers(): Promise<any[]>;
  promoteToOwner(userId: string, userName: string, userEmail: string): Promise<{ success: boolean; tenant: any }>;
}

/**
 * 🛰️ AUTHSERVICE: O CÉREBRO ÚNICO DA GUARITA (PJODC v10)
 * Versão: v10 - Proprietário entra por Google OAuth; Dependente e Desenvolvedor
 * seguem em e-mail + senha. Sem confirmação de e-mail.
 */
export const authService: AuthService = {
  
  async signIn(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  },

  /**
   * 🔑 LOGIN GOOGLE DO PROPRIETÁRIO (v7)
   * Fachada fina: a lógica mora no googleAuthService, que é o dono do assunto.
   * Existe aqui para que a guarita tenha uma porta só — `authService` — em vez
   * de a tela precisar saber qual serviço chamar para cada tipo de acesso.
   * ⚠️ NÃO se aplica a Dependente nem a Desenvolvedor: esses seguem em senha.
   */
  async googleSignInOwner(idToken: string) {
    return googleAuthService.signInOwner(idToken);
  },

  /**
   * 🚪 ENCERRA A SESSÃO DO NAVEGADOR.
   * Limpa o que o supabase-js guarda no cliente (access token, refresh token).
   *
   * ⚠️ NO ADMIN-WEB ISTO SOZINHO NÃO É O LOGOUT COMPLETO: a sessão também vive
   * nos cookies HTTP, que o servidor escreveu, e o navegador não os alcança.
   * A metade que falta é a rota `/auth/logout`. Chamar só uma das duas deixa o
   * usuário "deslogado" na tela e ainda autenticado para o middleware.
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  /**
   * 🔄 RENOVA O TOKEN DE ACESSO A PARTIR DO REFRESH TOKEN.
   *
   * No caminho normal ninguém precisa chamar isto: o cliente do navegador tem
   * `autoRefreshToken` e se vira sozinho, e o middleware renova os cookies do
   * servidor a cada requisição. Existe para o caso em que o app precisa de um
   * token válido AGORA — antes de uma operação longa, ou ao voltar de segundo
   * plano, quando o relógio do temporizador automático ficou para trás.
   *
   * Devolve `null` quando não há sessão para renovar (usuário já saiu), em vez
   * de lançar: "não há o que renovar" não é falha.
   */
  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (error.message?.includes('Auth session missing')) return null;
      throw error;
    }
    return data.session;
  },

  async getUserTenants(userId: string, role: 'OWNER' | 'DEPENDENT') {
    console.log(`🔍 [CORE-AUTH] Buscando vínculos: User ${userId} | Role ${role}`);
    const { data: members, error } = await supabase
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
      .eq('tenants.is_active', true);

    if (error) {
      console.error("❌ [CORE-AUTH] Erro na busca de vínculos:", error.message);
      throw error;
    }
    return members || [];
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
      .single();

    if (error) throw error;
    return data;
  },

  async developerSignIn(email: string, pass: string) {
    // 🔐 LOGIN DE DESENVOLVEDOR (v3 - SIMPLES)
    // Validação direta no código (sem servidor, sem bcrypt)
    if (email === 'admin@pjodc.ia' && pass === '1qaz') {
      return { success: true, role: 'DEVELOPER' };
    }
    return { success: false };
  },

  async pingDatabase() {
    const start = Date.now();
    const { error } = await supabase.from('global_settings').select('id').limit(1);
    const end = Date.now();
    if (error) throw error;
    return { status: "Online", latency: end - start };
  },

  async getAdminNotificationEmails() {
    if (!supabaseAdmin) return ['jairooc19@gmail.com'];
    const { data: settings, error } = await supabaseAdmin.from('global_settings').select('admin_emails').eq('id', 1).single();
    if (error) throw error;
    const rawEmails = settings?.admin_emails || 'jairooc19@gmail.com';
    return rawEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e.includes('@'));
  },

  /**
   * 📋 Registra um novo cadastro na trilha de triagem.
   * v4: a rota de destino apenas grava no log do servidor — não há envio de e-mail.
   */
  async notifyAdminNewUser(name: string, email: string) {
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://plataforma-jairo-o-d-c-v3.vercel.app';
      const response = await fetch(`${BASE_URL}/api/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!response.ok) return { success: false, silentFailure: true };
      return await response.json();
    } catch {
      return { success: false, silentFailure: true };
    }
  },

  async getPendingUsers() {
    if (!supabaseAdmin) throw new Error("Acesso administrativo não disponível.");
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role, created_at")
      .eq("is_client_owner", false)
      .eq("role", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async promoteToOwner(userId: string, userName: string, userEmail: string) {
    console.log(`🚀 [PROMOÇÃO] Iniciando cascata para: ${userEmail}`);

    if (!supabaseAdmin) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente no servidor.");
    
    const baseSlug = userName ? userName.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'tenant';
    const uniqueSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
    
    // A. Criação da Empresa (Tenants)
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert([{ 
        tenant_name: `Empresa de ${userName || userEmail}`, 
        slug: uniqueSlug, 
        owner_id: userId, 
        is_active: true 
      }])
      .select().single();
    
    if (tenantError) {
      console.error("❌ [PROMOÇÃO] Erro ao criar empresa:", tenantError.message);
      throw tenantError;
    }
    
    // B. Vínculo de Membro (Obrigatório para o getUserTenants encontrar)
    const { error: memberError } = await supabaseAdmin
      .from("tenant_members")
      .insert([{
        tenant_id: tenantData.id,
        user_id: userId,
        role: 'OWNER'
      }]);

    if (memberError) {
      console.error("❌ [PROMOÇÃO] Erro ao criar vínculo de membro:", memberError.message);
      throw memberError;
    }

    // C. Atualização do Perfil Mestre do Usuário
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({ role: 'active', is_client_owner: true, is_active: true })
      .eq("id", userId);
      
    if (userError) {
      console.error("❌ [PROMOÇÃO] Erro ao atualizar perfil:", userError.message);
      throw userError;
    }
    
    console.log("✅ [PROMOÇÃO] Sucesso: Empresa e Vínculo de Membro criados.");
    return { success: true, tenant: tenantData };
  }
};