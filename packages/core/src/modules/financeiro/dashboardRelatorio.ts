/**
 * 🖨️ A GRADE VIRANDO PAPEL E PLANILHA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/dashboardRelatorio.ts
 *
 * ⚠️ POR QUE IMPRESSÃO E .TSV SAEM DO MESMO LUGAR. São duas saídas da mesma
 * tabela. Escritas em dois lugares, seriam duas chances de divergir — e a
 * segunda cópia é sempre a que esquece uma coluna. Aqui elas partem da MESMA
 * lista de linhas; o que muda é só quem recebe.
 *
 * ⚠️ E NENHUMA DAS DUAS SOMA NADA. As linhas de total já vêm prontas dentro da
 * grade, que as recebeu do banco. Este arquivo apenas escolhe a ordem, escreve
 * os títulos de bloco e formata — é a regra do projeto, de ponta a ponta: quem
 * conta é quem executa.
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

import type { BlocoDaGrade } from './dashboardRegras';

export interface RelatorioDoDashboard {
  colunas: string[];
  /** Cada linha é um vetor de textos JÁ formatados. */
  linhas: string[][];
  /**
   * Os índices (base 0) das linhas que saem em negrito: os títulos de bloco e
   * os totais.
   *
   * ⚠️ SEM ISSO, O TOTAL SAI COM A MESMA CARA DE UMA CONTA QUALQUER. Num
   * relatório de duas páginas, procurar o total no meio de trinta linhas iguais
   * é o tipo de atrito que faz alguém preferir a calculadora.
   */
  destaques: number[];
}

/**
 * As colunas: CONTA, os doze meses, e — só quando somar faz sentido — o total.
 *
 * ⚠️ O `comTotalDoAno` VEM DA GRADE, NÃO DE UMA ESCOLHA DE TELA. Ele é `true`
 * no dashboard das identificadoras (fluxo se soma) e `false` no dos saldos
 * (somar doze saldos não significa nada). A explicação longa está no topo de
 * `dashboardRegras.ts`.
 */
export function colunasDoRelatorio(
  meses: readonly string[],
  comTotalDoAno: boolean,
): string[] {
  return ['CONTA', ...meses, ...(comTotalDoAno ? ['TOTAL DO ANO'] : [])];
}

/**
 * Transforma a grade na tabela única que a guia de impressão e o .TSV esperam.
 *
 * Os dois blocos viram títulos DENTRO da mesma tabela, porque a guia de
 * impressão do módulo desenha uma tabela só — e ensiná-la a desenhar várias
 * seria mexer numa peça que hoje serve a três telas.
 */
export function montarRelatorio(
  blocos: BlocoDaGrade[],
  opcoes: {
    /** `MESES_CURTOS` do Core — ver o aviso no topo do arquivo. */
    meses: readonly string[];
    /** `formatarBRL(v, { semSimbolo: true })`, normalmente. */
    formatarValor: (centavos: number) => string;
    comTotalDoAno: boolean;
    /**
     * Mês sem lançamento sai em branco, como na tela (dashboard dos saldos).
     *
     * ⚠️ O PAPEL TEM DE CONCORDAR COM A TELA. Se a célula está vazia no monitor
     * e cheia na impressão, a pessoa passa a não confiar em nenhuma das duas —
     * e não há como saber qual das duas estava certa olhando só uma.
     */
    ocultarSemLancamento?: boolean;
    /** Sufixo do nome da conta desativada. Padrão: " (INATIVA)". */
    marcaDeInativa?: string;
  },
): RelatorioDoDashboard {
  const { meses, formatarValor, comTotalDoAno } = opcoes;
  const marca = opcoes.marcaDeInativa ?? ' (INATIVA)';
  const colunas = colunasDoRelatorio(meses, comTotalDoAno);
  const largura = colunas.length;

  const linhas: string[][] = [];
  const destaques: number[] = [];

  for (const bloco of blocos) {
    // O título do bloco ocupa a primeira célula; o resto fica vazio.
    destaques.push(linhas.length);
    linhas.push([bloco.rotulo, ...Array(largura - 1).fill('')]);

    for (const linha of bloco.linhas) {
      if (linha.ehTotal) destaques.push(linhas.length);
      linhas.push([
        linha.nome + (linha.inativa ? marca : ''),
        ...linha.celulas.map((c) =>
          (opcoes.ocultarSemLancamento && !c.temLancamento) ? '' : formatarValor(c.valorCentavos)),
        ...(comTotalDoAno
          ? [linha.totalDoAnoCentavos === null ? '' : formatarValor(linha.totalDoAnoCentavos)]
          : []),
      ]);
    }
  }

  return { colunas, linhas, destaques };
}

/**
 * Os índices das colunas que se alinham à direita no papel: todas as de
 * dinheiro, ou seja, todas menos a primeira.
 */
export function colunasNumericas(meses: readonly string[], comTotalDoAno: boolean): number[] {
  return colunasDoRelatorio(meses, comTotalDoAno).map((_, i) => i).filter((i) => i > 0);
}
