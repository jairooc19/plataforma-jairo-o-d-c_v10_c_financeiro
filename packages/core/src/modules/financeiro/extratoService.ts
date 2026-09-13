/**
 * 📊 EXTRATO, SALDOS E FECHAMENTO DE PERÍODO (PJODC v10)
 * Local: packages/core/src/modules/financeiro/extratoService.ts
 *
 * ⚠️ O SALDO NÃO É CALCULADO AQUI. Ele vem pronto da função `fin_extrato`, e
 * isso é o ponto central do desenho: a tela, o relatório impresso e a exportação
 * TSV chamam a MESMA função e mostram, portanto, o MESMO saldo. Se a soma
 * morasse neste arquivo, cada consumidor teria a sua cópia da lógica — e o dia
 * em que uma fosse corrigida e a outra não, apareceriam dois saldos para o
 * mesmo mês.
 *
 * 📖 Especificação, seções 13 e 16.3.
 */

import { supabase } from '../../lib/supabase';
import type { FechamentoDaConta, LinhaDoExtrato } from './tipos';

export const extratoService = {
  /**
   * O extrato de uma conta no período: saldo inicial, lançamentos com saldo
   * linha a linha, e a linha de totais.
   *
   * ⚠️ AS DUAS DATAS SÃO OBRIGATÓRIAS (RN-17) — o banco recusa sem elas, e a
   * tela deve mostrar "INFORME A DATA INICIAL E A DATA FINAL" em vez de pedir
   * uma lista vazia.
   *
   * ⚠️ SÓ REGIME CAIXA ENTRA (RN-19): lançamento de competência não é dinheiro
   * que andou na conta, e se entrasse o saldo nunca bateria com o do banco.
   */
  async extrato(
    tenantId: string,
    contaMovimentoId: string,
    dataInicial: string,
    dataFinal: string,
  ): Promise<LinhaDoExtrato[]> {
    const { data, error } = await supabase.rpc('fin_extrato', {
      p_tenant_id: tenantId,
      p_conta_movimento_id: contaMovimentoId,
      p_data_inicial: dataInicial,
      p_data_final: dataFinal,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaDoExtrato[];
  },

  /** O saldo de hoje de uma conta — usado no formulário de lançamento e, no futuro, nos painéis. */
  async saldoAtual(tenantId: string, contaMovimentoId: string): Promise<number> {
    const { data, error } = await supabase.rpc('fin_saldo_atual', {
      p_tenant_id: tenantId,
      p_conta_movimento_id: contaMovimentoId,
    });
    if (error) throw new Error(error.message);
    return (data as number) ?? 0;
  },

  /** Os cortes vigentes: até quando cada conta está trancada (RN-24). */
  async fechamentos(tenantId: string): Promise<FechamentoDaConta[]> {
    const { data, error } = await supabase
      .from('fin_fechamentos')
      .select('id, tenant_id, conta_movimento_id, fechado_ate, observacao')
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return (data ?? []) as FechamentoDaConta[];
  },

  /**
   * Fecha o período de uma conta — ou de TODAS, quando `contaMovimentoId` vem
   * nulo (foi a sua decisão na pergunta 29).
   *
   * Fechar por conta faz sentido porque cada uma é conferida contra um extrato
   * diferente, e eles não chegam no mesmo dia: o do banco sai no dia 1º, a
   * conferência da carteira pode demorar.
   */
  async fecharPeriodo(params: {
    tenantId: string;
    contaMovimentoId?: string | null;
    fechadoAte: string;
    observacao?: string | null;
  }): Promise<{ contasFechadas: number }> {
    const { data, error } = await supabase.rpc('fin_fechar_periodo', {
      p_tenant_id: params.tenantId,
      p_conta_movimento_id: params.contaMovimentoId ?? null,
      p_fechado_ate: params.fechadoAte,
      p_observacao: params.observacao ?? null,
    });
    if (error) throw new Error(error.message);
    return { contasFechadas: (data as { contas_fechadas: number }).contas_fechadas };
  },

  /** Reabre o período de uma conta — ou de todas, com `contaMovimentoId` nulo. */
  async reabrirPeriodo(tenantId: string, contaMovimentoId?: string | null): Promise<{ contasReabertas: number }> {
    const { data, error } = await supabase.rpc('fin_reabrir_periodo', {
      p_tenant_id: tenantId,
      p_conta_movimento_id: contaMovimentoId ?? null,
    });
    if (error) throw new Error(error.message);
    return { contasReabertas: (data as { contas_reabertas: number }).contas_reabertas };
  },
};
