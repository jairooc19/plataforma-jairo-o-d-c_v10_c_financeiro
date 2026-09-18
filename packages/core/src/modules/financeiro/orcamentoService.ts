/**
 * 🎯 ORÇAMENTO E DINHEIRO DO PERÍODO (PJODC v10)
 * Local: packages/core/src/modules/financeiro/orcamentoService.ts
 *
 * ⚠️ NENHUM NÚMERO É CALCULADO AQUI. Este arquivo traduz sete chamadas para as
 * sete funções do banco. O orçado, o realizado, o consumo, os totais e a linha
 * de RESULTADO vêm prontos — inclusive na ordem RECEITA → DESPESA → OUTRAS.
 *
 * ===========================================================================
 * ⚠️ O MODO "SÓ PERCENTUAL" É DECIDIDO NO BANCO, E NÃO AQUI
 * ===========================================================================
 * Quando o membro está no modo percentual, `fin_dinheiro_do_periodo` devolve
 * `orcado_centavos`, `realizado_centavos` e `saldo_centavos` em NULO. Nada neste
 * arquivo filtra coisa alguma — e é esse o ponto.
 *
 * O caminho óbvio seria o banco devolver tudo e a TELA (ou este serviço)
 * esconder. Isso não esconderia nada: os valores atravessariam a internet e
 * ficariam legíveis no navegador com a tecla F12, na aba de rede, em texto
 * puro. É o mesmo erro do `sessionStorage.dev_vip_access` que este projeto já
 * documentou. **Esconder numa tela é conforto; não enviar é segurança.**
 *
 * 📖 Estudo: `_estudos/estudo-2026-09-18c-orcamento-e-dinheiro-do-periodo.html`.
 */

import { supabase } from '../../lib/supabase';
import type {
  CompetenciaOrcada,
  ConfigDoDinheiro,
  LinhaDoDinheiro,
  LinhaDoOrcamento,
} from './tipos';

export const orcamentoService = {
  /**
   * Cria ou altera um orçamento.
   *
   * ⚠️ A COMPETÊNCIA TEM DE SER O PRIMEIRO DIA DO MÊS. Quem monta a string é
   * `competenciaDe()` / `competenciaDoMes()`, no Core; o banco recusa o resto
   * com `22023`, e a tabela tem um `CHECK` por baixo disso. Duas travas para a
   * mesma coisa porque uma competência gravada em outro dia criaria DUAS
   * "SETEMBRO / 2026" no banco — e a tela mostraria o mesmo mês duas vezes, com
   * valores diferentes, sem ninguém entender por quê.
   *
   * ⚠️ REPETIR CONTA + COMPETÊNCIA DEVOLVE `23505` COM MENSAGEM EM PORTUGUÊS.
   * A tela pergunta antes ("substituir?"), mas uma chamada por fora dela também
   * precisa de resposta legível.
   */
  async gravar(tenantId: string, dados: {
    id?: string | null;
    competencia: string;
    contaIdentificadoraId: string;
    valorCentavos: number;
    observacao?: string | null;
  }): Promise<{ id: string; conta: string }> {
    const { data, error } = await supabase.rpc('fin_gravar_orcamento', {
      p_tenant_id: tenantId,
      p_id: dados.id ?? null,
      p_competencia: dados.competencia,
      p_conta_identificadora_id: dados.contaIdentificadoraId,
      p_valor_centavos: dados.valorCentavos,
      p_observacao: dados.observacao ?? null,
    });
    if (error) throw new Error(error.message);
    const r = data as { id: string; conta: string };
    return { id: r.id, conta: r.conta };
  },

  /** Apaga um orçamento. O rastro fica na auditoria, pelo gatilho da tabela. */
  async excluir(tenantId: string, id: string): Promise<{ apagados: number }> {
    const { data, error } = await supabase.rpc('fin_excluir_orcamento', {
      p_tenant_id: tenantId,
      p_id: id,
    });
    if (error) throw new Error(error.message);
    return { apagados: (data as { apagados: number }).apagados };
  },

  /** A conferência dos registros de uma competência, com os totais por tipo. */
  async listar(tenantId: string, competencia: string): Promise<LinhaDoOrcamento[]> {
    const { data, error } = await supabase.rpc('fin_listar_orcamento', {
      p_tenant_id: tenantId,
      p_competencia: competencia,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaDoOrcamento[];
  },

  /**
   * As competências que têm orçamento, para a tela PESQUISAR.
   *
   * ⚠️ COM `contaIdentificadoraId` PREENCHIDO, OS TOTAIS PASSAM A SER DAQUELA
   * CONTA — e a tela avisa. Sem o aviso, "SETEMBRO / 2026 · 1 conta · 400,00"
   * seria lido como "o orçamento de setembro é de 400,00".
   *
   * A última linha vem com `competencia` nula: é o total do período pesquisado.
   */
  async competencias(tenantId: string, params: {
    de: string;
    ate: string;
    contaIdentificadoraId?: string | null;
  }): Promise<CompetenciaOrcada[]> {
    const { data, error } = await supabase.rpc('fin_competencias_orcadas', {
      p_tenant_id: tenantId,
      p_de: params.de,
      p_ate: params.ate,
      p_conta_identificadora_id: params.contaIdentificadoraId ?? null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as CompetenciaOrcada[];
  },

  /**
   * Copia o orçamento de uma competência para outra.
   *
   * ⚠️ `substituir` É `false` POR PADRÃO, e isso é regra deste projeto: o padrão
   * de um parâmetro que decide se algo é SOBRESCRITO tem de ser o comportamento
   * inofensivo. Esquecer o argumento não pode apagar o valor que alguém já
   * ajustou à mão no mês de destino.
   */
  async copiar(tenantId: string, params: {
    origem: string;
    destino: string;
    substituir?: boolean;
  }): Promise<{ naOrigem: number; noDestino: number; substituiu: boolean }> {
    const { data, error } = await supabase.rpc('fin_copiar_orcamento', {
      p_tenant_id: tenantId,
      p_origem: params.origem,
      p_destino: params.destino,
      p_substituir: params.substituir === true,
    });
    if (error) throw new Error(error.message);
    const r = data as { na_origem: number; no_destino: number; substituiu: boolean };
    return { naOrigem: r.na_origem, noDestino: r.no_destino, substituiu: r.substituiu };
  },

  /**
   * O orçado contra o realizado de uma competência.
   *
   * Já vem filtrado pelas contas liberadas a este membro e já no modo dele —
   * as duas decisões acontecem dentro do banco, não aqui.
   */
  async dinheiroDoPeriodo(tenantId: string, competencia: string): Promise<LinhaDoDinheiro[]> {
    const { data, error } = await supabase.rpc('fin_dinheiro_do_periodo', {
      p_tenant_id: tenantId,
      p_competencia: competencia,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as LinhaDoDinheiro[];
  },

  /**
   * O que ESTE membro pode ver: valores ou só percentual, todas as contas ou
   * algumas.
   *
   * ⚠️ A TELA USA ISTO SÓ PARA SE DESENHAR — para escrever "VOCÊ VÊ SOMENTE O
   * PERCENTUAL" e para saber se mostra as colunas de dinheiro. Ela não usa para
   * FILTRAR: o recorte já veio pronto na resposta da consulta.
   */
  async configDoDinheiro(tenantId: string): Promise<ConfigDoDinheiro> {
    const { data, error } = await supabase.rpc('fin_config_dinheiro', {
      p_tenant_id: tenantId,
    });
    if (error) throw new Error(error.message);
    return data as ConfigDoDinheiro;
  },
};
