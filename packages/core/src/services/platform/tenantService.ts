/**
 * 🏢 TENANT SERVICE: EMPRESAS, EQUIPE E TRIAGEM (PJODC v10)
 * Local: packages/core/src/services/platform/tenantService.ts
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: A CHAVE MESTRA SUMIU DAQUI
 * ===========================================================================
 * Até a v9 as três operações do Painel de Engenharia usavam `supabaseAdmin`, o
 * cliente de SERVICE ROLE, que ignora a RLS. Como o aplicativo não pode carregar
 * essa chave, elas foram expostas em rotas HTTP `/api/admin/*` — que NÃO PEDIAM
 * IDENTIFICAÇÃO. Qualquer pessoa com o endereço criava e desativava empresas.
 *
 * Agora as mesmas operações são FUNÇÕES NO BANCO (`admin_*`) que conferem
 * `is_superuser()` com a sessão de quem chama. Consequências boas em cadeia:
 *   • a mesma chamada serve para a web e para o aparelho — sumiram as rotas
 *     `/api/admin/*` e o `adminApiService`;
 *   • sumiu a variável `EXPO_PUBLIC_API_URL` do aplicativo;
 *   • a sincronização virou UMA transação (antes eram até 2 + 2n gravações
 *     separadas, que podiam parar no meio).
 */

import { supabase } from '../../lib/supabase';

/** Uma empresa como a tela de gestão a envia para gravar. */
export interface EmpresaParaSincronizar {
  /** `null` ou ausente = empresa nova. */
  tenant_id?: string | null;
  name: string;
  is_active: boolean;
}

/** Linha de `public.users` como o Painel de Engenharia a lê. */
export interface UsuarioAdmin {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  is_active: boolean;
  is_client_owner: boolean;
  created_at: string;
}

/** Empresa de um usuário, como `admin_list_user_tenants` devolve. */
export interface EmpresaAdmin {
  member_id: string;
  tenant_id: string;
  tenant_name: string;
  slug: string;
  is_active: boolean;
  allowed_modules: string[];
}

/** Candidato a Dependente, devolvido pela busca por e-mail. */
export interface CandidatoDependente {
  id: string;
  full_name: string | null;
  email: string;
}

/** Membro já vinculado a uma empresa. */
export interface MembroDaEquipe {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  allowed_modules: string[];
  module_configs: Record<string, unknown>;
  users: { full_name: string | null; email: string };
}

export const tenantService = {
  // -------------------------------------------------------------------------
  // PAINEL DE ENGENHARIA — exige `is_superuser` (conferido dentro do banco)
  // -------------------------------------------------------------------------

  /** 📋 Todos os usuários, do mais recente para o mais antigo. */
  async listarUsuarios(): Promise<UsuarioAdmin[]> {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) throw error;
    return (data ?? []) as UsuarioAdmin[];
  },

  /** 🏢 As empresas de um usuário (ativas e inativas). */
  async listarEmpresasDoUsuario(userId: string): Promise<EmpresaAdmin[]> {
    const { data, error } = await supabase.rpc('admin_list_user_tenants', { p_user_id: userId });
    if (error) throw error;
    return (data ?? []) as EmpresaAdmin[];
  },

  /**
   * 💾 Grava a lista inteira de empresas de um usuário.
   *
   * ⚠️ É UMA OPERAÇÃO SÓ — E AGORA ISSO É VERDADE NO BANCO, não apenas na rede.
   * Criar empresa, reativar, desativar e ajustar o papel do usuário acontecem
   * dentro da mesma transação PL/pgSQL: ou tudo, ou nada.
   *
   * O erro de negócio `NOME_EMPRESA_DUPLICADO` sobe como exceção do PostgREST,
   * com essa mensagem exata, para a tela poder traduzi-lo.
   */
  async sincronizarEmpresas(
    userId: string,
    empresas: EmpresaParaSincronizar[],
    desativadas: string[]
  ): Promise<void> {
    const { error } = await supabase.rpc('admin_sync_user_tenants', {
      p_user_id: userId,
      p_tenants: empresas,
      p_deleted: desativadas,
    });
    if (error) throw new Error(error.message);
  },

  /** 🚀 Atalho: cria uma empresa e promove o usuário a Proprietário. */
  async promoverParaProprietario(userId: string, nomeDaEmpresa?: string): Promise<void> {
    const { error } = await supabase.rpc('admin_promote_to_owner', {
      p_user_id: userId,
      p_tenant_name: nomeDaEmpresa ?? null,
    });
    if (error) throw new Error(error.message);
  },

  // -------------------------------------------------------------------------
  // EQUIPE — o Proprietário administra os próprios colaboradores
  // -------------------------------------------------------------------------

  /**
   * 🔎 Procura alguém pelo e-mail para virar Dependente.
   *
   * ⚠️ AGORA EXIGE A EMPRESA. A função do banco confere se quem pergunta é o
   * dono dela. Sem isso, a busca era um verificador de "este e-mail tem conta
   * aqui?" disponível para qualquer um.
   */
  async buscarUsuarioPorEmail(email: string, tenantId: string): Promise<CandidatoDependente | null> {
    const { data, error } = await supabase.rpc('get_user_by_email_for_invite', {
      p_email: email.trim().toLowerCase(),
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    const lista = (data ?? []) as CandidatoDependente[];
    return lista.length > 0 ? lista[0] : null;
  },

  /** 👥 Os dependentes de uma empresa. */
  async listarMembros(tenantId: string): Promise<MembroDaEquipe[]> {
    const { data, error } = await supabase
      .from('tenant_members')
      .select('id, user_id, role, is_active, allowed_modules, module_configs, users ( full_name, email )')
      .eq('tenant_id', tenantId)
      .eq('role', 'DEPENDENT')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as MembroDaEquipe[];
  },

  /**
   * 💾 Cria ou atualiza o vínculo de um Dependente.
   *
   * ⚠️ `allowed_modules` É UMA LISTA (`text[]`), e não mais uma string vazia. A
   * coluna do banco mudou de tipo na v10; gravar `''` aqui passaria a ser erro
   * de tipo — que é exatamente a proteção que faltava.
   */
  async salvarDependente(
    tenantId: string,
    userId: string,
    ativo: boolean,
    modulos: string[] = []
  ): Promise<void> {
    const { error } = await supabase
      .from('tenant_members')
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          role: 'DEPENDENT',
          is_active: ativo,
          allowed_modules: modulos,
          module_configs: {},
        },
        { onConflict: 'tenant_id,user_id' }
      );

    if (error) throw error;
  },

  /** 🏢 As empresas em que alguém é Dependente ativo. */
  async listarVinculosDependente(userId: string) {
    const { data, error } = await supabase
      .from('tenant_members')
      .select(
        'id, role, is_active, allowed_modules, module_configs, tenants ( id, tenant_name, slug, is_active, users!owner_id ( full_name, email ) )'
      )
      .eq('user_id', userId)
      .eq('role', 'DEPENDENT')
      .eq('is_active', true);

    if (error) throw error;
    return data ?? [];
  },
};
