/**
 * 📊 OS DOIS DASHBOARDS E AS DUAS CONFERÊNCIAS (PJODC v10)
 * Local: packages/core/src/modules/financeiro/dashboardService.ts
 *
 * ⚠️ NENHUM NÚMERO É CALCULADO AQUI. Este arquivo traduz quatro chamadas para
 * quatro funções do banco — os saldos, os movimentos, e os dois extratos. Os
 * totais de cada bloco vêm prontos, em linhas marcadas com `linha_tipo`.
 *
 * ⚠️ POR QUE UMA CHAMADA POR DASHBOARD, E NÃO DOZE POR CONTA. A conta é simples:
 * numa empresa com 20 contas movimento, pedir mês a mês seriam 240 idas e
 * voltas até o Supabase só para desenhar uma tela. É o mesmo princípio que o
 * CLAUDE.md já impõe à gravação em lote ("uma função que recebe o array faz uma
 * viagem só"), aplicado à leitura.
 *
 * ⚠️ TUDO AQUI EXIGE A PERMISSÃO `extrato_ver`, conferida DENTRO do banco por
 * `fin_pode()`. Nenhuma permissão nova foi criada para os dashboards: continuam
 * sendo 18, e `extrato_ver` já se chama "VER A CONFERÊNCIA DA CONTA (SALDOS)".
 *
 * 📖 Estudo: `_estudos/estudo-2026-09-18-dashboards-saldos-por-mes.html`.
 */

import { supabase } from '../../lib/supabase';
import type {
  LinhaSaldoMensal,
  LinhaMovimentoMensal,
  LinhaDoExtratoIdentificadora,
  LinhaDoExtratoConsolidado,
} from './tipos';

export const dashboardFinanceiroService = {
  /**
   * DASHBOARD 1 — o saldo de cada conta movimento no último dia de cada mês.
   *
   * Devolve uma linha por conta e por mês (12 por conta), mais as linhas de
   * TOTAL de cada bloco. Contas DESATIVADAS que tenham movimento continuam na
   * lista, marcadas com `is_active = false`: escondê-las faria o total encolher
   * em silêncio (a RN-06 vale para as listas de lançamento, não para relatório).
   */
  async saldosMensaisDeContasMovimento(tenantId: string, ano: number): Promise<LinhaSaldoMensal[]> {
    const { data, error } = await supabase.rpc('fin_saldos_mensais_movimento', {
      p_tenant_id: tenantId,
      p_ano: ano,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaSaldoMensal[];
  },

  /**
   * DASHBOARD 2 — quanto passou por cada identificadora em cada mês.
   *
   * ⚠️ AQUI NÃO HÁ ACÚMULO: cada célula é o mês sozinho. E a linha `RESULTADO`
   * (receitas menos despesas) já vem calculada pelo banco.
   */
  async movimentosMensaisDeIdentificadoras(tenantId: string, ano: number): Promise<LinhaMovimentoMensal[]> {
    const { data, error } = await supabase.rpc('fin_movimentos_mensais_identificadora', {
      p_tenant_id: tenantId,
      p_ano: ano,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaMovimentoMensal[];
  },

  /**
   * A CONFERÊNCIA DA CONTA IDENTIFICADORA — o destino do clique no dashboard 2.
   *
   * ⚠️ AS DUAS DATAS SÃO OBRIGATÓRIAS (RN-17), como no extrato comum.
   */
  async extratoDaIdentificadora(
    tenantId: string,
    contaIdentificadoraId: string,
    dataInicial: string,
    dataFinal: string,
  ): Promise<LinhaDoExtratoIdentificadora[]> {
    const { data, error } = await supabase.rpc('fin_extrato_identificadora', {
      p_tenant_id: tenantId,
      p_conta_identificadora_id: contaIdentificadoraId,
      p_data_inicial: dataInicial,
      p_data_final: dataFinal,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaDoExtratoIdentificadora[];
  },

  /**
   * A CONFERÊNCIA DE VÁRIAS CONTAS SOMADAS — o clique na linha de TOTAL.
   *
   * ⚠️ `null` E `[]` SÃO COISAS DIFERENTES, e é por isso que o parâmetro não
   * tem `?? null` em lugar nenhum deste arquivo:
   *
   *     undefined / null → "não estou escolhendo": TODAS as contas
   *     []               → "desmarquei tudo": NENHUMA conta
   *
   * Confundi-los faria um DESMARCAR TODOS mostrar o extrato inteiro da empresa.
   * É a mesma lição que a exclusão em lote pagou em 17/09/2026, agora do lado
   * da leitura — e a trava 40 do `teste_financeiro.sql` a fixa no banco.
   */
  async extratoConsolidado(
    tenantId: string,
    contaMovimentoIds: string[] | null | undefined,
    dataInicial: string,
    dataFinal: string,
  ): Promise<LinhaDoExtratoConsolidado[]> {
    const { data, error } = await supabase.rpc('fin_extrato_consolidado', {
      p_tenant_id: tenantId,
      // ⚠️ `=== undefined` de propósito: um `?? null` transformaria `[]` em
      // `null` — não transformaria, mas a intenção precisa ficar escrita, e um
      // `||` transformaria. `[]` tem de chegar ao banco como `[]`.
      p_conta_movimento_ids: contaMovimentoIds === undefined ? null : contaMovimentoIds,
      p_data_inicial: dataInicial,
      p_data_final: dataFinal,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaDoExtratoConsolidado[];
  },
};
