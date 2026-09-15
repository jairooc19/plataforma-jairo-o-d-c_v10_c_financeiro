/**
 * 💸 LANÇAMENTOS E TRANSFERÊNCIAS (PJODC v10)
 * Local: packages/core/src/modules/financeiro/lancamentoService.ts
 *
 * ⚠️ NENHUMA REGRA MORA AQUI. Este arquivo traduz chamadas para as funções do
 * banco — quem valida permissão, período fechado, coerência de tipos e a
 * reordenação do dia é o PostgreSQL. Se a regra vivesse aqui, uma chamada por
 * fora da tela passaria por cima dela.
 *
 * 📖 Especificação, seções 12, 14 e 15.
 */

import { supabase } from '../../lib/supabase';
import type { DadosDoLancamento, Lancamento } from './tipos';

/** Os 13 filtros da tela de pesquisa (especificação, seção 15.1). */
export interface FiltroDeLancamentos {
  contasMovimento?: string[];
  contasIdentificadoras?: string[];
  dataInicial?: string | null;
  dataFinal?: string | null;
  valorDeCentavos?: number | null;
  valorAteCentavos?: number | null;
  tipoContaMovimento?: string | null;
  tipoContaIdentificadora?: string | null;
  usuarioId?: string | null;
  textoHistorico?: string | null;
  tipoMovimento?: string | null;
  propriedade?: string | null;
  regime?: string | null;
  /** Caixa de marcar: quando `true`, traz SOMENTE transferências. */
  somenteTransferencias?: boolean;
  /** Lista do mais recente para o mais antigo, ignorando os demais filtros. */
  ultimosAdicionados?: boolean;
  pagina?: number;
  porPagina?: number;
}

/** O que a tela de pesquisa mostra em cada linha, com os nomes já resolvidos. */
export interface LancamentoNaLista extends Lancamento {
  conta_movimento?: { nome: string } | null;
  conta_identificadora?: { nome: string } | null;
  usuario?: { email: string } | null;
}

export const lancamentoService = {
  /**
   * Cria ou edita um lançamento.
   *
   * ⚠️ A ORDEM PODE MUDAR OUTRAS LINHAS. Se a ordem informada já existir no dia,
   * a função do banco desloca as seguintes — tudo numa transação (RN-12). Por
   * isso a tela deve recarregar o extrato depois de gravar: outras linhas podem
   * ter mudado de posição.
   */
  async gravar(tenantId: string, dados: DadosDoLancamento): Promise<{ id: string; ordem: number | null }> {
    const { data, error } = await supabase.rpc('fin_gravar_lancamento', {
      p_tenant_id: tenantId,
      p_id: dados.id ?? null,
      p_conta_movimento_id: dados.conta_movimento_id,
      p_conta_identificadora_id: dados.conta_identificadora_id,
      p_data_movimento: dados.data_movimento,
      p_ordem_extrato: dados.ordem_extrato ?? null,
      p_tipo_movimento: dados.tipo_movimento,
      p_propriedade: dados.propriedade,
      p_regime: dados.regime,
      p_valor_centavos: dados.valor_centavos,
      p_historico: dados.historico ?? null,
    });
    if (error) throw new Error(error.message);
    const r = data as { id: string; ordem: number | null };
    return { id: r.id, ordem: r.ordem };
  },

  /**
   * Um lançamento inteiro, pelo id — para preencher o formulário na EDIÇÃO.
   *
   * ⚠️ POR QUE ISTO PRECISOU EXISTIR (13/09/2026). O extrato e a pesquisa
   * mostram o lançamento *resumido* (o extrato nem traz o valor bruto: traz
   * entrada, saída e saldo já calculados). Para reabrir a linha no formulário é
   * preciso o registro completo — conta, categoria, tipo, propriedade, regime,
   * valor e histórico. Montar isso a partir das colunas da tela seria adivinhar:
   * uma linha com "saída de 500,00" não diz se o regime era CAIXA ou
   * COMPETÊNCIA, e gravar de volta com o palpete errado corromperia o extrato.
   *
   * ⚠️ LEITURA DIRETA NA TABELA, e pode ser: a RLS já limita à empresa de quem
   * pergunta. O `.eq('tenant_id')` é o escudo explícito por cima disso —
   * cinto e suspensório, como o resto do módulo.
   *
   * Devolve `null` quando não existe (ou quando a RLS o esconde): a tela avisa
   * em vez de abrir um formulário vazio que gravaria um lançamento novo.
   */
  async buscarPorId(tenantId: string, id: string): Promise<Lancamento | null> {
    const { data, error } = await supabase
      .from('fin_lancamentos')
      .select(`
        id, tenant_id, conta_movimento_id, conta_identificadora_id,
        tipo_conta_movimento, tipo_conta_identificadora,
        data_movimento, ordem_extrato, tipo_movimento, propriedade, regime,
        valor_centavos, historico, conferido, transferencia_id, criado_por, created_at
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as unknown as Lancamento) ?? null;
  },

  /**
   * Exclui um lançamento.
   *
   * ⚠️ SE FOR PERNA DE TRANSFERÊNCIA, AS DUAS SAEM JUNTAS (RN-23) — e a
   * resposta diz isso em `era_transferencia`, para a tela avisar o usuário.
   * Apagar só uma perna deixaria o saldo de uma conta errado para sempre.
   */
  async excluir(tenantId: string, id: string): Promise<{ apagados: number; eraTransferencia: boolean }> {
    const { data, error } = await supabase.rpc('fin_excluir_lancamento', {
      p_tenant_id: tenantId,
      p_id: id,
    });
    if (error) throw new Error(error.message);
    const r = data as { apagados: number; era_transferencia: boolean };
    return { apagados: r.apagados, eraTransferencia: r.era_transferencia };
  },

  /**
   * A próxima ordem livre do dia, para sugerir no formulário (RN-11).
   */
  async proximaOrdem(contaMovimentoId: string, data: string): Promise<number> {
    const { data: r, error } = await supabase.rpc('fin_proxima_ordem', {
      p_conta_id: contaMovimentoId,
      p_data: data,
    });
    if (error) throw new Error(error.message);
    return (r as number) ?? 1;
  },

  /**
   * Transferência entre contas: um fato, duas pernas, uma transação (RN-23).
   *
   * A tela não pergunta propriedade nem regime — o banco grava `PRÓPRIO` e
   * `CAIXA` (RN-31), e usa a categoria "TRANSFERÊNCIA ENTRE CONTAS", que ele
   * cria na primeira vez.
   */
  async transferir(params: {
    tenantId: string;
    contaOrigemId: string;
    contaDestinoId: string;
    data: string;
    valorCentavos: number;
    historico?: string | null;
    /**
     * A posição de cada perna no extrato da sua conta (14/09/2026).
     *
     * ⚠️ NULO NÃO É ZERO: é "põe no fim do dia", que era o único comportamento
     * possível até aqui. Informada, a ordem entra na posição pedida e o banco
     * empurra as seguintes daquela conta naquela data (RN-12) — a mesma regra
     * do lançamento comum, agora aplicada às DUAS contas de uma vez.
     */
    ordemOrigem?: number | null;
    ordemDestino?: number | null;
  }): Promise<{ transferenciaId: string; ordemOrigem: number; ordemDestino: number }> {
    const { data, error } = await supabase.rpc('fin_transferir', {
      p_tenant_id: params.tenantId,
      p_conta_origem_id: params.contaOrigemId,
      p_conta_destino_id: params.contaDestinoId,
      p_data: params.data,
      p_valor_centavos: params.valorCentavos,
      p_historico: params.historico ?? null,
      p_ordem_origem: params.ordemOrigem ?? null,
      p_ordem_destino: params.ordemDestino ?? null,
    });
    if (error) throw new Error(error.message);
    const r = data as { transferencia_id: string; ordem_origem: number; ordem_destino: number };
    return {
      transferenciaId: r.transferencia_id,
      ordemOrigem: r.ordem_origem,
      ordemDestino: r.ordem_destino,
    };
  },

  /** Marca ou desmarca a linha como conferida na conciliação (RN-20). */
  async marcarConferido(tenantId: string, id: string, conferido: boolean): Promise<void> {
    const { error } = await supabase.rpc('fin_marcar_conferido', {
      p_tenant_id: tenantId,
      p_id: id,
      p_conferido: conferido,
    });
    if (error) throw new Error(error.message);
  },

  /**
   * A pesquisa com os 13 filtros cruzados.
   *
   * ⚠️ A LEITURA É DIRETA NA TABELA, e pode ser: a RLS já limita à empresa do
   * usuário. Só a ESCRITA precisa passar por função.
   */
  async pesquisar(tenantId: string, filtro: FiltroDeLancamentos = {}): Promise<LancamentoNaLista[]> {
    const porPagina = filtro.porPagina ?? 50;
    const pagina = filtro.pagina ?? 0;

    let q = supabase
      .from('fin_lancamentos')
      .select(`
        id, tenant_id, conta_movimento_id, conta_identificadora_id,
        tipo_conta_movimento, tipo_conta_identificadora,
        data_movimento, ordem_extrato, tipo_movimento, propriedade, regime,
        valor_centavos, historico, conferido, transferencia_id, criado_por, created_at,
        conta_movimento:fin_contas_movimento!fin_lanc_conta_movimento_fk ( nome ),
        conta_identificadora:fin_contas_identificadoras!fin_lanc_conta_identificadora_fk ( nome ),
        usuario:users!criado_por ( email )
      `)
      .eq('tenant_id', tenantId);

    if (filtro.contasMovimento?.length)        q = q.in('conta_movimento_id', filtro.contasMovimento);
    if (filtro.contasIdentificadoras?.length)  q = q.in('conta_identificadora_id', filtro.contasIdentificadoras);
    if (filtro.dataInicial)                    q = q.gte('data_movimento', filtro.dataInicial);
    if (filtro.dataFinal)                      q = q.lte('data_movimento', filtro.dataFinal);
    if (filtro.valorDeCentavos != null)        q = q.gte('valor_centavos', filtro.valorDeCentavos);
    if (filtro.valorAteCentavos != null)       q = q.lte('valor_centavos', filtro.valorAteCentavos);
    if (filtro.tipoContaMovimento)             q = q.eq('tipo_conta_movimento', filtro.tipoContaMovimento);
    if (filtro.tipoContaIdentificadora)        q = q.eq('tipo_conta_identificadora', filtro.tipoContaIdentificadora);
    if (filtro.usuarioId)                      q = q.eq('criado_por', filtro.usuarioId);
    if (filtro.tipoMovimento)                  q = q.eq('tipo_movimento', filtro.tipoMovimento);
    if (filtro.propriedade)                    q = q.eq('propriedade', filtro.propriedade);
    if (filtro.regime)                         q = q.eq('regime', filtro.regime);
    if (filtro.textoHistorico)                 q = q.ilike('historico', `%${filtro.textoHistorico}%`);
    if (filtro.somenteTransferencias)          q = q.not('transferencia_id', 'is', null);

    q = filtro.ultimosAdicionados
      ? q.order('created_at', { ascending: false })
      : q.order('data_movimento', { ascending: false })
         .order('ordem_extrato', { ascending: true, nullsFirst: false });

    q = q.range(pagina * porPagina, pagina * porPagina + porPagina - 1);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LancamentoNaLista[];
  },
};
