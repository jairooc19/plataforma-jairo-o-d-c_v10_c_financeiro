/**
 * 📇 CADASTROS DO MÓDULO FINANCEIRO — contas e categorias (PJODC v10)
 * Local: packages/core/src/modules/financeiro/cadastroService.ts
 *
 * ⚠️ TODA GRAVAÇÃO PASSA POR FUNÇÃO DO BANCO, nunca por `.insert()` direto.
 * Não é preciosismo: as tabelas do módulo não têm policy de escrita, então um
 * `.insert()` seria recusado. O desenho é esse de propósito — a função valida o
 * conjunto (permissão, período fechado, coerência entre campos), coisa que uma
 * policy, que julga linha a linha, não consegue fazer.
 *
 * 📖 Especificação: `_estudos/modulo-financeiro-especificacao.html`, seções 10 e 11.
 */

import { supabase } from '../../lib/supabase';
import type {
  ContaMovimento,
  ContaIdentificadora,
  TipoContaMovimento,
  TipoContaIdentificadora,
} from './tipos';

/** Filtros da pesquisa dos dois cadastros (RN-03: todos se cruzam). */
export interface FiltroDeCadastro {
  texto?: string | null;
  tipo?: string | null;
  /** `true` lista do mais recente para o mais antigo, ignorando os demais filtros. */
  ultimosAdicionados?: boolean;
  incluirInativos?: boolean;
}

export const cadastroFinanceiroService = {
  // =========================================================================
  // CONTAS MOVIMENTO
  // =========================================================================

  /**
   * Lista as contas movimento da empresa, com os filtros cruzados.
   *
   * A leitura é direta na tabela porque a RLS já limita à empresa do usuário —
   * é a mesma consulta que o extrato e as listas de lançamento usam.
   */
  async listarContasMovimento(tenantId: string, filtro: FiltroDeCadastro = {}): Promise<ContaMovimento[]> {
    let q = supabase
      .from('fin_contas_movimento')
      .select('id, tenant_id, nome, tipo, saldo_abertura_centavos, is_active, created_at')
      .eq('tenant_id', tenantId);

    if (!filtro.incluirInativos) q = q.eq('is_active', true);
    if (filtro.tipo) q = q.eq('tipo', filtro.tipo);
    if (filtro.texto && filtro.texto.trim() !== '') {
      // A busca "em qualquer posição" que a especificação pede (seção 10.1).
      q = q.ilike('nome', `%${filtro.texto.trim()}%`);
    }

    q = filtro.ultimosAdicionados
      ? q.order('created_at', { ascending: false })
      : q.order('nome', { ascending: true });

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as ContaMovimento[];
  },

  /**
   * As até 4 sugestões que aparecem enquanto se digita o nome.
   *
   * ⚠️ QUEM BUSCA É O BANCO, e não a tela filtrando uma lista inteira: a função
   * `fin_buscar_contas_movimento` ignora acentos (com `unaccent`) e limita a 4.
   * Filtrar no navegador exigiria baixar todas as contas antes de digitar.
   */
  async sugerirContasMovimento(tenantId: string, texto: string) {
    const { data, error } = await supabase.rpc('fin_buscar_contas_movimento', {
      p_tenant_id: tenantId,
      p_texto: texto,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; nome: string; tipo: TipoContaMovimento; is_active: boolean }>;
  },

  /**
   * Cria ou edita uma conta movimento.
   *
   * ⚠️ A FUNÇÃO DO BANCO RECUSA MUDAR O TIPO se a conta já tiver lançamento
   * (RN-07). A tela deve mostrar a mensagem que vem do banco: ela já explica o
   * caminho ("desative esta e crie outra com o tipo correto").
   */
  async gravarContaMovimento(params: {
    tenantId: string;
    id?: string | null;
    nome: string;
    tipo: TipoContaMovimento;
    saldoAberturaCentavos?: number;
    isActive?: boolean;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('fin_gravar_conta_movimento', {
      p_tenant_id: params.tenantId,
      p_id: params.id ?? null,
      p_nome: params.nome,
      p_tipo: params.tipo,
      p_saldo_abertura_centavos: params.saldoAberturaCentavos ?? 0,
      p_is_active: params.isActive ?? true,
    });
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  },

  /**
   * Exclui uma conta movimento.
   *
   * ⚠️ SE HOUVER LANÇAMENTO, O BANCO RECUSA (RN-04, `ON DELETE RESTRICT`) — e é
   * assim que deve ser. A tela transforma o erro `23001` na frase que sugere
   * desativar em vez de excluir.
   */
  async excluirContaMovimento(tenantId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('fin_contas_movimento')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // =========================================================================
  // CONTAS IDENTIFICADORAS
  // =========================================================================

  async listarIdentificadoras(tenantId: string, filtro: FiltroDeCadastro = {}): Promise<ContaIdentificadora[]> {
    let q = supabase
      .from('fin_contas_identificadoras')
      .select('id, tenant_id, nome, tipo, is_active, is_sistema, created_at')
      .eq('tenant_id', tenantId);

    if (!filtro.incluirInativos) q = q.eq('is_active', true);
    if (filtro.tipo) q = q.eq('tipo', filtro.tipo);
    if (filtro.texto && filtro.texto.trim() !== '') {
      q = q.ilike('nome', `%${filtro.texto.trim()}%`);
    }

    q = filtro.ultimosAdicionados
      ? q.order('created_at', { ascending: false })
      : q.order('nome', { ascending: true });

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as ContaIdentificadora[];
  },

  async sugerirIdentificadoras(tenantId: string, texto: string) {
    const { data, error } = await supabase.rpc('fin_buscar_identificadoras', {
      p_tenant_id: tenantId,
      p_texto: texto,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; nome: string; tipo: TipoContaIdentificadora; is_active: boolean }>;
  },

  /**
   * Cria ou edita uma categoria.
   *
   * ⚠️ A CATEGORIA DO SISTEMA ("TRANSFERÊNCIA ENTRE CONTAS") É RECUSADA pela
   * função do banco (RN-30). Sem essa trava, bastaria mudá-la para DESPESA para
   * inflar todos os relatórios, ou desativá-la para quebrar a próxima
   * transferência.
   */
  async gravarIdentificadora(params: {
    tenantId: string;
    id?: string | null;
    nome: string;
    tipo: TipoContaIdentificadora;
    isActive?: boolean;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('fin_gravar_identificadora', {
      p_tenant_id: params.tenantId,
      p_id: params.id ?? null,
      p_nome: params.nome,
      p_tipo: params.tipo,
      p_is_active: params.isActive ?? true,
    });
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  },

  async excluirIdentificadora(tenantId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('fin_contas_identificadoras')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
