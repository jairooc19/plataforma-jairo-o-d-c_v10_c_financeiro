/**
 * 🧩 MODULE SERVICE: O CATÁLOGO E OS CONTRATOS DE MÓDULO (PJODC v10)
 * Local: packages/core/src/services/platform/moduleService.ts
 *
 * ===========================================================================
 * O QUE ESTE SERVIÇO É — E O QUE ELE NÃO É
 * ===========================================================================
 * É um serviço DA PLATAFORMA: ele trata de módulos em geral, e não conhece
 * nenhum módulo em particular. Nenhum identificador ("financeiro", "fin_") é
 * escrito aqui — todos chegam por parâmetro, vindos do banco.
 *
 * ⚠️ NÃO EXISTE MÉTODO PARA CRIAR UM MÓDULO NO CATÁLOGO, e a ausência é
 * deliberada. Quem escreve em `platform_modules` é o SEED DO PRÓPRIO MÓDULO,
 * colado no SQL Editor junto com o resto do banco dele. Se a aplicação pudesse
 * cadastrar módulos, existiria um módulo no catálogo sem as tabelas, sem as
 * telas e sem o manifesto — um nome apontando para o vazio.
 *
 * 📖 `MODULOS.md` na raiz.
 */

import { supabase } from '../../lib/supabase';

/** Uma linha do catálogo de módulos (`platform_modules`). */
export interface ModuloDoCatalogo {
  id: string;
  nome: string;
  descricao: string | null;
  is_active: boolean;
}

/** O catálogo visto do ponto de vista de UMA empresa. */
export interface ModuloDaEmpresa {
  module_id: string;
  nome: string;
  descricao: string | null;
  /** O módulo está ativo no catálogo da plataforma? */
  no_catalogo: boolean;
  /** Esta empresa contratou este módulo? */
  contratado: boolean;
}

/** Um módulo que a EMPRESA contratou — a lista que o Proprietário oferece à equipe. */
export interface ModuloContratado {
  module_id: string;
  nome: string;
  descricao: string | null;
}

/** Uma empresa, na tela de contratação de módulos do Painel de Engenharia. */
export interface EmpresaParaModulos {
  id: string;
  tenant_name: string;
  slug: string;
  is_active: boolean;
  owner_email: string;
  /** Quantos módulos esta empresa tem contratados e ativos. */
  qtd_modulos: number;
}

export const moduleService = {
  /**
   * PAINEL DE ENGENHARIA: todas as empresas da plataforma.
   *
   * As demais funções administrativas partem de um usuário
   * (`admin_list_user_tenants`); aqui a pergunta é outra — "quais empresas
   * existem?" — e é a lista que a tela de contratação precisa.
   */
  async listarEmpresas(): Promise<EmpresaParaModulos[]> {
    const { data, error } = await supabase.rpc('admin_list_all_tenants');

    if (error) throw new Error(error.message);
    return (data ?? []) as EmpresaParaModulos[];
  },

  /**
   * O catálogo inteiro, para quem estiver logado.
   *
   * Lista pública entre usuários autenticados: saber que existe um módulo não
   * dá acesso a dado nenhum dele.
   */
  async listarCatalogo(): Promise<ModuloDoCatalogo[]> {
    const { data, error } = await supabase
      .from('platform_modules')
      .select('id, nome, descricao, is_active')
      .order('nome');

    if (error) throw new Error(error.message);
    return (data ?? []) as ModuloDoCatalogo[];
  },

  /**
   * Os módulos que ESTE usuário pode abrir nesta empresa.
   *
   * ⚠️ QUEM CRUZA AS TRÊS CONDIÇÕES É O BANCO (`modulos_do_membro`): liberado
   * ao membro, contratado pela empresa e ativo no catálogo. Fazer esse cruzamento
   * aqui colocaria a regra no navegador, onde ela se edita com o console aberto.
   */
  async modulosPermitidos(tenantId: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('modulos_do_membro', {
      p_tenant_id: tenantId,
    });

    if (error) throw new Error(error.message);
    return (data ?? []) as string[];
  },

  /**
   * PROPRIETÁRIO: os módulos que a EMPRESA contratou, para ele distribuir à
   * equipe dele.
   *
   * ⚠️ NÃO USE `listarModulosDaEmpresa` PARA ISSO. Aquela é do Desenvolvedor e
   * confere `is_superuser()` lá dentro — na mão do Proprietário ela devolve
   * 42501. Foi a ausência desta função aqui que deixou o "Painel de Controle de
   * Tripulação" sem nada para oferecer (defeito encontrado por ele em
   * 12/09/2026, na validação do degrau 7).
   */
  async modulosContratados(tenantId: string): Promise<ModuloContratado[]> {
    const { data, error } = await supabase.rpc('modulos_contratados', {
      p_tenant_id: tenantId,
    });

    if (error) throw new Error(error.message);
    return (data ?? []) as ModuloContratado[];
  },

  /**
   * PAINEL DE ENGENHARIA: o catálogo com a marcação do que esta empresa já
   * contratou. A função do banco confere `is_superuser()` por dentro.
   */
  async listarModulosDaEmpresa(tenantId: string): Promise<ModuloDaEmpresa[]> {
    const { data, error } = await supabase.rpc('admin_list_tenant_modules', {
      p_tenant_id: tenantId,
    });

    if (error) throw new Error(error.message);
    return (data ?? []) as ModuloDaEmpresa[];
  },

  /**
   * PAINEL DE ENGENHARIA: contrata (ou descontrata) um módulo para uma empresa.
   *
   * ⚠️ DESCONTRATAR LIMPA OS MEMBROS NA MESMA TRANSAÇÃO — quem faz isso é a
   * função `admin_set_tenant_module`, não este arquivo. Duas chamadas separadas
   * (desligar aqui, limpar ali) deixariam a empresa sem o contrato e os membros
   * com o módulo na lista, se a segunda falhasse.
   */
  async definirContrato(tenantId: string, moduleId: string, contratado: boolean): Promise<void> {
    const { error } = await supabase.rpc('admin_set_tenant_module', {
      p_tenant_id: tenantId,
      p_module_id: moduleId,
      p_ativo: contratado,
    });

    if (error) throw new Error(error.message);
  },
};
