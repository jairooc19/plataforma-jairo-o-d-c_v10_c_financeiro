"use client";

import {
  ArrowLeft, ArrowRightLeft, Ban, Banknote, CalendarCheck, ChartColumn,
  ChevronDown, ChevronRight, CircleAlert, CircleCheck, CirclePlus, Coins,
  Download, Eye, FileUp, FolderTree, Funnel, LayoutDashboard, ListChecks, Lock,
  LockOpen, Menu, Pencil, PiggyBank, Plus, Printer, RefreshCw, Save, Search,
  Settings, Tags, Trash, Users, Wallet, X,
} from "lucide-react";

/**
 * 🎨 REGISTRO DE ÍCONES DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/IconeFin.tsx
 *
 * TODOS OS ÍCONES DO MÓDULO SÃO DE LINHA (OUTLINE). Não é escolha de gosto: o
 * `lucide-react` desenha tudo em traço (`fill="none"`, `stroke="currentColor"`),
 * então "outline" é o que o pacote entrega por natureza. O que este arquivo
 * garante é que ninguém, ao acrescentar uma tela, traga um ícone cheio de outra
 * biblioteca e quebre a unidade visual.
 *
 * ⚠️ POR QUE UM REGISTRO, E NÃO `import { Wallet } from "lucide-react"` NA TELA.
 * A mesma armadilha que o `mobile-app` já documenta, e que vale igual na web: o
 * `lucide-react` 1.x RENOMEOU o catálogo. Conferido neste repositório, na versão
 * instalada:
 *
 *   | nome antigo (não existe mais) | nome atual |
 *   |---|---|
 *   | `Trash2`   | `Trash`    |
 *   | `Unlock`   | `LockOpen` |
 *   | `Filter`   | `Funnel`   |
 *
 * Importar o nome antigo **não quebra o build e não acusa nada no editor**:
 * devolve `undefined` e só estoura no navegador, ao renderizar, com "Element
 * type is invalid". Passando por este registro, o nome errado vira erro de
 * TypeScript aqui, num arquivo só.
 *
 * ⚠️ NUNCA use `import * as Lucide from "lucide-react"`. O curinga arrasta os
 * mais de mil ícones do catálogo para o pacote final, porque o empacotador não
 * consegue provar quais serão usados quando o nome só se conhece em execução.
 *
 * ⚠️ ESTE ARQUIVO É DO MÓDULO. Está em `components/financeiro/`, some com a
 * pasta ao desplugar, e não é citado por nenhum arquivo da plataforma.
 */

const CATALOGO = {
  // navegação
  menu: Menu,
  fechar: X,
  voltar: ArrowLeft,
  abrirNivel: ChevronRight,
  fecharNivel: ChevronDown,

  // os assuntos do módulo
  cadastros: FolderTree,
  contaMovimento: Wallet,
  contaIdentificadora: Tags,
  lancamentos: ListChecks,
  dinheiro: Coins,
  dinheiroPeriodo: Banknote,
  transferencia: ArrowRightLeft,
  dashboards: LayoutDashboard,
  orcamento: PiggyBank,
  relatorio: ChartColumn,
  equipe: Users,
  configuracoes: Settings,

  // ações
  novo: CirclePlus,
  adicionar: Plus,
  salvar: Save,
  editar: Pencil,
  excluir: Trash,
  pesquisar: Search,
  filtrar: Funnel,
  imprimir: Printer,
  exportar: Download,
  importar: FileUp,
  recarregar: RefreshCw,
  ver: Eye,

  // estados
  ativo: CircleCheck,
  inativo: Ban,
  atencao: CircleAlert,
  fechado: Lock,
  aberto: LockOpen,
  periodo: CalendarCheck,
} as const;

/** Os nomes válidos. Errar um deles é erro de compilação, não surpresa em tela. */
export type NomeDeIcone = keyof typeof CATALOGO;

/**
 * Um ícone de linha do módulo.
 *
 * `tamanho` em pixels e `traco` (espessura do traço) têm padrão pensado para
 * botão: 16px com traço 2 fica legível ao lado de texto em caixa alta.
 */
export default function IconeFin({
  nome, tamanho = 16, traco = 2, className,
}: {
  nome: NomeDeIcone;
  tamanho?: number;
  traco?: number;
  className?: string;
}) {
  const Desenho = CATALOGO[nome];
  return (
    <Desenho
      size={tamanho}
      strokeWidth={traco}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}
