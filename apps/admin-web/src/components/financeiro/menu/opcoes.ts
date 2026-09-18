import type { NomeDeIcone } from "../IconeFin";

/**
 * 🗺️ A ÁRVORE DO MENU "OPÇÕES" (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/menu/opcoes.ts
 *
 * Só os dados. Quem desenha é o `PainelDeOpcoes.tsx`, quem decide o que aparece
 * é a permissão do usuário. Separado assim, acrescentar uma tela ao menu é
 * mexer numa lista — não em JSX.
 *
 * ⚠️ NÍVEL COM FILHOS NÃO TEM `href`. Ele é um interruptor: o clique abre e
 * fecha a lista dos filhos, não navega. Foi o pedido do dono do projeto em
 * 13/09/2026 — antes, "CADASTROS" era um rótulo apagado e os dois filhos
 * ficavam sempre à mostra, o que fazia o menu nascer comprido e sem hierarquia
 * visível.
 */

/** A permissão que o item exige para aparecer. `undefined` = aparece sempre. */
export type ChavePermissao =
  | "cm_ver" | "ci_ver" | "lc_ver_todos" | "lc_criar" | "extrato_ver"
  | "transferencia" | "fechar_periodo" | "imprimir";

export interface ItemDeMenu {
  rotulo: string;
  icone: NomeDeIcone;
  /** Destino. Ausente em nível com filhos e em opção ainda não construída. */
  href?: string;
  /** Abre o aviso "em desenvolvimento" em vez de navegar. */
  emDesenvolvimento?: boolean;
  /** Só aparece se o usuário tiver esta permissão. */
  exige?: ChavePermissao;
  filhos?: ItemDeMenu[];
}

export const OPCOES: ItemDeMenu[] = [
  {
    rotulo: "CADASTROS",
    icone: "cadastros",
    filhos: [
      {
        rotulo: "CONTA MOVIMENTO",
        icone: "contaMovimento",
        href: "/dashboard/financeiro/contas-movimento",
        exige: "cm_ver",
      },
      {
        rotulo: "CONTA IDENTIFICADORA",
        icone: "contaIdentificadora",
        href: "/dashboard/financeiro/contas-identificadoras",
        exige: "ci_ver",
      },
    ],
  },
  {
    rotulo: "LANÇAMENTOS",
    icone: "lancamentos",
    filhos: [
      {
        rotulo: "NOVO LANÇAMENTO",
        icone: "novo",
        href: "/dashboard/financeiro/lancamentos/novo",
        exige: "lc_criar",
      },
      {
        rotulo: "PESQUISAR",
        icone: "pesquisar",
        href: "/dashboard/financeiro/lancamentos/pesquisar",
      },
      /**
       * ⚠️ NÃO EXISTE UMA ENTRADA "EXTRATO DA CONTA" AQUI, e não é esquecimento.
       * O extrato não é uma tela separada: ele é a coluna direita de "Novo
       * Lançamento", chamada CONFERÊNCIA DA CONTA — o desenho todo do módulo é
       * lançar olhando o extrato ao lado. Uma entrada de menu levando a uma
       * terceira tela de extrato criaria duas respostas para a mesma pergunta.
       */
    ],
  },
  {
    rotulo: "CONFIGURAÇÕES",
    icone: "configuracoes",
    filhos: [
      {
        rotulo: "EQUIPE E PERMISSÕES",
        icone: "equipe",
        href: "/dashboard/financeiro/dependentes",
      },
    ],
  },
  /**
   * 📊 OS DOIS DASHBOARDS — 18/09/2026.
   *
   * ⚠️ AS DUAS TELAS DE CONFERÊNCIA QUE ELES ABREM **NÃO** ENTRAM NESTA LISTA,
   * e isso é cumprimento da decisão escrita logo acima, em LANÇAMENTOS: não
   * deve haver entrada de menu para uma terceira tela de extrato, porque criaria
   * duas respostas para a mesma pergunta. Continua havendo UMA porta no menu; o
   * que passou a existir é um ATALHO, alcançável só clicando no dashboard.
   *
   * ⚠️ OS DOIS EXIGEM `extrato_ver`, E NENHUMA PERMISSÃO NOVA FOI CRIADA. Ela
   * já se chama, na tela de permissões, "VER A CONFERÊNCIA DA CONTA (SALDOS)" —
   * que é exatamente o que um dashboard de saldos mostra. Continuam sendo 18.
   */
  {
    rotulo: "DASHBOARDS",
    icone: "dashboards",
    filhos: [
      {
        rotulo: "SALDOS POR CONTA MOVIMENTO",
        icone: "contaMovimento",
        href: "/dashboard/financeiro/dashboards/contas-movimento",
        exige: "extrato_ver",
      },
      {
        rotulo: "MOVIMENTO POR CONTA IDENTIFICADORA",
        icone: "contaIdentificadora",
        href: "/dashboard/financeiro/dashboards/contas-identificadoras",
        exige: "extrato_ver",
      },
    ],
  },
  { rotulo: "ORÇAMENTO",  icone: "orcamento",  emDesenvolvimento: true },
];

/**
 * ⚠️ "TRANSFERÊNCIA" NÃO ESTÁ NESTA LISTA, E É DE PROPÓSITO.
 * Decisão do dono do projeto em 13/09/2026: ela mora **dentro** de "Novo
 * Lançamento", porque transferir é um jeito de lançar — são duas pernas de
 * lançamento numa operação só (RN-23). Tê-la também no menu daria a impressão
 * de que é outro assunto. A rota `/dashboard/financeiro/transferencia` continua
 * existindo e funcionando; o que mudou foi de onde se chega até ela.
 */
