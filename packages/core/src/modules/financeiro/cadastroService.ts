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
import type { RelatorioDeImportacao } from './importacao';
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
  /**
   * Só nas contas movimento: traz também o SALDO DE ABERTURA.
   *
   * ⚠️ EXIGE `cm_ver` (23/09/2026). O saldo de abertura deixou de ser legível
   * direto na tabela — é um valor, e só `cm_ver` o revela. Ele vem da função
   * `fin_saldos_de_abertura`, que recusa com 42501 sem a permissão. Peça só na
   * tela de CADASTRO; a lista do formulário de lançamento não precisa dele.
   */
  comSaldoAbertura?: boolean;
}

export const cadastroFinanceiroService = {
  // =========================================================================
  // CONTAS MOVIMENTO
  // =========================================================================

  /**
   * Lista as contas movimento da empresa, com os filtros cruzados.
   *
   * A leitura é direta na tabela porque a RLS limita a quem tem acesso ao
   * módulo naquela empresa (`fin_tem_acesso`) — é a mesma consulta que as
   * listas de lançamento e de transferência usam.
   *
   * ⚠️ `saldo_abertura_centavos` NÃO ESTÁ NA LISTA DE COLUNAS, E NÃO PODE
   * VOLTAR (23/09/2026): a coluna perdeu o `SELECT` no banco, e pedi-la aqui
   * faria a lista inteira responder `permission denied for column`. Quem
   * precisa dele passa `comSaldoAbertura`.
   */
  async listarContasMovimento(tenantId: string, filtro: FiltroDeCadastro = {}): Promise<ContaMovimento[]> {
    let q = supabase
      .from('fin_contas_movimento')
      .select('id, tenant_id, nome, tipo, is_active, created_at')
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
    const contas = (data ?? []) as ContaMovimento[];
    if (!filtro.comSaldoAbertura || contas.length === 0) return contas;

    const { data: saldos, error: erroSaldos } = await supabase.rpc('fin_saldos_de_abertura', {
      p_tenant_id: tenantId,
    });
    if (erroSaldos) throw new Error(erroSaldos.message);
    const porId = new Map(
      ((saldos ?? []) as Array<{ id: string; saldo_abertura_centavos: number }>)
        .map((s) => [s.id, s.saldo_abertura_centavos]),
    );
    return contas.map((c) => ({ ...c, saldo_abertura_centavos: porId.get(c.id) ?? 0 }));
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
   * ⚠️ SE HOUVER LANÇAMENTO, O BANCO RECUSA (RN-04) — e é assim que deve ser.
   * A mensagem dele começa por "Existem lancamentos", e a tela a traduz na
   * frase que sugere desativar em vez de excluir.
   *
   * ⚠️ ATÉ 23/09/2026 ISTO ERA UM `DELETE` DIRETO NA TABELA, E NUNCA
   * FUNCIONOU: as tabelas `fin_*` só dão `SELECT` ao app. Todo clique voltava
   * `permission denied`, e a tela dizia "existem lançamentos" até para a conta
   * sem lançamento nenhum. Agora é a função, que confere `cm_excluir`.
   */
  async excluirContaMovimento(tenantId: string, id: string): Promise<void> {
    const { error } = await supabase.rpc('fin_excluir_conta_movimento', {
      p_tenant_id: tenantId,
      p_id: id,
    });
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

  /**
   * Exclui uma categoria — pela função, que confere `ci_excluir`, recusa a
   * categoria do sistema (RN-30) e a que tem lançamento (RN-04). Ver a nota da
   * `excluirContaMovimento`: o `DELETE` direto que havia aqui nunca funcionou.
   */
  async excluirIdentificadora(tenantId: string, id: string): Promise<void> {
    const { error } = await supabase.rpc('fin_excluir_identificadora', {
      p_tenant_id: tenantId,
      p_id: id,
    });
    if (error) throw new Error(error.message);
  },

  /**
   * 📥 IMPORTAÇÃO EM LOTE DE CONTAS MOVIMENTO (13/09/2026).
   *
   * ⚠️ UMA CHAMADA SÓ, E É DE PROPÓSITO. A alternativa seria um laço chamando
   * `gravarContaMovimento` por nome: com 300 linhas, são 300 idas e voltas à
   * internet — lento, e se a conexão cair na linha 180 metade entrou e ninguém
   * sabe qual metade. A função `fin_importar_contas_movimento` faz tudo dentro
   * do banco e devolve o relatório do que criou e do que ignorou.
   *
   * ⚠️ ELA NÃO É "TUDO OU NADA". Nomes repetidos ou já cadastrados são
   * IGNORADOS, não recusados — e aparecem no relatório. Derrubar 300 cadastros
   * porque 4 já existiam seria hostil, e é justamente o caso mais comum: a
   * segunda importação do mesmo arquivo corrigido.
   */
  async importarContasMovimento(
    tenantId: string,
    tipo: TipoContaMovimento,
    nomes: string[],
  ): Promise<RelatorioDeImportacao> {
    const { data, error } = await supabase.rpc('fin_importar_contas_movimento', {
      p_tenant_id: tenantId,
      p_tipo: tipo,
      p_nomes: nomes,
    });
    if (error) throw new Error(error.message);
    return data as RelatorioDeImportacao;
  },

  /**
   * 📥 IMPORTAÇÃO EM LOTE DE CONTAS IDENTIFICADORAS.
   *
   * Gêmea da anterior, com um item a mais no relatório: `reservados`. O nome
   * "TRANSFERÊNCIA ENTRE CONTAS" pertence ao sistema (RN-30) e nunca entra por
   * importação — se entrasse como categoria comum, a primeira transferência da
   * empresa falharia para sempre, com um erro que não menciona importação.
   */
  async importarIdentificadoras(
    tenantId: string,
    tipo: TipoContaIdentificadora,
    nomes: string[],
  ): Promise<RelatorioDeImportacao> {
    const { data, error } = await supabase.rpc('fin_importar_identificadoras', {
      p_tenant_id: tenantId,
      p_tipo: tipo,
      p_nomes: nomes,
    });
    if (error) throw new Error(error.message);
    return data as RelatorioDeImportacao;
  },
};
