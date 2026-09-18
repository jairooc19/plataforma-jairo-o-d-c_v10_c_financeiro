/**
 * 🧠 AS DECISÕES DOS DOIS DASHBOARDS — FORA DA TELA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/dashboardRegras.ts
 *
 * ===========================================================================
 * POR QUE ESTE ARQUIVO EXISTE
 * ===========================================================================
 * O banco devolve as linhas "longas": uma por conta E por mês. A tela precisa
 * de uma grade: uma linha por conta, doze colunas. Essa arrumação parece
 * trabalho de desenho, mas ela toma DECISÕES — e decisão dentro de componente
 * `.tsx` não tem como ser testada por `npm test`, porque o `node --test` não lê
 * JSX (medido em 17/09/2026). O que decide mora aqui; o que desenha fica lá.
 *
 * ===========================================================================
 * ⚠️ A DECISÃO MAIS IMPORTANTE DESTE ARQUIVO: QUANDO **NÃO** SOMAR O ANO
 * ===========================================================================
 * O dashboard 2 tem coluna "TOTAL DO ANO"; o dashboard 1 NÃO tem, e isso não é
 * esquecimento.
 *
 *   • O dashboard 2 mostra FLUXO (quanto passou no mês). Somar doze fluxos dá
 *     "quanto gastei de energia no ano" — um número que existe de verdade.
 *   • O dashboard 1 mostra SALDO (quanto havia no último dia). Somar doze
 *     saldos daria a soma de doze fotografias do MESMO dinheiro — como somar o
 *     peso de uma pessoa medido em doze meses e dizer que ela pesa 280 kg.
 *
 * Por isso `totalDoAnoCentavos` vem `null` na grade de saldos, e a tela não
 * desenha a coluna. A regra geral, que vale para a vida: **valor acumulado não
 * se soma entre períodos; valor de fluxo se soma.**
 */

/**
 * ⚠️ ESTE ARQUIVO NÃO IMPORTA NADA EM TEMPO DE EXECUÇÃO, E ISSO É PROPOSITAL.
 *
 * O `npm test` roda `node --test`, cujo carregador de módulos NÃO resolve
 * import sem extensão: `from '../../lib/datas'` estoura com ERR_MODULE_NOT_FOUND
 * (medido em 18/09/2026). Escrever `'../../lib/datas.ts'` resolveria no Node e
 * QUEBRARIA O BUILD: o `tsconfig.json` do admin-web não liga
 * `allowImportingTsExtensions`, e o `next build` recusaria com TS5097.
 *
 * Por isso os rótulos dos meses CHEGAM DE FORA, por parâmetro. Eles continuam
 * tendo uma casa só — `MESES_CURTOS`, em `lib/datas.ts`, com teste lá — e quem
 * os entrega é a tela. É o mesmo motivo pelo qual `importacao.ts` não importa
 * nada: neste projeto, arquivo com teste é arquivo sem dependência.
 */

import type {
  BlocoDaIdentificadora,
  BlocoDoMovimento,
  LinhaMovimentoMensal,
  LinhaSaldoMensal,
} from './tipos';

/** Uma célula da grade: um mês de uma linha. */
export interface CelulaDoDashboard {
  /**
   * 1 a 12.
   *
   * ⚠️ A CÉLULA NÃO CARREGA O RÓTULO DO MÊS ("JAN"). Quem o escreve é a tela,
   * lendo `MESES_CURTOS[mes - 1]` do Core — ver o aviso no topo do arquivo.
   */
  mes: number;
  valorCentavos: number;
  entradasCentavos: number;
  saidasCentavos: number;
  /** Só o dashboard 1 usa: o mês inteiro já está trancado (RN-24). */
  fechado: boolean;
  /**
   * Houve ALGUM lançamento naquele mês **nesta linha** (esta conta).
   *
   * ⚠️ ELE É DERIVADO DE `entradas + saidas > 0`, e isso é exato: a RN-15 não
   * deixa gravar lançamento de valor zero, então movimento nenhum é a única
   * forma de os dois darem zero. Um mês em que entrou 100 e saiu 100 tem
   * líquido zero mas `temLancamento = true` — e é isso que se quer dizer.
   *
   * ⚠️ ELE **NÃO** É O QUE DECIDE SE A CÉLULA APARECE. Quem decide é o
   * `mesTeveLancamento` abaixo. Este aqui serve à dica do mouse, para a pessoa
   * saber que a conta ficou parada num mês em que as outras se mexeram.
   */
  temLancamento: boolean;
  /**
   * Houve algum lançamento naquele mês em **QUALQUER conta do dashboard**.
   *
   * ===========================================================================
   * ⚠️ É A COLUNA QUE DECIDE, E NÃO A LINHA — 18/09/2026 (3ª rodada)
   * ===========================================================================
   * A primeira versão deste ajuste escondia a célula CONTA A CONTA, e isso
   * criava um problema real: num mês em que só o CAIXA se mexeu, o BANCO ficava
   * em branco — mas o dinheiro dele continuava dentro da linha de TOTAL. **A
   * soma das células visíveis deixava de bater com o total**, e a pessoa tinha
   * de acreditar num número que a tela não mostrava como se formava.
   *
   * O pedido do dono do projeto conserta exatamente isso: *"se em um determinado
   * mês existir um ou mais lançamentos em QUALQUER das contas movimento,
   * apresentar os saldos finais para TODAS as contas individualmente, mesmo se
   * a conta neste mês não existir lançamento"*.
   *
   * Com a decisão na COLUNA, os dois casos voltam a fechar:
   *   • mês com movimento → todas as contas mostram o saldo, e a soma bate;
   *   • mês sem movimento nenhum → a coluna inteira mostra 0,00, e 0+0+0 = 0.
   */
  mesTeveLancamento: boolean;
  /**
   * O mês ainda não terminou, ou nem começou.
   *
   * ⚠️ ELE EXISTE PORQUE O SISTEMA ACEITA LANÇAMENTO COM DATA À FRENTE (o
   * formulário só avisa acima de 90 dias). Um saldo em novembro, visto em
   * setembro, é uma PREVISÃO — não um fato. Sem marcação, os dois se parecem.
   */
  futuro: boolean;
}

/** Uma linha da grade: uma conta, ou o total de um bloco. */
export interface LinhaDaGrade {
  /** Identidade estável para a `key` do React e para o clique. */
  chave: string;
  /** `null` nas linhas de total — elas não abrem conferência de uma conta só. */
  contaId: string | null;
  nome: string;
  tipo: string | null;
  inativa: boolean;
  ehSistema: boolean;
  ehTotal: boolean;
  celulas: CelulaDoDashboard[];
  /** `null` quando somar os doze meses não significaria nada (ver o topo). */
  totalDoAnoCentavos: number | null;
}

/** Um bloco da grade: a tabela "CAIXA E BANCO", "RECEITAS", etc. */
export interface BlocoDaGrade {
  chave: string;
  rotulo: string;
  linhas: LinhaDaGrade[];
}

const ROTULO_DO_BLOCO: Record<string, string> = {
  CAIXA_BANCO: 'CAIXA E BANCO',
  OUTRAS: 'OUTRAS',
  RECEITA_PROPRIO: 'RECEITAS PRÓPRIAS',
  RECEITA_TERCEIROS: 'RECEITAS DE TERCEIROS',
  DESPESA: 'DESPESAS',
  RESULTADO: 'RESULTADO DO MÊS',
};

const ROTULO_DO_TOTAL: Record<string, string> = {
  CAIXA_BANCO: 'TOTAL CAIXA E BANCO',
  OUTRAS: 'TOTAL OUTRAS',
  RECEITA_PROPRIO: 'TOTAL RECEITAS PRÓPRIAS',
  RECEITA_TERCEIROS: 'TOTAL RECEITAS DE TERCEIROS',
  DESPESA: 'TOTAL DESPESAS',
  RESULTADO: 'RESULTADO (RECEITAS PRÓPRIAS − DESPESAS)',
};

/** O nome do bloco como ele aparece no cabeçalho da tabela. */
export function rotuloDoBloco(bloco: string): string {
  return ROTULO_DO_BLOCO[bloco] ?? bloco;
}

/**
 * O mês (1 a 12) daquele ano ainda não terminou?
 *
 * ⚠️ A COMPARAÇÃO É POR ANO E MÊS, NUNCA POR DIA. Em 18/09/2026, setembro NÃO
 * é futuro — ele está em curso, e o saldo dele já é parcialmente fato. Marcar o
 * mês corrente como previsão assustaria sem motivo.
 */
export function ehMesFuturo(ano: number, mes: number, hojeISO: string): boolean {
  const [anoHoje, mesHoje] = hojeISO.split('-').map(Number);
  return ano > anoHoje || (ano === anoHoje && mes > mesHoje);
}

/** Doze células vazias — a base sobre a qual as do banco são encaixadas. */
function celulasVazias(ano: number, hoje: string): CelulaDoDashboard[] {
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    valorCentavos: 0,
    entradasCentavos: 0,
    saidasCentavos: 0,
    fechado: false,
    temLancamento: false,
    mesTeveLancamento: false,
    futuro: ehMesFuturo(ano, i + 1, hoje),
  }));
}

/**
 * ⚠️ A GRADE SEMPRE TEM DOZE COLUNAS, mesmo que o banco devolva menos linhas.
 *
 * Não é paranoia: se um dia a função do banco deixar de gerar um mês, a tela
 * mostraria ONZE colunas e a pessoa contaria os meses errados sem perceber que
 * faltou um. Com a base de doze, o mês que não vier fica em zero — visível.
 */
function encaixar(
  destino: CelulaDoDashboard[],
  mes: number,
  dados: Partial<CelulaDoDashboard>,
): void {
  if (mes < 1 || mes > 12) return;
  destino[mes - 1] = { ...destino[mes - 1], ...dados };
}

interface Contexto {
  ano: number;
  hoje: string;
}

/**
 * DASHBOARD 1 — a grade dos saldos por conta movimento.
 *
 * Dois blocos, na ordem: CAIXA E BANCO (com o total dos dois juntos, como o
 * dono do projeto pediu) e OUTRAS.
 */
export function montarGradeDeSaldos(
  linhas: LinhaSaldoMensal[],
  ctx: Contexto,
): BlocoDaGrade[] {
  const ordem: BlocoDoMovimento[] = ['CAIXA_BANCO', 'OUTRAS'];
  const blocos = ordem
    .map((bloco) => montarBloco(
      bloco,
      linhas.filter((l) => l.bloco === bloco),
      ctx,
      (l) => ({
        contaId: l.conta_id,
        nome: l.nome,
        tipo: l.tipo,
        inativa: l.is_active === false,
        ehSistema: false,
        valor: l.saldo_centavos,
        entradas: l.entradas_centavos,
        saidas: l.saidas_centavos,
        fechado: l.fechado,
      }),
      // ⚠️ SALDO NÃO SE SOMA ENTRE MESES — ver a explicação no topo do arquivo.
      false,
    ))
    .filter((b) => b.linhas.length > 0);

  return marcarMesesComMovimento(blocos);
}

/**
 * Descobre em quais meses houve movimento em QUALQUER conta e carimba a
 * resposta em todas as células daquele mês — inclusive nas contas paradas e nas
 * linhas de total.
 *
 * ⚠️ ELE OLHA AS LINHAS DE CONTA, E NÃO AS DE TOTAL. As de total também
 * carregam entradas e saídas somadas, e dariam a mesma resposta — mas só
 * existem se o banco as devolver. Percorrer as contas responde sozinho.
 *
 * ⚠️ E ELE OLHA OS DOIS BLOCOS JUNTOS. Um mês em que só uma conta de tipo
 * OUTRAS se mexeu é um mês COM movimento, e o bloco CAIXA E BANCO tem de
 * mostrar os saldos dele — senão as duas tabelas da mesma tela contariam
 * histórias diferentes sobre o mesmo mês.
 */
function marcarMesesComMovimento(blocos: BlocoDaGrade[]): BlocoDaGrade[] {
  const comMovimento = new Set<number>();
  for (const bloco of blocos) {
    for (const linha of bloco.linhas) {
      if (linha.ehTotal) continue;
      for (const c of linha.celulas) if (c.temLancamento) comMovimento.add(c.mes);
    }
  }

  for (const bloco of blocos) {
    for (const linha of bloco.linhas) {
      for (const c of linha.celulas) c.mesTeveLancamento = comMovimento.has(c.mes);
    }
  }

  return blocos;
}

/**
 * DASHBOARD 2 — a grade dos movimentos por conta identificadora.
 *
 * Cinco blocos, na ordem pedida: RECEITAS PRÓPRIAS (com total), RECEITAS DE
 * TERCEIROS (com total), DESPESAS (com total), RESULTADO e OUTRAS (com total).
 *
 * ⚠️ A MESMA CONTA PODE APARECER NOS DOIS BLOCOS DE RECEITA — a divisão é por
 * `propriedade` do LANÇAMENTO, não do cadastro. Por isso a chave da linha
 * inclui o bloco: sem isso, as duas linhas da mesma conta colidiriam no `Map`
 * e uma delas some, levando junto os valores dela.
 */
export function montarGradeDeMovimentos(
  linhas: LinhaMovimentoMensal[],
  ctx: Contexto & { ocultarTransferencias?: boolean },
): BlocoDaGrade[] {
  const ordem: BlocoDaIdentificadora[] = [
    'RECEITA_PROPRIO', 'RECEITA_TERCEIROS', 'DESPESA', 'RESULTADO', 'OUTRAS',
  ];

  /**
   * ⚠️ OCULTAR A TRANSFERÊNCIA ESCONDE A LINHA, MAS **NÃO** REFAZ O TOTAL.
   * O total vem do banco, contando tudo — e é ele que tem de bater com a
   * conferência. Recalcular aqui criaria a segunda conta do mesmo número, que é
   * exatamente o que este projeto evita em todo lugar. A caixa é um filtro de
   * leitura, e a tela diz isso.
   */
  const visiveis = ctx.ocultarTransferencias
    ? linhas.filter((l) => !(l.linha_tipo === 'CONTA' && l.is_sistema === true))
    : linhas;

  const blocos = ordem
    .map((bloco) => montarBloco(
      bloco,
      visiveis.filter((l) => l.bloco === bloco),
      ctx,
      (l) => ({
        contaId: l.conta_id,
        nome: l.nome,
        tipo: l.tipo,
        inativa: l.is_active === false,
        ehSistema: l.is_sistema === true,
        valor: l.liquido_centavos,
        entradas: l.entradas_centavos,
        saidas: l.saidas_centavos,
        fechado: false,
      }),
      // ⚠️ FLUXO SE SOMA: aqui a coluna TOTAL DO ANO faz sentido.
      true,
    ))
    .filter((b) => b.linhas.length > 0);

  /**
   * ⚠️ O CARIMBO DO MÊS TAMBÉM É FEITO AQUI, mesmo que o dashboard 2 não o use
   * hoje (ele não esconde mês nenhum). Deixá-lo em `false` seria plantar uma
   * armadilha: bastaria alguém ligar `ocultarSemLancamento` nesta tela para ela
   * zerar o ano inteiro, sem erro nenhum que denunciasse o motivo.
   */
  return marcarMesesComMovimento(blocos);
}

interface Extraido {
  contaId: string | null;
  nome: string | null;
  tipo: string | null;
  inativa: boolean;
  ehSistema: boolean;
  valor: number;
  entradas: number;
  saidas: number;
  fechado: boolean;
}

function montarBloco<T extends { linha_tipo: 'CONTA' | 'TOTAL'; mes: number }>(
  bloco: string,
  linhas: T[],
  ctx: Contexto,
  extrair: (l: T) => Extraido,
  somaOAno: boolean,
): BlocoDaGrade {
  const porChave = new Map<string, LinhaDaGrade>();

  for (const l of linhas) {
    const d = extrair(l);
    const ehTotal = l.linha_tipo === 'TOTAL';
    // ⚠️ O BLOCO ENTRA NA CHAVE porque a MESMA conta identificadora aparece
    // nos dois blocos de receita (própria e de terceiros). Sem ele, as duas
    // linhas teriam a mesma identidade — e o dia em que alguém juntar os blocos
    // numa lista só, uma delas some levando os valores junto.
    const chave = ehTotal ? `TOTAL:${bloco}` : `CONTA:${bloco}:${d.contaId ?? d.nome ?? '?'}`;

    let linha = porChave.get(chave);
    if (!linha) {
      linha = {
        chave,
        contaId: ehTotal ? null : d.contaId,
        nome: ehTotal ? (ROTULO_DO_TOTAL[bloco] ?? `TOTAL ${bloco}`) : (d.nome ?? ''),
        tipo: ehTotal ? null : d.tipo,
        inativa: !ehTotal && d.inativa,
        ehSistema: !ehTotal && d.ehSistema,
        ehTotal,
        celulas: celulasVazias(ctx.ano, ctx.hoje),
        totalDoAnoCentavos: somaOAno ? 0 : null,
      };
      porChave.set(chave, linha);
    }

    encaixar(linha.celulas, l.mes, {
      valorCentavos: d.valor,
      entradasCentavos: d.entradas,
      saidasCentavos: d.saidas,
      fechado: d.fechado,
      temLancamento: d.entradas + d.saidas > 0,
    });
  }

  for (const linha of porChave.values()) {
    if (linha.totalDoAnoCentavos !== null) {
      linha.totalDoAnoCentavos = linha.celulas.reduce((s, c) => s + c.valorCentavos, 0);
    }
  }

  /**
   * ⚠️ A ORDEM VEM DO BANCO, E AQUI SÓ O TOTAL É EMPURRADO PARA O FIM. O
   * `Map` do JavaScript preserva a ordem de inserção, que é a ordem em que a
   * função SQL devolveu (por nome). Reordenar por nome aqui criaria uma segunda
   * regra de ordenação — e um dia as duas discordariam sobre acentos.
   */
  const todas = [...porChave.values()];
  return {
    chave: bloco,
    rotulo: rotuloDoBloco(bloco),
    linhas: [...todas.filter((l) => !l.ehTotal), ...todas.filter((l) => l.ehTotal)],
  };
}
