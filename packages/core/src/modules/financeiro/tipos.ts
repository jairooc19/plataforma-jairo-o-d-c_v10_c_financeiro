/**
 * 🧬 FORMAS DOS DADOS DO MÓDULO FINANCEIRO (PJODC v10)
 * Local: packages/core/src/modules/financeiro/tipos.ts
 *
 * Só declarações de tipo — nenhuma lógica, nenhum import de runtime.
 *
 * ⚠️ TODO VALOR MONETÁRIO AQUI É `centavos: number` — inteiro, nunca decimal.
 * A conversão para "R$ 1.234,56" acontece na tela, com `lib/dinheiro.ts`. O
 * motivo está no `CLAUDE.md`: `0.1 + 0.2` não dá `0.3` em ponto flutuante, e
 * num extrato de 300 linhas o erro aparece no saldo.
 *
 * ⚠️ DATAS SÃO `string` no formato `AAAA-MM-DD` — data de calendário, não
 * instante. É o que a coluna `date` do banco devolve, e evita que um
 * lançamento de 01/09 vire 31/08 conforme o fuso de quem lê.
 */

/** As três naturezas de uma conta movimento (onde o dinheiro está). */
export type TipoContaMovimento = 'CAIXA' | 'BANCO' | 'OUTRAS';

/** As três naturezas de uma conta identificadora (por que o dinheiro se moveu). */
export type TipoContaIdentificadora = 'DESPESA' | 'RECEITA' | 'OUTRAS';

/** É o tipo do movimento que dá o sinal ao valor — por isso o valor é sempre positivo. */
export type TipoMovimento = 'ENTRADA' | 'SAIDA';

/** De quem é o dinheiro. Terceiros entra no saldo (está na conta), mas não é patrimônio. */
export type Propriedade = 'PROPRIO' | 'TERCEIROS';

/** Classificação gravada. O extrato considera apenas `CAIXA` (RN-19). */
export type Regime = 'CAIXA' | 'COMPETENCIA';

/** Onde o dinheiro está. */
export interface ContaMovimento {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: TipoContaMovimento;
  saldo_abertura_centavos: number;
  is_active: boolean;
  created_at?: string;
}

/** Por que o dinheiro se moveu. */
export interface ContaIdentificadora {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: TipoContaIdentificadora;
  is_active: boolean;
  /** `true` na categoria "TRANSFERÊNCIA ENTRE CONTAS": não se edita nem se apaga (RN-30). */
  is_sistema: boolean;
  created_at?: string;
}

/** Um movimento de dinheiro. */
export interface Lancamento {
  id: string;
  tenant_id: string;
  conta_movimento_id: string;
  conta_identificadora_id: string;
  /** A "fotografia" do tipo no dia do lançamento (RN-10). */
  tipo_conta_movimento: TipoContaMovimento;
  tipo_conta_identificadora: TipoContaIdentificadora;
  data_movimento: string;
  ordem_extrato: number | null;
  tipo_movimento: TipoMovimento;
  propriedade: Propriedade;
  regime: Regime;
  valor_centavos: number;
  historico: string | null;
  conferido: boolean;
  /** Preenchido nas duas pernas de uma transferência; `null` nos demais. */
  transferencia_id: string | null;
  criado_por: string;
  created_at?: string;
  /**
   * Carimbo do gatilho `set_updated_at_fin_lanc`.
   *
   * ⚠️ NÃO significa "foi editado". Marcar como CONFERIDO também é um
   * UPDATE na linha, e o gatilho carimba igual. Quem mostrar este campo tem de
   * chamá-lo de ÚLTIMA ALTERAÇÃO, nunca de "editado em".
   */
  updated_at?: string;
}

/** O que se manda ao banco para criar ou editar um lançamento. */
export interface DadosDoLancamento {
  id?: string | null;
  conta_movimento_id: string;
  conta_identificadora_id: string;
  data_movimento: string;
  ordem_extrato?: number | null;
  tipo_movimento: TipoMovimento;
  propriedade: Propriedade;
  regime: Regime;
  valor_centavos: number;
  historico?: string | null;
}

/**
 * Uma linha do extrato, como a função `fin_extrato` a devolve.
 *
 * São três tipos de linha na mesma lista: o saldo inicial (com a data de um dia
 * antes do período), os lançamentos, e a linha de totais.
 */
export interface LinhaDoExtrato {
  linha_tipo: 'INICIAL' | 'LANCAMENTO' | 'TOTAL';
  lancamento_id: string | null;
  data_movimento: string;
  ordem_extrato: number | null;
  identificadora: string;
  entrada_centavos: number | null;
  saida_centavos: number | null;
  saldo_centavos: number;
  historico: string | null;
  conferido: boolean | null;
  /**
   * O e-mail de quem lançou (13/09/2026).
   *
   * ⚠️ É `null` nas linhas de SALDO INICIAL e de TOTAIS — elas não têm autor,
   * são somas. E pode ser `null` também numa linha de lançamento cujo autor
   * tenha sido apagado da plataforma: o extrato continua mostrando o dinheiro,
   * porque o fato aconteceu.
   */
  usuario: string | null;
}

/** Uma linha de fechamento: até quando aquela conta está trancada (RN-24). */
export interface FechamentoDaConta {
  id: string;
  tenant_id: string;
  conta_movimento_id: string;
  fechado_ate: string;
  observacao: string | null;
}

/**
 * As 18 permissões do módulo (especificação, seção 4.3; a 18ª, `lc_excluir_lote`,
 * entrou em 17/09/2026 com a exclusão em lote).
 *
 * ⚠️ ESTA LISTA É A FONTE ÚNICA. A tela de permissões do Dependente a desenha,
 * e as funções do banco conferem a mesma chave — uma diferença de grafia entre
 * as duas pontas produziria um botão que liga uma permissão que ninguém checa.
 */
export const PERMISSOES_FINANCEIRO = [
  'cm_ver', 'cm_gravar', 'cm_excluir',
  'ci_ver', 'ci_gravar', 'ci_excluir',
  'lc_ver_todos', 'lc_criar', 'lc_editar_proprios', 'lc_editar_todos',
  'lc_excluir_proprios', 'lc_excluir_todos',
  /**
   * ⚠️ 17/09/2026 — `lc_excluir_lote` NÃO É REDUNDANTE COM `lc_excluir_todos`,
   * e separá-las foi decisão consciente.
   *
   * "Pode apagar UM lançamento que não é seu" e "pode apagar UM ANO INTEIRO"
   * são poderes de tamanhos diferentes. Com uma permissão só, dar a primeira a
   * um auxiliar daria a segunda de brinde.
   *
   * Ela governa três funções do banco: a exclusão em lote, a listagem da
   * lixeira e a restauração — porque quem pode desfazer em massa precisa do
   * mesmo grau de confiança de quem pode fazer.
   *
   * O Proprietário tem tudo por ser OWNER; quem trata isso é a `fin_pode()`.
   */
  'lc_excluir_lote',
  'transferencia', 'extrato_ver', 'conciliar', 'imprimir', 'fechar_periodo',
] as const;

export type PermissaoFinanceiro = (typeof PERMISSOES_FINANCEIRO)[number];

/** O rótulo de cada permissão na tela, em maiúsculas como o módulo pede. */
export const ROTULO_DA_PERMISSAO: Record<PermissaoFinanceiro, string> = {
  cm_ver: 'VER CONTAS MOVIMENTO',
  cm_gravar: 'CRIAR E EDITAR CONTAS MOVIMENTO',
  cm_excluir: 'EXCLUIR OU DESATIVAR CONTAS MOVIMENTO',
  ci_ver: 'VER CONTAS IDENTIFICADORAS',
  ci_gravar: 'CRIAR E EDITAR CONTAS IDENTIFICADORAS',
  ci_excluir: 'EXCLUIR OU DESATIVAR CONTAS IDENTIFICADORAS',
  lc_ver_todos: 'VER TODOS OS LANÇAMENTOS DA EMPRESA',
  lc_criar: 'CRIAR LANÇAMENTO',
  lc_editar_proprios: 'EDITAR OS PRÓPRIOS LANÇAMENTOS',
  lc_editar_todos: 'EDITAR LANÇAMENTOS DE QUALQUER PESSOA',
  lc_excluir_proprios: 'EXCLUIR OS PRÓPRIOS LANÇAMENTOS',
  lc_excluir_todos: 'EXCLUIR LANÇAMENTOS DE QUALQUER PESSOA',
  lc_excluir_lote: 'EXCLUIR LANÇAMENTOS EM LOTE E RESTAURAR DA LIXEIRA',
  transferencia: 'REGISTRAR TRANSFERÊNCIA ENTRE CONTAS',
  extrato_ver: 'VER A CONFERÊNCIA DA CONTA (SALDOS)',
  conciliar: 'MARCAR LANÇAMENTOS COMO CONFERIDOS',
  imprimir: 'IMPRIMIR E EXPORTAR',
  fechar_periodo: 'FECHAR E REABRIR PERÍODO',
};

/** O conjunto sugerido para um Dependente novo (especificação, seção 4.3). */
export const PERMISSOES_PADRAO_DEPENDENTE: PermissaoFinanceiro[] = [
  'cm_ver', 'ci_ver', 'lc_ver_todos', 'lc_criar',
  'lc_editar_proprios', 'extrato_ver', 'imprimir',
];

/** Como as permissões ficam guardadas em `tenant_members.module_configs`. */
export interface ConfiguracaoDoMembro {
  ativo: boolean;
  permissoes: PermissaoFinanceiro[];
}
