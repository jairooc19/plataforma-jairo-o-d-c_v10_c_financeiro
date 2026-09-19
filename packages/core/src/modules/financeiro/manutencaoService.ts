/**
 * 🧹 MANUTENÇÃO: EXCLUSÃO EM LOTE E LIXEIRA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/manutencaoService.ts
 *
 * As três operações mais destrutivas — e a que desfaz as outras duas:
 * simular uma exclusão por período, executá-la, listar o que foi excluído e
 * restaurar.
 *
 * ⚠️ ARQUIVO PRÓPRIO, E NÃO MAIS UM MÉTODO NO `extratoService`. A regra de ouro
 * do projeto manda um arquivo por responsabilidade; "calcular saldo" e "apagar
 * um ano de lançamentos" não são a mesma responsabilidade, e misturá-las faria
 * a tela de extrato importar, sem precisar, a função que apaga tudo.
 *
 * ⚠️ NÃO HÁ NENHUMA REGRA DE NEGÓCIO AQUI DENTRO, E ISSO É DELIBERADO. Este
 * arquivo só traduz chamada e formato. Quem decide se pode, se o período está
 * fechado, se a transferência sai inteira e quantos registros saem é o BANCO —
 * em uma única função transacional. Uma segunda cópia da regra aqui seria a que
 * esqueceria um detalhe no dia em que a do banco mudasse.
 *
 * 📖 Especificação, RN-23, RN-24, RN-25, RN-28.
 */

import { supabase } from '../../lib/supabase';

/** O que a simulação (ou a exclusão) devolve. */
export interface RelatorioDeExclusao {
  /** `true` quando nada foi apagado — foi só uma conferência. */
  simulacao: boolean;
  /** Quantos lançamentos ENTRAM na operação, pernas de transferência incluídas. */
  lancamentos: number;
  /**
   * Quantos desses NÃO casavam com o filtro pedido.
   *
   * ⚠️ ESTE NÚMERO PRECISA APARECER NA TELA. Ele são as outras pernas de
   * transferências (RN-23): apagar "setembro do CAIXA" pode apagar lançamentos
   * de OUTRAS contas, e quem confirma tem de saber disso ANTES.
   */
  foraDoFiltro: number;
  /** Quantas transferências distintas estão envolvidas. */
  transferencias: number;
  /** Os nomes das contas afetadas, para a tela citar. */
  contas: string[];
  /** Quantos saíram de verdade. Sempre 0 na simulação. */
  apagados: number;
}

/** Uma linha da lixeira — um lançamento que foi excluído. */
export interface LancamentoExcluido {
  audit_id: number;
  excluido_em: string;
  excluido_por: string;
  lancamento_id: string;
  data_movimento: string;
  conta: string;
  identificadora: string;
  tipo_movimento: string;
  valor_centavos: number;
  historico: string | null;
  transferencia_id: string | null;
  /** `true` quando este lançamento já voltou para a tabela. */
  ja_restaurado: boolean;
}

/**
 * Um evento de fechamento de período.
 *
 * ⚠️ AS LINHAS VÊM DE DUAS FONTES, E `em_vigor` DIZ DE QUAL. `true` é a linha
 * VIVA de `fin_fechamentos` — o fechamento que vale agora, com quem o deixou
 * assim e quando. `false` é um evento passado, lido da trilha de auditoria
 * (uma alteração ou uma exclusão).
 */
export interface EventoDeFechamento {
  quando: string;
  operacao: string;
  quem: string;
  conta: string;
  fechado_ate: string | null;
  observacao: string | null;
  /** `true` = o fechamento que está valendo; `false` = um evento já passado. */
  em_vigor: boolean;
}

interface RetornoBrutoDeExclusao {
  simulacao: boolean;
  lancamentos: number;
  fora_do_filtro: number;
  transferencias: number;
  contas: string[];
  apagados: number;
}

const paraRelatorio = (bruto: RetornoBrutoDeExclusao): RelatorioDeExclusao => ({
  simulacao: bruto.simulacao,
  lancamentos: bruto.lancamentos,
  foraDoFiltro: bruto.fora_do_filtro,
  transferencias: bruto.transferencias,
  contas: bruto.contas ?? [],
  apagados: bruto.apagados,
});

export const manutencaoFinanceiroService = {
  /**
   * Conta o que sairia, SEM apagar nada.
   *
   * ⚠️ A TELA TEM DE CHAMAR ISTO ANTES DE `excluirPorPeriodo`, sempre. Quem
   * conta é a mesma função que apaga, percorrendo o mesmo conjunto — se a tela
   * contasse por conta própria, um dia mostraria 137 na confirmação e o banco
   * apagaria 141.
   *
   * ⚠️ ELA ESTOURA se o período estiver fechado, e isso é o certo: a simulação
   * responde "o que aconteceria se eu confirmasse?". Devolver uma contagem
   * alegre e só recusar no fim faria a pessoa clicar em EXCLUIR para descobrir
   * que não podia.
   */
  async simularExclusaoPorPeriodo(params: {
    tenantId: string;
    contaMovimentoId?: string | null;
    dataInicial: string;
    dataFinal: string;
    /**
     * Os lançamentos marcados na lista. `null`/ausente = o período inteiro.
     *
     * ⚠️ `[]` E `null` SÃO COISAS DIFERENTES, E CONFUNDI-LOS APAGARIA O MÊS.
     * `[]` quer dizer "desmarquei tudo" (nada sai); `null` quer dizer "não
     * estou escolhendo, leve o período". Por isso o `?? null` abaixo é feito
     * só sobre `undefined` — um array vazio atravessa inteiro até o banco,
     * que o trata explicitamente.
     */
    ids?: string[] | null;
  }): Promise<RelatorioDeExclusao> {
    const { data, error } = await supabase.rpc('fin_excluir_lancamentos_por_periodo', {
      p_tenant_id: params.tenantId,
      p_conta_movimento_id: params.contaMovimentoId ?? null,
      p_data_inicial: params.dataInicial,
      p_data_final: params.dataFinal,
      p_simular: true,
      p_ids: params.ids === undefined ? null : params.ids,
    });
    if (error) throw new Error(error.message);
    return paraRelatorio(data as RetornoBrutoDeExclusao);
  },

  /**
   * Apaga de verdade.
   *
   * ⚠️ `p_simular: false` É PASSADO EXPLICITAMENTE, e nunca omitido. O padrão
   * do parâmetro no banco é `true` — de propósito, para que esquecê-lo seja
   * inofensivo. Aqui a intenção de apagar é escrita por extenso, para que
   * ninguém a produza por descuido.
   *
   * ⚠️ NADA SE PERDE DE VERDADE: cada lançamento apagado deixa o registro
   * inteiro em `audit_log`, e volta por `restaurar()`.
   */
  async excluirPorPeriodo(params: {
    tenantId: string;
    contaMovimentoId?: string | null;
    dataInicial: string;
    dataFinal: string;
    /** Os marcados. `null`/ausente = o período inteiro. Ver a nota em `simular`. */
    ids?: string[] | null;
  }): Promise<RelatorioDeExclusao> {
    const { data, error } = await supabase.rpc('fin_excluir_lancamentos_por_periodo', {
      p_tenant_id: params.tenantId,
      p_conta_movimento_id: params.contaMovimentoId ?? null,
      p_data_inicial: params.dataInicial,
      p_data_final: params.dataFinal,
      p_simular: false,
      p_ids: params.ids === undefined ? null : params.ids,
    });
    if (error) throw new Error(error.message);
    return paraRelatorio(data as RetornoBrutoDeExclusao);
  },

  /**
   * A lixeira: o que foi excluído, do mais recente para o mais antigo.
   *
   * ⚠️ `desde` AUSENTE OU NULO NÃO SIGNIFICA "TUDO" — significa **os últimos 30
   * dias**, que é o padrão escrito na função do banco. Para ver a lixeira
   * inteira, passe uma data bem antiga explicitamente. É o contrário da regra
   * do `p_ids` da exclusão, e de propósito: aqui o padrão mostra MENOS, e
   * mostrar menos numa lista que alimenta um botão de apagar é o lado seguro.
   *
   * ⚠️ O BANCO LIMITA O `limite` A 1000 E O PADRÃO É 200. Quem chama precisa
   * comparar o tamanho da lista com o limite que pediu: se forem iguais, a
   * lista pode ter sido CORTADA, e uma lista cortada num ecrã de exclusão faz
   * a pessoa marcar "tudo" achando que marcou tudo.
   */
  async listarExcluidos(
    tenantId: string,
    opcoes?: { desde?: string | null; limite?: number },
  ): Promise<LancamentoExcluido[]> {
    const { data, error } = await supabase.rpc('fin_listar_exclusoes', {
      p_tenant_id: tenantId,
      p_desde: opcoes?.desde ?? null,
      p_limite: opcoes?.limite ?? 200,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LancamentoExcluido[];
  },

  /**
   * Devolve um lançamento excluído ao seu lugar.
   *
   * ⚠️ O PARÂMETRO É O `audit_id`, NÃO O ID DO LANÇAMENTO. O lançamento não
   * existe mais — o que existe é o registro da exclusão dele. Cada exclusão tem
   * o seu, e é por isso que restaurar o mesmo lançamento excluído duas vezes
   * traz a versão certa: a do evento que você escolheu.
   *
   * ⚠️ RESTAURAR UMA PERNA DE TRANSFERÊNCIA TRAZ AS DUAS (RN-23) — o retorno
   * dirá `restaurados: 2`.
   */
  async restaurar(
    tenantId: string,
    auditId: number,
  ): Promise<{ restaurados: number; jaExistia: number; eraTransferencia: boolean }> {
    const { data, error } = await supabase.rpc('fin_restaurar_lancamento', {
      p_tenant_id: tenantId,
      p_audit_id: auditId,
    });
    if (error) throw new Error(error.message);
    const r = data as { restaurados: number; ja_existia: number; era_transferencia: boolean };
    return {
      restaurados: r.restaurados,
      jaExistia: r.ja_existia,
      eraTransferencia: r.era_transferencia,
    };
  },

  /**
   * Apaga a lixeira — **de vez**.
   *
   * ⚠️ ESTE É O ÚNICO PONTO DO MÓDULO ONDE INFORMAÇÃO SOME PARA SEMPRE. Todas
   * as outras operações apagam DADO, e o dado apagado deixa rastro na trilha de
   * auditoria (é dele que a lixeira vive). Esta apaga **o rastro**: depois dela
   * não há como restaurar o lançamento nem como saber que ele existiu.
   *
   * Por isso a tela tem de simular primeiro e mostrar `restauraveis` — quantos
   * lançamentos deixarão de poder voltar.
   *
   * `auditIds` nulo = a lixeira inteira da empresa; array = só os escolhidos.
   */
  async limparLixeira(params: {
    tenantId: string;
    auditIds?: number[] | null;
    simular: boolean;
  }): Promise<{ linhas: number; restauraveis: number; apagados: number; simulacao: boolean }> {
    const { data, error } = await supabase.rpc('fin_limpar_lixeira', {
      p_tenant_id: params.tenantId,
      // Mesma regra do `p_ids`: `[]` é "nenhum", `null` é "tudo".
      p_audit_ids: params.auditIds === undefined ? null : params.auditIds,
      p_simular: params.simular,
    });
    if (error) throw new Error(error.message);
    const r = data as { linhas: number; restauraveis: number; apagados: number; simulacao: boolean };
    return {
      linhas: r.linhas,
      restauraveis: r.restauraveis,
      apagados: r.apagados,
      simulacao: r.simulacao,
    };
  },

  /**
   * O histórico de fechamentos de período — o que vale agora e o que mudou.
   *
   * ⚠️ POR QUE ISTO NÃO SAI SÓ DA TABELA `fin_fechamentos`: ela guarda UMA
   * linha por conta (`UNIQUE (tenant_id, conta_movimento_id)`), então não tem
   * histórico nenhum. Ao excluir um fechamento, some da tela qualquer vestígio
   * de que o período esteve fechado. O que sobrevive é a auditoria.
   *
   * ⚠️ E POR QUE ELA TAMBÉM NÃO SAI SÓ DA AUDITORIA (corrigido em 18/09/2026):
   * o gatilho da plataforma cobre `UPDATE` e `DELETE`, não `INSERT` — o
   * PRIMEIRO fechamento de uma conta não deixa rastro nenhum lá. Quem fechou
   * setembro uma única vez via "nenhuma alteração registrada" e concluía que o
   * sistema não guardara nada. O banco passou a unir as duas fontes: a linha
   * viva (`em_vigor: true`) e os eventos passados (`em_vigor: false`).
   */
  async historicoDeFechamentos(
    tenantId: string,
    limite = 100,
  ): Promise<EventoDeFechamento[]> {
    const { data, error } = await supabase.rpc('fin_historico_fechamentos', {
      p_tenant_id: tenantId,
      p_limite: limite,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as EventoDeFechamento[];
  },
};
