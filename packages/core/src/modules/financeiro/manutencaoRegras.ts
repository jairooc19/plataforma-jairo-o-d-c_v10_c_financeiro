/**
 * 🧠 AS DECISÕES DA TELA DE EXCLUSÃO EM LOTE — FORA DA TELA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/manutencaoRegras.ts
 *
 * ===========================================================================
 * POR QUE ESTE ARQUIVO EXISTE — o bônus 7, e a forma honesta dele
 * ===========================================================================
 * O maior buraco da malha de provas deste projeto é a CAMADA DE TELA: o banco
 * tem 45 travas (16 + 29), a tela tem zero. O defeito da ordem do extrato, de
 * 16/09/2026, viveu escondido desde o degrau 7 porque nenhuma prova olhava
 * para lá.
 *
 * ⚠️ TESTAR O COMPONENTE `.tsx` DE VERDADE NÃO CABE HOJE, E O MOTIVO FOI
 * MEDIDO, NÃO SUPOSTO: o `npm test` roda `node --test`, e o Node 24 remove
 * ANOTAÇÕES DE TIPO mas **não sabe ler JSX** (`SyntaxError: Unexpected token
 * '<'`, medido em 17/09/2026). Testar componente exigiria um transformador,
 * um DOM falso e um renderizador — de 3 a 5 dependências novas num projeto que
 * hoje tem **zero** dependências de desenvolvimento, e uma mudança no que a
 * Vercel instala para construir. Num projeto cujo dono não roda nada local,
 * isso é risco de publicação em troca de conforto de quem escreve.
 *
 * O CAMINHO QUE CABE é o que a própria regra do projeto já manda ("nunca
 * escrever cálculo de data dentro de um componente — no Core ele é testável
 * pelo `npm test`"): **tirar a DECISÃO de dentro da tela**. O que sobra no
 * componente é desenho; o que decide mora aqui, e tem teste.
 *
 * Isso não cobre clique, foco nem propagação de evento — e eu não vou fingir
 * que cobre. Cobre a parte que erra em silêncio.
 */

import type { RelatorioDeExclusao } from './manutencaoService';

/**
 * O filtro que gerou uma simulação.
 *
 * ⚠️ ELE EXISTE PARA RESOLVER UM DEFEITO DE CLASSE CONHECIDA NESTE PROJETO:
 * a tela mostra um resultado calculado com PARÂMETROS ANTIGOS. Foi assim que a
 * sugestão de ordem ficou presa a `[contaId, data]` e parou de rodar (16/09).
 *
 * Aqui seria pior: simular "setembro" (137 registros), depois mexer na data
 * para "janeiro", e o botão continuar dizendo "EXCLUIR 137". A pessoa confirma
 * um número que não tem mais relação com o que está na tela.
 */
export interface FiltroDeExclusao {
  contaMovimentoId: string | null;
  dataInicial: string;
  dataFinal: string;
  /**
   * Os lançamentos MARCADOS na lista (17/09/2026, 2ª rodada).
   *
   * ⚠️ ELE FAZ PARTE DA IDENTIDADE DA PERGUNTA, e não é um detalhe de tela.
   * Marcar ou desmarcar uma caixa depois de conferir muda o número tanto quanto
   * trocar a data mudaria — e o botão continuaria pedindo o número velho. Por
   * isso ele entra no `mesmoFiltro`, junto com a conta e o período.
   *
   * ⚠️ `null` E `[]` SÃO DIFERENTES: `null` = "não estou escolhendo, leve o
   * período inteiro"; `[]` = "desmarquei tudo, não leve nada". Tratá-los como
   * iguais faria DESMARCAR TODOS apagar o mês.
   */
  idsSelecionados: string[] | null;
}

/** Uma simulação e o filtro exato com que ela foi feita. */
export interface SimulacaoFeita {
  filtro: FiltroDeExclusao;
  relatorio: RelatorioDeExclusao;
}

/** As duas listas de marcados são a mesma escolha? A ordem não importa. */
function mesmaSelecao(a: string[] | null, b: string[] | null): boolean {
  // `null` só é igual a `null` — nunca a um array, nem mesmo ao vazio.
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;
  const conjunto = new Set(a);
  return b.every((id) => conjunto.has(id));
}

/** Duas filtragens são a mesma pergunta? */
export function mesmoFiltro(a: FiltroDeExclusao, b: FiltroDeExclusao): boolean {
  return (
    (a.contaMovimentoId ?? null) === (b.contaMovimentoId ?? null) &&
    a.dataInicial === b.dataInicial &&
    a.dataFinal === b.dataFinal &&
    mesmaSelecao(a.idsSelecionados ?? null, b.idsSelecionados ?? null)
  );
}

/** O que impede a exclusão de acontecer agora. `null` = nada impede. */
export type MotivoDeBloqueio =
  | 'SEM_DATAS'
  | 'DATAS_INVERTIDAS'
  | 'SEM_SIMULACAO'
  | 'SIMULACAO_VENCIDA'
  | 'NADA_MARCADO'
  | 'NADA_A_EXCLUIR'
  | 'CONFIRMACAO_NAO_CONFERE';

export interface VeredictoDaExclusao {
  podeExcluir: boolean;
  motivo: MotivoDeBloqueio | null;
  /** A frase que a tela mostra ao lado do botão desligado. */
  aviso: string | null;
}

const AVISO: Record<MotivoDeBloqueio, string> = {
  SEM_DATAS: 'INFORME A DATA INICIAL E A DATA FINAL.',
  DATAS_INVERTIDAS: 'A DATA FINAL NÃO PODE SER ANTERIOR À DATA INICIAL.',
  SEM_SIMULACAO: 'CLIQUE EM "CONFERIR O QUE SERÁ EXCLUÍDO" ANTES.',
  SIMULACAO_VENCIDA:
    'OS FILTROS OU OS MARCADOS MUDARAM DEPOIS DA CONFERÊNCIA. CONFIRA DE NOVO ANTES DE EXCLUIR.',
  NADA_MARCADO: 'NENHUM LANÇAMENTO MARCADO. MARQUE AO MENOS UM PARA EXCLUIR.',
  NADA_A_EXCLUIR: 'NENHUM LANÇAMENTO NESTE PERÍODO.',
  CONFIRMACAO_NAO_CONFERE: 'DIGITE O NÚMERO EXATO DE LANÇAMENTOS PARA CONFIRMAR.',
};

/**
 * A porta da exclusão em lote. Responde uma coisa só: dá para apagar agora?
 *
 * ⚠️ A ORDEM DAS CHECAGENS É A ORDEM EM QUE A PESSOA ESBARRA NELAS. Avisar
 * "digite o número" para quem ainda nem escolheu as datas seria mandar resolver
 * o terceiro problema antes do primeiro.
 *
 * ⚠️ ISTO NÃO AUTORIZA NADA. Quem recusa de verdade é a função do banco, que
 * confere permissão, fechamento e transferência por dentro. Aqui é conforto:
 * evita uma viagem ao servidor para receber um "não" previsível.
 */
export function avaliarExclusao(entrada: {
  filtroAtual: FiltroDeExclusao;
  simulacao: SimulacaoFeita | null;
  textoDigitado: string;
}): VeredictoDaExclusao {
  const { filtroAtual, simulacao, textoDigitado } = entrada;

  const bloquear = (motivo: MotivoDeBloqueio): VeredictoDaExclusao => ({
    podeExcluir: false,
    motivo,
    aviso: AVISO[motivo],
  });

  if (!filtroAtual.dataInicial || !filtroAtual.dataFinal) return bloquear('SEM_DATAS');
  if (filtroAtual.dataFinal < filtroAtual.dataInicial) return bloquear('DATAS_INVERTIDAS');

  // ⚠️ ANTES DA SIMULAÇÃO, e de propósito: desmarcar tudo é um estado que a
  // pessoa alcança sozinha na lista, e a resposta certa é "marque alguma
  // coisa" — não "confira de novo". Mandá-la conferir uma seleção vazia seria
  // fazê-la clicar para receber um zero que já se sabia.
  if (filtroAtual.idsSelecionados !== null && filtroAtual.idsSelecionados.length === 0) {
    return bloquear('NADA_MARCADO');
  }

  if (!simulacao) return bloquear('SEM_SIMULACAO');
  if (!mesmoFiltro(simulacao.filtro, filtroAtual)) return bloquear('SIMULACAO_VENCIDA');
  if (simulacao.relatorio.lancamentos === 0) return bloquear('NADA_A_EXCLUIR');

  // ⚠️ `trim()` porque colar um número costuma trazer espaço junto, e recusar
  // por causa disso seria implicância. O resto tem de bater exatamente.
  if (textoDigitado.trim() !== String(simulacao.relatorio.lancamentos)) {
    return bloquear('CONFIRMACAO_NAO_CONFERE');
  }

  return { podeExcluir: true, motivo: null, aviso: null };
}

/**
 * As frases que a tela mostra depois de uma simulação.
 *
 * ⚠️ A FRASE DAS OUTRAS CONTAS É OBRIGATÓRIA QUANDO `foraDoFiltro > 0`, e é a
 * razão principal desta função existir. "Apagar setembro do CAIXA" pode apagar
 * lançamentos do BANCO — as outras pernas das transferências (RN-23). Quem
 * confirma sem saber disso descobre pelo saldo, depois.
 */
export function resumirExclusao(relatorio: RelatorioDeExclusao): string[] {
  if (relatorio.lancamentos === 0) {
    return ['NENHUM LANÇAMENTO ENCONTRADO NESTE PERÍODO. NADA SERÁ EXCLUÍDO.'];
  }

  const frases: string[] = [
    `${relatorio.lancamentos} LANÇAMENTO(S) SERÃO EXCLUÍDOS.`,
  ];

  if (relatorio.transferencias > 0) {
    frases.push(
      `${relatorio.transferencias} TRANSFERÊNCIA(S) ESTÃO ENVOLVIDAS — E TRANSFERÊNCIA SAI SEMPRE COMPLETA, AS DUAS PERNAS.`,
    );
  }

  if (relatorio.foraDoFiltro > 0) {
    frases.push(
      `ATENÇÃO: ${relatorio.foraDoFiltro} DESSES LANÇAMENTOS ESTÃO FORA DO FILTRO QUE VOCÊ PEDIU — SÃO AS OUTRAS PERNAS DAS TRANSFERÊNCIAS, EM OUTRAS CONTAS OU OUTRAS DATAS.`,
    );
  }

  if (relatorio.contas.length > 0) {
    frases.push(`CONTAS AFETADAS: ${relatorio.contas.join(', ')}.`);
  }

  frases.push(
    'OS LANÇAMENTOS EXCLUÍDOS FICAM NA LIXEIRA E PODEM SER RESTAURADOS.',
  );

  return frases;
}

/**
 * Uma linha da tabela pode abrir a ficha do lançamento?
 *
 * ⚠️ NASCEU DE UM DEFEITO REAL, E POR ISSO VIVE AQUI E NÃO NO COMPONENTE. No
 * extrato, "SALDO INICIAL" e "TOTAIS DO PERÍODO" são somas, não registros: uma
 * linha dessas que respondesse ao clique prometeria uma ficha que não existe.
 * Na PESQUISAR toda linha é um lançamento, então toda linha abre.
 *
 * A mesma pergunta, feita pelas duas telas, com uma resposta só.
 */
export function linhaAbreFicha(linha: {
  linha_tipo?: string | null;
  lancamento_id?: string | null;
  id?: string | null;
}): boolean {
  const tipo = linha.linha_tipo ?? 'LANCAMENTO';
  if (tipo !== 'LANCAMENTO') return false;
  return Boolean(linha.lancamento_id ?? linha.id);
}

/**
 * 🎁 O RECADO DEPOIS DE EXCLUIR UM LANÇAMENTO — 18/09/2026.
 *
 * ===========================================================================
 * ⚠️ AS TELAS ESTAVAM DIZENDO QUE A EXCLUSÃO NÃO TINHA VOLTA. NÃO É VERDADE
 * DESDE 17/09/2026.
 * ===========================================================================
 * A confirmação da tela PESQUISAR terminava, literalmente, com "ESTA AÇÃO NÃO
 * PODE SER DESFEITA". Era verdade quando foi escrita e deixou de ser no dia em
 * que a LIXEIRA nasceu — e ninguém voltou para corrigir a frase.
 *
 * Isso é pior do que não avisar: quem lê aquilo e ainda assim exclui por
 * engano fica convencido de que perdeu o registro, e não vai procurar. A
 * lixeira só serve a quem sabe que ela existe.
 *
 * ⚠️ E O RECADO MUDA CONFORME QUEM ESTÁ NA FRENTE DA TELA. Restaurar exige a
 * permissão `lc_excluir_lote`. Prometer "você pode restaurar" a um integrante
 * que não a tem seria trocar uma frase falsa por outra: ele iria procurar a
 * tela, não ia encontrar, e a mensagem teria mentido de novo. Para esse, a
 * verdade é outra — **alguém** pode, e ele precisa é saber a quem pedir.
 *
 * @param apagados quantos lançamentos saíram (a transferência leva 2).
 * @param eraTransferencia o banco apagou as duas pernas? (RN-23)
 * @param podeRestaurar quem está na tela tem `lc_excluir_lote`?
 */
export function recadoDeExclusao(params: {
  apagados: number;
  eraTransferencia: boolean;
  podeRestaurar: boolean;
}): { texto: string; ofereceLixeira: boolean } {
  const cabeca = params.eraTransferencia
    ? `TRANSFERÊNCIA EXCLUÍDA: ${params.apagados} LANÇAMENTO(S) APAGADO(S).`
    : 'LANÇAMENTO EXCLUÍDO.';

  const recuperacao = params.podeRestaurar
    ? 'ELE NÃO SUMIU: ESTÁ NA LIXEIRA, E DÁ PARA RESTAURAR.'
    : 'ELE NÃO SUMIU: ESTÁ NA LIXEIRA. O PROPRIETÁRIO DA EMPRESA PODE RESTAURÁ-LO.';

  return {
    texto: `${cabeca} ${recuperacao}`,
    // Só quem pode restaurar recebe o atalho — mandar alguém para uma tela que
    // vai recusá-lo é pior do que não oferecer atalho nenhum.
    ofereceLixeira: params.podeRestaurar,
  };
}

/**
 * A frase que fecha a JANELA DE CONFIRMAÇÃO, antes de excluir.
 *
 * ⚠️ ELA SUBSTITUI UM "NÃO PODE SER DESFEITA" QUE VIROU MENTIRA. Dizer a
 * verdade aqui não é conforto: é o que permite a alguém confirmar com
 * tranquilidade um gesto que de fato é reversível — e é também o que mantém o
 * peso da ÚNICA ação que realmente não tem volta (limpar a lixeira), que
 * continua avisando, com todas as letras, que não tem.
 */
export function fraseDeReversibilidade(podeRestaurar: boolean): string {
  return podeRestaurar
    ? 'ISTO PODE SER DESFEITO: O LANÇAMENTO VAI PARA A LIXEIRA, EM CONFIGURAÇÕES DO MÓDULO.'
    : 'ISTO PODE SER DESFEITO PELO PROPRIETÁRIO: O LANÇAMENTO VAI PARA A LIXEIRA.';
}
