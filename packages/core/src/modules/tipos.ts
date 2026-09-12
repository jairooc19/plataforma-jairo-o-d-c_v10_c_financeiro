/**
 * 🧩 O CONTRATO DE UM MÓDULO — O FORMATO DO PINO DO LEGO (PJODC v10)
 * Local: packages/core/src/modules/tipos.ts
 *
 * ===========================================================================
 * O QUE ESTE ARQUIVO É
 * ===========================================================================
 * É a única coisa que a PLATAFORMA sabe sobre um módulo: o formato do cartão
 * de visita dele. Nenhum nome de módulo aparece aqui — nem aqui, nem em
 * qualquer outro arquivo da plataforma, exceto os pontos de solda listados no
 * `MODULOS.md`.
 *
 * ⚠️ NUNCA ACRESCENTE A ESTE TIPO UM CAMPO QUE SÓ UM MÓDULO USA. No dia em que
 * `ManifestoDeModulo` ganhar `taxaDeJuros?: number`, a plataforma terá passado
 * a conhecer o negócio de uma das peças — e a próxima peça vai carregar um
 * campo que não faz sentido para ela. Campo específico mora dentro do módulo.
 *
 * 📖 Ver `_estudos/degrau-04-arquitetura-modular.html`, seção 8.
 */

/** O cartão de visita que cada módulo entrega à plataforma. */
export interface ManifestoDeModulo {
  /**
   * O identificador do módulo. É o MESMO texto em quatro lugares: a coluna
   * `allowed_modules`, a linha do catálogo `platform_modules`, o nome das
   * pastas e o prefixo das tabelas.
   *
   * ⚠️ O banco valida o formato (`^[a-z][a-z0-9_]{2,29}$`): minúsculas, sem
   * acento e sem espaço, porque este texto vira nome de pasta e pedaço de URL.
   */
  id: string;

  /** O nome que a pessoa lê na tela. Ex.: "Controle Financeiro". */
  nome: string;

  /** Uma linha explicando o que o módulo faz, mostrada no cartão do menu. */
  descricao: string;

  /**
   * Para onde o cartão do menu leva, no admin-web. Ex.: `/dashboard/financeiro`.
   * Tem de bater com a pasta real em `apps/admin-web/src/app/`.
   */
  rotaWeb: string;

  /**
   * O prefixo de TODAS as tabelas e funções do módulo no banco. Ex.: `fin_`.
   * É o que permite ao reset do módulo derrubar só o que é dele.
   */
  prefixoBanco: string;

  /** Versão do próprio módulo (semver). */
  versao: string;

  /**
   * A versão mínima da plataforma que este módulo exige. Ex.: `'v10'`.
   *
   * Hoje parece inútil — só existe uma plataforma. Vale na primeira vez em que
   * alguém abrir um módulo guardado há seis meses e precisar saber se ele roda
   * na base atual: a resposta fica escrita no módulo, não na memória de
   * ninguém.
   */
  exigePlataforma: string;
}
