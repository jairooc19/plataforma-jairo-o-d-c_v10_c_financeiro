/**
 * 🔑 PERMISSÕES DO DEPENDENTE NO MÓDULO FINANCEIRO (PJODC v10)
 * Local: packages/core/src/modules/financeiro/permissaoService.ts
 *
 * O Proprietário habilita um Dependente por e-mail e liga/desliga as 17
 * permissões, uma a uma. Nada disso inventa estrutura nova na plataforma: as
 * permissões moram em `tenant_members.module_configs`, coluna `jsonb` que
 * existe desde a v10 justamente para "configurações por módulo, por membro".
 *
 * ⚠️ ISTO AQUI É CONFORTO, NÃO SEGURANÇA. A tela lê estas permissões para
 * mostrar ou esconder botões; quem recusa a operação é a função do banco, que
 * chama `fin_pode()` antes de agir (RN-25). Esconder botão nunca foi controle
 * de acesso — foi a lição que custou o degrau 3 inteiro.
 *
 * 📖 Especificação, seção 4.
 */

import { supabase } from '../../lib/supabase';
import {
  PERMISSOES_PADRAO_DEPENDENTE,
  type ConfiguracaoDoMembro,
  type PermissaoFinanceiro,
} from './tipos';

/** Um membro da empresa, do ponto de vista do módulo. */
export interface MembroDoModulo {
  member_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  /** `true` quando o módulo está ligado para este membro. */
  modulo_ativo: boolean;
  permissoes: PermissaoFinanceiro[];
}

interface LinhaDeMembro {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  allowed_modules: string[] | null;
  module_configs: Record<string, unknown> | null;
  users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
}

/** Lê a configuração do módulo dentro do `module_configs` do membro. */
function lerConfiguracao(configs: Record<string, unknown> | null): ConfiguracaoDoMembro {
  const bruto = (configs ?? {})['financeiro'] as ConfiguracaoDoMembro | undefined;
  return {
    ativo: bruto?.ativo === true,
    permissoes: Array.isArray(bruto?.permissoes) ? (bruto!.permissoes as PermissaoFinanceiro[]) : [],
  };
}

export const permissaoFinanceiroService = {
  /**
   * Procura um usuário pelo e-mail para habilitá-lo como Dependente.
   *
   * ⚠️ A FUNÇÃO JÁ EXISTIA NA PLATAFORMA: `get_user_by_email_for_invite`, que
   * só o dono da empresa pode executar. O módulo não precisou de nada novo —
   * e é assim que deve ser, porque "quem é membro da empresa" é assunto da
   * plataforma; o módulo só decide o que ele pode fazer aqui dentro.
   *
   * Devolve `null` quando o e-mail não existe: a tela mostra "USUÁRIO NÃO
   * ENCONTRADO. ELE PRECISA CRIAR UMA CONTA NA PLATAFORMA ANTES DE SER
   * HABILITADO."
   */
  async procurarPorEmail(tenantId: string, email: string) {
    const { data, error } = await supabase.rpc('get_user_by_email_for_invite', {
      p_email: email,
      p_tenant_id: tenantId,
    });
    if (error) throw new Error(error.message);
    const lista = (data ?? []) as Array<{ id: string; full_name: string | null; email: string }>;
    return lista.length > 0 ? lista[0] : null;
  },

  /** Os membros da empresa, com o estado do módulo em cada um. */
  async listarMembros(tenantId: string): Promise<MembroDoModulo[]> {
    const { data, error } = await supabase
      .from('tenant_members')
      .select('id, user_id, role, is_active, allowed_modules, module_configs, users ( email, full_name )')
      .eq('tenant_id', tenantId)
      .order('role', { ascending: true });

    if (error) throw new Error(error.message);

    return ((data ?? []) as unknown as LinhaDeMembro[]).map((m) => {
      // O PostgREST devolve o embed "para um" ora como objeto, ora como array,
      // conforme a forma do select — a plataforma já tropeçou nisso antes.
      const u = Array.isArray(m.users) ? m.users[0] : m.users;
      const cfg = lerConfiguracao(m.module_configs);
      return {
        member_id: m.id,
        user_id: m.user_id,
        email: u?.email ?? '',
        full_name: u?.full_name ?? null,
        role: m.role,
        is_active: m.is_active,
        modulo_ativo: cfg.ativo && (m.allowed_modules ?? []).includes('financeiro'),
        permissoes: cfg.permissoes,
      };
    });
  },

  /**
   * Liga, desliga ou ajusta as permissões de um Dependente.
   *
   * ⚠️ DUAS COISAS SÃO GRAVADAS JUNTAS, e as duas importam:
   *   • `allowed_modules` — o gatilho `validar_modulos_membro` da plataforma
   *     recusa se a EMPRESA não tiver contratado o módulo (a primeira chave);
   *   • `module_configs.financeiro` — as permissões (a segunda chave).
   * Gravar só a segunda daria a um membro permissões de um módulo que a empresa
   * não contratou.
   */
  async definirAcesso(params: {
    tenantId: string;
    memberId: string;
    ativo: boolean;
    permissoes?: PermissaoFinanceiro[];
  }): Promise<void> {
    const atual = await supabase
      .from('tenant_members')
      .select('allowed_modules, module_configs')
      .eq('tenant_id', params.tenantId)
      .eq('id', params.memberId)
      .maybeSingle();

    if (atual.error) throw new Error(atual.error.message);

    const modulos = new Set<string>((atual.data?.allowed_modules as string[] | null) ?? []);
    if (params.ativo) modulos.add('financeiro');
    else modulos.delete('financeiro');

    const configs = { ...((atual.data?.module_configs as Record<string, unknown> | null) ?? {}) };
    configs['financeiro'] = {
      ativo: params.ativo,
      permissoes: params.permissoes ?? PERMISSOES_PADRAO_DEPENDENTE,
    } satisfies ConfiguracaoDoMembro;

    const { error } = await supabase
      .from('tenant_members')
      .update({ allowed_modules: Array.from(modulos), module_configs: configs })
      .eq('tenant_id', params.tenantId)
      .eq('id', params.memberId);

    if (error) throw new Error(error.message);
  },

  /**
   * Pergunta ao BANCO se o usuário atual tem uma permissão.
   *
   * Útil para a tela decidir o que mostrar — mas note que a resposta vem da
   * mesma função que as gravações consultam, então tela e banco nunca discordam.
   */
  async podeNoBanco(tenantId: string, permissao: PermissaoFinanceiro): Promise<boolean> {
    const { data, error } = await supabase.rpc('fin_pode', {
      p_tenant_id: tenantId,
      p_permissao: permissao,
    });
    if (error) throw new Error(error.message);
    return data === true;
  },
};
