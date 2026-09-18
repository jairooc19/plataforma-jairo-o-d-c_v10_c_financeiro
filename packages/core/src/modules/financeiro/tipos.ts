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
  /**
   * ⚠️ 18/09/2026 — AS QUATRO DO ORÇAMENTO E DO DINHEIRO DO PERÍODO.
   *
   * São quatro e não duas porque ver, criar e apagar orçamento são poderes de
   * tamanhos diferentes: quem monta o plano do mês não é necessariamente quem
   * pode apagá-lo.
   *
   * ⚠️ LANÇAR A PARTIR DO DINHEIRO DO PERÍODO CONTINUA EXIGINDO `lc_criar` — a
   * mesma permissão de sempre. Uma permissão separada para "lançar por aqui"
   * daria dois interruptores para o mesmo poder, e um dia eles discordariam.
   *
   * ⚠️ E O MODO "SÓ PERCENTUAL" **NÃO** É UMA PERMISSÃO, de propósito: ela
   * seria invertida (TER a permissão significaria VER MENOS), e um dia alguém
   * marcaria a caixa achando que estava dando acesso. Ele mora em
   * `ConfiguracaoDoMembro.dinheiro_percentual`.
   */
  'orc_ver', 'orc_gravar', 'orc_excluir', 'dp_ver',
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
  orc_ver: 'VER O ORÇAMENTO',
  orc_gravar: 'CRIAR E EDITAR ORÇAMENTO',
  orc_excluir: 'EXCLUIR ORÇAMENTO',
  dp_ver: 'VER O DINHEIRO DO PERÍODO',
};

/**
 * ⚠️ AS CINCO PERMISSÕES QUE **VAZAM O VALOR** APESAR DO MODO PERCENTUAL.
 *
 * O modo "só percentual" impede o valor de SAIR DO BANCO na tela do dinheiro do
 * período — mas quem tiver qualquer uma destas chega aos mesmos números por
 * outro caminho, que ele já tem hoje:
 *
 *   extrato_ver   → a conferência da conta e os dois dashboards, mês a mês
 *   lc_ver_todos  → a tela PESQUISAR, com o valor de cada lançamento
 *   imprimir      → o papel e o .TSV das telas acima
 *   orc_ver       → a própria tela de orçamento, onde o valor é o assunto
 *   cm_ver        → o saldo de abertura de cada conta movimento
 *
 * A tela de CONFIGURAÇÕES usa esta lista para AVISAR o Proprietário — dizendo
 * quais — quando ele liga o modo percentual num dependente que tem alguma
 * delas. Avisar, e não bloquear: pode haver caso legítimo em que o percentual é
 * só conforto, e decidir isso por ele seria errado.
 */
export const PERMISSOES_QUE_REVELAM_VALOR: PermissaoFinanceiro[] = [
  'extrato_ver', 'lc_ver_todos', 'imprimir', 'orc_ver', 'cm_ver',
];

/** O conjunto sugerido para um Dependente novo (especificação, seção 4.3). */
export const PERMISSOES_PADRAO_DEPENDENTE: PermissaoFinanceiro[] = [
  'cm_ver', 'ci_ver', 'lc_ver_todos', 'lc_criar',
  'lc_editar_proprios', 'extrato_ver', 'imprimir',
];

/**
 * Como as permissões ficam guardadas em `tenant_members.module_configs`.
 *
 * ⚠️ OS DOIS CAMPOS DE 18/09/2026 NÃO SÃO PERMISSÕES, e por isso não estão no
 * array: um é uma LISTA (quais contas este membro enxerga) e o outro é um MODO
 * (ele vê valores ou só percentual). Permissão é sim-ou-não; estes dois não são.
 *
 * ⚠️ NADA DISSO MUDA A PLATAFORMA: `module_configs` é um `jsonb` livre por
 * módulo, e desplugar o financeiro leva esta configuração junto.
 */
export interface ConfiguracaoDoMembro {
  ativo: boolean;
  permissoes: PermissaoFinanceiro[];
  /**
   * As contas identificadoras que este membro enxerga no DINHEIRO DO PERÍODO.
   *
   * ⚠️ AUSENTE E `[]` SÃO COISAS DIFERENTES — pela terceira vez neste módulo:
   *     ausente / undefined → "não estou escolhendo": TODAS as contas
   *     []                  → "desmarquei tudo": NENHUMA conta
   * Confundi-los faria o botão DESMARCAR TODAS liberar o orçamento inteiro, que
   * é o contrário exato do que a pessoa acabou de pedir. Travado na trava 47.
   */
  dinheiro_contas?: string[];
  /** `true` = este membro vê só o percentual, sem os valores. */
  dinheiro_percentual?: boolean;
}

/** O que o banco responde sobre o que ESTE membro pode ver no dinheiro do período. */
export interface ConfigDoDinheiro {
  eh_owner: boolean;
  /** `false` = o banco devolve os valores em NULO; só o percentual atravessa. */
  ve_valores: boolean;
  /** `null` = todas as contas. `[]` = nenhuma. */
  contas_liberadas: string[] | null;
}

// ===========================================================================
// ORÇAMENTO E DINHEIRO DO PERÍODO — 18/09/2026
// ===========================================================================

/**
 * Uma linha da conferência do orçamento, como `fin_listar_orcamento` a devolve.
 *
 * ⚠️ AS LINHAS DE TOTAL VÊM NA MESMA LISTA, marcadas por `linha_tipo` — o mesmo
 * desenho do `fin_extrato`. A tela não soma nada, e por isso o papel impresso e
 * o .TSV mostram sempre o mesmo número que o monitor.
 */
export interface LinhaDoOrcamento {
  bloco: TipoContaIdentificadora;
  linha_tipo: 'CONTA' | 'TOTAL';
  orcamento_id: string | null;
  conta_id: string | null;
  nome: string | null;
  is_active: boolean | null;
  valor_centavos: number;
  observacao: string | null;
}

/** Uma competência com orçamento, na tela PESQUISAR. `competencia` nula = a linha de total. */
export interface CompetenciaOrcada {
  competencia: string | null;
  contas: number;
  receitas_centavos: number;
  despesas_centavos: number;
  outras_centavos: number;
  total_centavos: number;
}

/**
 * Uma linha do DINHEIRO DO PERÍODO.
 *
 * ⚠️ OS TRÊS VALORES PODEM VIR NULOS, E ISSO NÃO É FALHA: no modo percentual o
 * banco NÃO OS ENVIA. Esconder na tela seria inútil — o número teria viajado
 * até o navegador e estaria legível com a tecla F12. Ver o cabeçalho de
 * `fin_dinheiro_do_periodo` no schema.
 */
export interface LinhaDoDinheiro {
  /** `FORA` = conta com movimento e SEM orçamento (o gasto que ninguém planejou). */
  bloco: 'RECEITA' | 'DESPESA' | 'RESULTADO' | 'OUTRAS' | 'FORA';
  linha_tipo: 'CONTA' | 'TOTAL';
  conta_id: string | null;
  nome: string | null;
  tipo: TipoContaIdentificadora | null;
  orcado_centavos: number | null;
  realizado_centavos: number | null;
  saldo_centavos: number | null;
  /** Sempre presente, arredondado para inteiro. `null` no bloco FORA. */
  consumo_percentual: number | null;
  estourou: boolean;
}

// ===========================================================================
// OS DOIS DASHBOARDS — 18/09/2026
// ===========================================================================
//
// ⚠️ AS LINHAS CHEGAM "LONGAS": UMA LINHA POR CONTA **E POR MÊS**. Doze linhas
// por conta, mais as linhas de TOTAL. Quem as arruma em grade de 12 colunas é
// `dashboardRegras.ts`, que tem teste — a tela só desenha o que receber.
//
// ⚠️ E AS LINHAS DE TOTAL VÊM DO BANCO, junto com as das contas, distinguidas
// por `linha_tipo`. É o mesmo desenho do `fin_extrato` (INICIAL / LANCAMENTO /
// TOTAL na mesma lista) e existe pelo mesmo motivo: a tela, o papel impresso e
// o arquivo .TSV mostram o MESMO número porque nenhum dos três soma nada.

/** Os dois blocos do dashboard das contas movimento. */
export type BlocoDoMovimento = 'CAIXA_BANCO' | 'OUTRAS';

/**
 * Os blocos do dashboard das identificadoras.
 *
 * ⚠️ A RECEITA SÃO DOIS BLOCOS DESDE 18/09/2026 (2ª rodada), separados pela
 * `propriedade` do LANÇAMENTO — não do cadastro. A consequência precisa ficar
 * dita: **a MESMA conta identificadora pode aparecer nos dois**, com valores
 * diferentes, se tiver recebido dinheiro próprio num mês e de terceiros noutro.
 * Isso não é duplicidade: é a informação que o pedido quer.
 *
 * `RESULTADO` não é um tipo de conta: é a linha "receitas PRÓPRIAS menos
 * despesas" que o banco devolve pronta. Ela ignora as receitas de TERCEIROS e o
 * bloco `OUTRAS` de propósito — dinheiro de terceiros entra no saldo (está na
 * conta) mas não é receita do negócio, e somá-lo daria um número que se parece
 * com lucro e não é.
 */
export type BlocoDaIdentificadora =
  | 'RECEITA_PROPRIO'
  | 'RECEITA_TERCEIROS'
  | 'DESPESA'
  | 'RESULTADO'
  | 'OUTRAS';

/**
 * Uma célula do DASHBOARD 1, como `fin_saldos_mensais_movimento` a devolve.
 *
 * ⚠️ `saldo_centavos` É ACUMULADO: o valor no ÚLTIMO DIA do mês, carregando
 * tudo o que veio antes. Março já contém janeiro e fevereiro dentro dele. Mês
 * sem lançamento repete o saldo do mês anterior.
 */
export interface LinhaSaldoMensal {
  bloco: BlocoDoMovimento;
  linha_tipo: 'CONTA' | 'TOTAL';
  conta_id: string | null;
  nome: string | null;
  tipo: TipoContaMovimento | null;
  /** `false` = conta desativada que continua no relatório porque tem dinheiro. */
  is_active: boolean | null;
  mes: number;
  saldo_centavos: number;
  entradas_centavos: number;
  saidas_centavos: number;
  /** O mês inteiro já está trancado para esta conta (RN-24). */
  fechado: boolean;
}

/**
 * Uma célula do DASHBOARD 2, como `fin_movimentos_mensais_identificadora` a
 * devolve.
 *
 * ⚠️ `liquido_centavos` NÃO É ACUMULADO — é o mês sozinho. Conta identificadora
 * não guarda dinheiro, explica dinheiro: não existe "saldo de energia elétrica".
 * E o sinal segue a natureza do tipo: numa DESPESA o valor sai POSITIVO
 * (`saídas − entradas`), de modo que um reembolso REDUZ a despesa do mês.
 */
export interface LinhaMovimentoMensal {
  bloco: BlocoDaIdentificadora;
  linha_tipo: 'CONTA' | 'TOTAL';
  conta_id: string | null;
  nome: string | null;
  tipo: TipoContaIdentificadora | null;
  /** De quem é o dinheiro daquela linha. Nulo nas linhas de total. */
  propriedade: Propriedade | null;
  is_active: boolean | null;
  /** `true` na categoria "TRANSFERÊNCIA ENTRE CONTAS" (RN-30). */
  is_sistema: boolean | null;
  mes: number;
  entradas_centavos: number;
  saidas_centavos: number;
  liquido_centavos: number;
}

/**
 * Uma linha da CONFERÊNCIA DA CONTA IDENTIFICADORA.
 *
 * ⚠️ A COLUNA SE CHAMA `acumulado_centavos`, E NÃO "saldo". Ela começa em ZERO
 * na primeira linha do período e fecha igual ao total — a identificadora não
 * tem saldo de abertura, então não existe linha de "SALDO INICIAL" aqui. Chamar
 * de saldo ensinaria a coisa errada, e um dia alguém levaria esse número para
 * um balanço.
 */
export interface LinhaDoExtratoIdentificadora {
  linha_tipo: 'LANCAMENTO' | 'TOTAL';
  lancamento_id: string | null;
  data_movimento: string;
  ordem_extrato: number | null;
  /** O espelho do extrato comum: aqui aparece ONDE o dinheiro andou. */
  conta_movimento: string;
  entrada_centavos: number | null;
  saida_centavos: number | null;
  acumulado_centavos: number;
  historico: string | null;
  conferido: boolean | null;
  usuario: string | null;
}

/** Uma linha do extrato de VÁRIAS contas somadas (o clique na linha de TOTAL). */
export interface LinhaDoExtratoConsolidado {
  linha_tipo: 'INICIAL' | 'LANCAMENTO' | 'TOTAL';
  lancamento_id: string | null;
  data_movimento: string;
  ordem_extrato: number | null;
  conta_movimento: string;
  identificadora: string;
  entrada_centavos: number | null;
  saida_centavos: number | null;
  saldo_centavos: number;
  historico: string | null;
  conferido: boolean | null;
  usuario: string | null;
}
