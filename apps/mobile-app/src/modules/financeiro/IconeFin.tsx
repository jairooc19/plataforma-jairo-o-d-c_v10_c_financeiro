import React, { memo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Wallet,
} from 'lucide-react-native';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';

/**
 * 🎯 O REGISTRO DE ÍCONES DO MÓDULO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/IconeFin.tsx
 *
 * Irmão do `apps/admin-web/src/components/financeiro/IconeFin.tsx`, e existe pelos
 * mesmos dois motivos.
 *
 * ===========================================================================
 * ⚠️ MOTIVO 1 — O `lucide-react-native@1.x` RENOMEOU BOA PARTE DO CATÁLOGO
 * ===========================================================================
 * Os nomes que aparecem em toda documentação escrita antes da v1 não existem
 * mais: `Home`→`House`, `Trash2`→`Trash`, `AlertCircle`→`CircleAlert`,
 * `Filter`→`Funnel`. E o modo de falhar é dos piores: um `import { AlertCircle }`
 * de um nome inexistente **não quebra o empacotamento e não acusa nada** — ele
 * entrega `undefined`, e o aplicativo estoura no aparelho, na hora em que a tela
 * renderiza, com "Element type is invalid". Mapeando aqui, o erro vira erro de
 * TypeScript na hora de escrever o nome.
 *
 * ===========================================================================
 * ⚠️ MOTIVO 2 — O MÓDULO NÃO ESCREVE NO REGISTRO DA PLATAFORMA
 * ===========================================================================
 * O aplicativo já tem o `src/components/icon/Icon.tsx`, que é **da plataforma**.
 * Acrescentar ali os ícones que só esta peça usa faria a base carregar o catálogo
 * de cada módulo plugado — e desplugar um módulo deixaria ícones órfãos para
 * sempre. O módulo traz o dele, e o dele sai junto com ele.
 *
 * 🌳 EXPLÍCITO, NUNCA `import * as Lucide`. O curinga arrasta mais de mil ícones
 * para o pacote, porque o empacotador não tem como provar quais serão usados
 * quando o nome só se conhece em tempo de execução.
 */
const REGISTRO = {
  /** A porta do módulo e o cartão do painel. */
  dinheiro: Wallet,
  /** O campo de data da tela de lançamento. */
  calendario: CalendarDays,
  /** As setas do seletor de competência. */
  anterior: ChevronLeft,
  proximo: ChevronRight,
  /** O botão "VALORES + %" × "SÓ %". */
  ver: Eye,
  ocultar: EyeOff,
  /** Estados da tela. */
  atencao: CircleAlert,
  recarregar: RefreshCw,
  novo: Plus,
} as const;

export type NomeIconeFin = keyof typeof REGISTRO;

export interface IconeFinProps {
  nome: NomeIconeFin;
  tamanho?: number;
  cor?: string;
  traco?: number;
}

function IconeFinBase({
  nome,
  tamanho = ICONE.medio,
  cor = BRAND.primary,
  traco = 2,
}: IconeFinProps) {
  const Desenho = REGISTRO[nome];
  return <Desenho size={tamanho} color={cor} strokeWidth={traco} />;
}

export const IconeFin = memo(IconeFinBase);
export default IconeFin;
