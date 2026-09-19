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
   * (Opcional) A tela DENTRO do módulo onde o Proprietário ajusta, em detalhe,
   * o que cada integrante pode fazer ali. Ex.: `/dashboard/financeiro/dependentes`.
   *
   * ⚠️ POR QUE ISTO EXISTE, E POR QUE NÃO VIOLA A REGRA DE CIMA. Há **duas**
   * decisões diferentes sobre um integrante, e elas moram em lugares
   * diferentes de propósito:
   *
   *   1. "ele pode ABRIR este módulo?"  → é da PLATAFORMA. Vive em
   *      `tenant_members.allowed_modules`, e a tela é o Painel de Controle de
   *      Tripulação.
   *   2. "o que ele pode fazer DENTRO?" → é do MÓDULO. As permissões são do
   *      negócio de cada peça (o financeiro tem 17; outro módulo terá outras
   *      quantas), e a plataforma não pode conhecê-las sem virar refém delas.
   *
   * Em 13/09/2026 o dono do projeto foi à tela (1) procurar a resposta de (2) e
   * não achou — o que é justo, porque nada ali dizia que a segunda decisão
   * existia e ficava noutro lugar. Este campo é **o endereço da porta**, não a
   * porta: a plataforma mostra um link, sem saber o que há do outro lado.
   *
   * ⚠️ CONTINUA VALENDO A REGRA ACIMA: nunca acrescente a este tipo um campo
   * que só um módulo usa. `rotaConfiguracao` é genérico — qualquer módulo com
   * permissões internas tem uma; quem não tiver, simplesmente omite, e a
   * plataforma não desenha link nenhum.
   */
  rotaConfiguracao?: string;

  /**
   * (Opcional) Para onde o cartão do módulo leva **no aplicativo mobile**.
   * Ex.: `/financeiro`. Tem de bater com a pasta real em `apps/mobile-app/app/`.
   *
   * ⚠️ POR QUE UM CAMPO SEPARADO, E NÃO O `rotaWeb`. Os endereços são de
   * ferramentas diferentes: o site usa o App Router do Next.js (`/dashboard/x`)
   * e o aplicativo usa o Expo Router (`/x`), onde `app/(tabs)` some da URL e
   * `app/x/` não. Reaproveitar `rotaWeb` no telemóvel levaria a um endereço que
   * não existe lá — e o Expo Router responde a isso com a tela
   * "Endereço não encontrado", que a pessoa lê como aplicativo quebrado.
   *
   * ⚠️ A AUSÊNCIA TEM SIGNIFICADO, e é por isso que ele é opcional: módulo **sem**
   * tela no aplicativo simplesmente omite o campo, e o painel do telemóvel
   * desenha o cartão com o selo "EM BREVE" em vez de oferecer um caminho que não
   * abre. Deduzir a rota a partir do `id` (`'/' + id`) pareceria mais esperto e
   * tiraria justamente esta possibilidade: não haveria como um módulo dizer
   * "eu ainda não existo no telefone".
   *
   * ⚠️ CONTINUA VALENDO A REGRA DO TOPO DESTE ARQUIVO: nunca acrescente aqui um
   * campo que só um módulo usa. `rotaMobile` é genérico — qualquer módulo com
   * tela no aplicativo tem uma. É o mesmo raciocínio que autorizou o
   * `rotaConfiguracao` em 13/09/2026. `taxaDeJuros` seria a violação; isto não é.
   */
  rotaMobile?: string;

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
