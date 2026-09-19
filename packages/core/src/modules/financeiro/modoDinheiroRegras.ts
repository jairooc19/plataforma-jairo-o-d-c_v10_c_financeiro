/**
 * 🔀 O BOTÃO "VALORES + %" × "SÓ %" — AS DECISÕES, FORA DA TELA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/modoDinheiroRegras.ts
 *
 * 📱 Pedido do dono do projeto em 19/09/2026 (degrau 08): no aplicativo, um botão
 * que alterna a exibição dos números entre **VALORES + %** e **SÓ %**, disponível
 * ao Proprietário **e** ao Dependente, sem conflitar com o bloqueio que o
 * Dependente já pode ter.
 *
 * ⚠️ ARQUIVO PRÓPRIO, E NÃO UM APÊNDICE DO `orcamentoRegras.ts`. Aquele já tinha
 * 184 linhas; somar isto o levaria a ~295, e a regra de ouro deste projeto manda
 * fatiar acima de ~150. São assuntos diferentes: lá é "como a barra se pinta",
 * aqui é "quem escolhe o que se lê".
 *
 * ⚠️ NÃO IMPORTA NADA EM TEMPO DE EXECUÇÃO — nem um tipo de outro arquivo. É
 * regra do projeto para arquivo que tem teste: o `node --test` não resolve
 * caminho sem extensão, e o `.ts` explícito quebraria o `next build` (TS5097).
 */

/** Como os números aparecem na tela. */
export type ModoDoDinheiro = 'VALORES' | 'PERCENTUAL';

/** O que a tela precisa saber para se desenhar e para desenhar o botão. */
export interface ExibicaoDoDinheiro {
  /** O modo que vale agora. */
  modo: ModoDoDinheiro;
  /** O botão pode alternar? `false` = a escolha não é desta pessoa. */
  podeAlternar: boolean;
  /**
   * Por que não pode alternar. `null` quando pode.
   *
   * ⚠️ TEM DE EXISTIR. Botão desligado sem explicação é pior do que botão nenhum:
   * a pessoa toca, nada acontece, e ela conclui que o aplicativo travou.
   */
  motivo: string | null;
}

/**
 * Qual modo vale agora, e se o botão pode alternar.
 *
 * ===========================================================================
 * ⚠️ O BLOQUEIO NÃO É FEITO POR ESTA FUNÇÃO — ELE JÁ ACONTECEU NO BANCO
 * ===========================================================================
 * Quando o Proprietário marca `dinheiro_percentual` para um Dependente, a
 * `fin_dinheiro_do_periodo` devolve `orcado_centavos`, `realizado_centavos` e
 * `saldo_centavos` em **NULO**. Os valores NÃO ATRAVESSAM a internet.
 *
 * Portanto, mesmo que alguém adultere o aplicativo e force o modo VALORES, o que
 * aparece é `—`: não há número para mostrar. Este arquivo **não guarda segredo
 * nenhum** — ele só faz o botão dizer a verdade sobre o que é possível.
 *
 * Essa distinção é a razão de o botão poder existir sem ferir a proibição
 * *"nunca implementar 'este usuário vê menos' filtrando na TELA"*:
 *
 *   • ESCONDER O QUE JÁ CHEGOU   → é CONFORTO, e é escolha de quem está olhando
 *     (mostrar o ecrã a alguém ao lado, por exemplo). Pode morar na tela.
 *   • NÃO ENVIAR O QUE NÃO PODE  → é SEGURANÇA, e mora no banco. Já está lá.
 *
 * O botão é a primeira coisa; o `ve_valores` é a segunda. Eles não competem, e é
 * por isso que um não pode "quebrar" o outro: o botão nunca teve os valores em
 * mãos para revelar.
 *
 * ⚠️ E A DIREÇÃO IMPORTA. Ir para SÓ % é sempre permitido — ninguém precisa de
 * autorização para deixar de ver o que já tem. Voltar para VALORES é que depende
 * de os valores existirem.
 *
 * @param veValores o que o BANCO respondeu em `fin_config_dinheiro.ve_valores`
 * @param escolha   a preferência guardada NO APARELHO; `null` = nunca escolheu
 */
export function exibicaoDoDinheiro(
  veValores: boolean,
  escolha: ModoDoDinheiro | null,
): ExibicaoDoDinheiro {
  if (!veValores) {
    return {
      modo: 'PERCENTUAL',
      podeAlternar: false,
      motivo:
        'O PROPRIETÁRIO LIBEROU PARA VOCÊ SOMENTE O PERCENTUAL. OS VALORES EM REAIS NÃO SÃO ENVIADOS A ESTE APARELHO.',
    };
  }

  // ⚠️ O PADRÃO É O COMPORTAMENTO COMPLETO, igual ao `ve_valores` do banco: quem
  // nunca tocou no botão vê os valores. O modo restrito é o que se liga de
  // propósito — nunca o que se herda por omissão.
  return { modo: escolha ?? 'VALORES', podeAlternar: true, motivo: null };
}

/** O outro modo. Existe para a tela não repetir o ternário em dois lugares. */
export function alternarModoDoDinheiro(modo: ModoDoDinheiro): ModoDoDinheiro {
  return modo === 'VALORES' ? 'PERCENTUAL' : 'VALORES';
}

/**
 * O rótulo **DAQUELE MODO** — o nome do estado, não de uma ação.
 *
 * ===========================================================================
 * ⚠️ ESTA FUNÇÃO FAZIA O CONTRÁRIO ATÉ 19/09/2026, E A MUDANÇA FOI PAGA COM UM
 * DEFEITO RELATADO NO PRIMEIRO USO REAL
 * ===========================================================================
 * Ela devolvia o **destino do toque**: com valores à vista dizia "SÓ %". O
 * argumento escrito aqui era que o estado atual já está à vista — "são os próprios
 * números na tela" — e que anunciar o destino removia a dúvida.
 *
 * **O argumento estava errado, e o dono do projeto o derrubou em duas capturas de
 * tela.** Ele leu o botão "SÓ %" como *"estou em SÓ %"*, viu os valores aparecendo
 * ao lado e relatou como defeito. É a leitura natural: num botão, um substantivo
 * ("SÓ %") descreve; um verbo ("OCULTAR VALORES") ordena. Eu pus o substantivo e
 * esperei que fosse lido como ordem.
 *
 * ⚠️ E A CORREÇÃO NÃO FOI TROCAR A PALAVRA. Qualquer botão de UM estado com DOIS
 * significados possíveis continua ambíguo — só muda quem se confunde. O que a tela
 * usa agora é um **seletor de duas posições**, com os dois rótulos à vista e o
 * ativo em destaque: não há o que deduzir, porque as duas opções estão escritas.
 * Esta função passou a servir a ele, devolvendo o nome de cada posição.
 */
export function rotuloDoModo(modo: ModoDoDinheiro): string {
  return modo === 'VALORES' ? 'VALORES + %' : 'SÓ %';
}

/** As duas posições do seletor, na ordem em que aparecem. */
export const MODOS_DO_DINHEIRO: readonly ModoDoDinheiro[] = ['VALORES', 'PERCENTUAL'] as const;

/**
 * A pessoa deve ver números nesta tela agora?
 *
 * É a conjunção das duas coisas, na ordem certa: o banco mandou valores **e** o
 * modo em vigor é VALORES.
 *
 * ⚠️ NUNCA PERGUNTE SÓ AO MODO. Quem está em VALORES e recebeu nulo (não deveria
 * acontecer, mas o tipo permite) precisa ver `—`, nunca `0,00`: zero é um número,
 * e dizer que o orçamento é zero seria pior do que não mostrar nada.
 */
export function mostraValores(
  modo: ModoDoDinheiro,
  linha: { orcado_centavos: number | null; realizado_centavos: number | null },
): boolean {
  if (modo !== 'VALORES') return false;
  return linha.orcado_centavos !== null || linha.realizado_centavos !== null;
}

/**
 * A chave da preferência no cofre do aparelho.
 *
 * ⚠️ ELA MORA AQUI, NO MÓDULO, e é passada ao `storageService` da plataforma por
 * parâmetro. O `storageService` é arquivo de plataforma: escrever `'fin_...'`
 * dentro dele seria uma quarta solda clandestina, e o verificador de LEGO
 * acusaria — com razão.
 *
 * ⚠️ É PREFERÊNCIA, NÃO AUTORIZAÇÃO. O cofre do telemóvel é gravável por quem tem
 * o telemóvel; se alguém trocar este valor à mão, consegue no máximo escolher
 * como VÊ o que já lhe foi enviado. O que ele não consegue é fazer o banco
 * enviar o que não enviaria.
 */
export const CHAVE_MODO_DINHEIRO = 'fin_dp_modo_exibicao';

/** Lê a preferência gravada, recusando qualquer texto que não seja um dos dois. */
export function modoGravado(bruto: string | null | undefined): ModoDoDinheiro | null {
  if (bruto === 'VALORES' || bruto === 'PERCENTUAL') return bruto;
  return null;
}
