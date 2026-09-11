/**
 * 🏢 TENANT SERVICE: O Gestor de Infraestrutura (PJODC v4)
 * Atualizado: Plataforma pura — nenhum módulo funcional instalado.
 */

import { supabase, supabaseAdmin } from '../../lib/supabase';

export interface TenantSyncData {
  member_id?: string;
  tenant_id?: string;
  name: string;
  slug: string;
  is_active: boolean;
  isNew: boolean;
}

export const tenantService = {

  /**
   * 1. BUSCA GLOBAL DE USUÁRIOS
   */
  async getAllUsers() {
    if (!supabaseAdmin) throw new Error("ERRO_CHAVE_MESTRA_NULA");
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role, is_active, is_client_owner, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * 2. BUSCA CONTEXTO DE TODAS AS EMPRESAS DO USUÁRIO
   */
  async getUserTenantManagement(userId: string) {
    if (!supabaseAdmin) throw new Error("Acesso administrativo offline.");
    const { data, error } = await supabaseAdmin
      .from("tenant_members")
      .select(`id, allowed_modules, module_configs, tenants ( id, tenant_name, slug, is_active )`)
      .eq("user_id", userId)
      .eq("role", "OWNER");
    if (error) throw error;
    return data;
  },

  /**
   * 3. SINCRONIZAÇÃO EM MASSA (Painel do Desenvolvedor)
   */
  async syncUserTenants(userId: string, tenantsToSync: TenantSyncData[], deletedIds: string[]) {
    if (!supabaseAdmin) throw new Error("Acesso administrative offline.");

    // A. DESATIVAÇÃO LÓGICA
    if (deletedIds.length > 0) {
      const { error: delError } = await supabaseAdmin
        .from("tenants")
        .update({ is_active: false })
        .in("id", deletedIds);
      if (delError) throw delError;
    }

    // B. PROCESSA SINCRONIZAÇÃO
    for (const t of tenantsToSync) {
      // Plataforma pura: nenhum módulo funcional para habilitar.
      const allowedModules = '';
      const moduleConfigs = {};

      if (t.isNew) {
        const { data: nt, error: ntErr } = await supabaseAdmin
          .from("tenants")
          .insert({ tenant_name: t.name, slug: t.slug, owner_id: userId, is_active: true })
          .select().single();

        if (ntErr) {
          if (ntErr.code === '23505') throw new Error("NOME_EMPRESA_DUPLICADO");
          throw ntErr;
        }

        const { error: memErr } = await supabaseAdmin.from("tenant_members").insert({
          tenant_id: nt.id,
          user_id: userId,
          role: 'OWNER',
          allowed_modules: allowedModules,
          module_configs: moduleConfigs
        });
        if (memErr) throw memErr;
      } else {
        const { error: upTenantErr } = await supabaseAdmin
          .from("tenants")
          .update({ is_active: t.is_active, tenant_name: t.name })
          .eq('id', t.tenant_id);
        
        if (upTenantErr) {
            if (upTenantErr.code === '23505') throw new Error("NOME_EMPRESA_DUPLICADO");
            throw upTenantErr;
        }

        const { error: upMemErr } = await supabaseAdmin
          .from("tenant_members")
          .update({
            allowed_modules: allowedModules,
            module_configs: moduleConfigs
          })
          .eq('id', t.member_id);
        
        if (upMemErr) throw upMemErr;
      }
    }

    // C. ATUALIZAÇÃO DO STATUS DO USUÁRIO
    const hasActiveTenants = tenantsToSync.some(t => t.is_active);
    const newRole = hasActiveTenants ? 'active' : 'pending';
    
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({ role: newRole, is_client_owner: hasActiveTenants })
      .eq('id', userId);
    
    if (userError) throw userError;

    return { success: true };
  },

  /**
   * DEMAIS FUNÇÕES DE SUPORTE
   */
  async searchUserByEmail(email: string) {
    const { data, error } = await supabase.rpc('get_user_by_email_for_invite', {
      p_email: email.trim().toLowerCase()
    });
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  async getTenantMembers(tenantId: string) {
    const { data, error } = await supabase
      .from("tenant_members")
      .select(`id, user_id, role, is_active, module_configs, users ( full_name, email )`)
      .eq("tenant_id", tenantId)
      .eq("role", "DEPENDENT")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async saveDependentMember(tenantId: string, userId: string, isActive: boolean) {
    // Plataforma pura: o vínculo é criado sem módulos habilitados.
    const { data, error } = await supabase
      .from("tenant_members")
      .upsert({
        tenant_id: tenantId, user_id: userId, role: 'DEPENDENT', is_active: isActive,
        module_configs: {}, allowed_modules: ''
      }, { onConflict: 'tenant_id,user_id' })
      .select();
    if (error) throw error;
    return data;
  },

  async getDependentTenants(userId: string) {
    const { data, error } = await supabase
      .from("tenant_members")
      .select(`id, role, is_active, module_configs, tenants ( id, tenant_name, slug, is_active, users!owner_id ( full_name, email ) )`)
      .eq("user_id", userId)
      .eq("role", "DEPENDENT")
      .eq("is_active", true);
    if (error) throw error;
    return data;
  }
};