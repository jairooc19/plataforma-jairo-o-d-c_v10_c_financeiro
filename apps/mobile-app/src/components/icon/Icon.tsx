import React, { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Activity,
  Building2,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  CircleUser,
  Clock,
  Database,
  Eye,
  EyeOff,
  Globe,
  House,
  Info,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Trash,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react-native';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';

/**
 * 🎯 REGISTRO ÚNICO DE ÍCONES (PJODC v10)
 * Local: apps/mobile-app/src/components/icon/Icon.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 *
 * Esta refatoração promoveu o ícone a elemento principal da interface: é ele que
 * identifica um cartão de menu antes de o rótulo ser lido. Um elemento com esse
 * peso precisa de um lugar, e este é o lugar.
 *
 * ⚠️ O `lucide-react-native@1.x` RENOMEOU BOA PARTE DO CATÁLOGO, e é a armadilha
 * que este arquivo existe para fechar. Os nomes que todo mundo conhece — e que
 * aparecem em toda documentação escrita antes da v1 — simplesmente não existem
 * mais no pacote instalado:
 *
 *   ❌ `Home`         → ✅ `House`
 *   ❌ `CheckCircle`  → ✅ `CircleCheck`
 *   ❌ `AlertCircle`  → ✅ `CircleAlert`
 *   ❌ `HelpCircle`   → ✅ `CircleQuestionMark`
 *   ❌ `UserCircle`   → ✅ `CircleUser`
 *   ❌ `BarChart3`    → ✅ `ChartColumn`
 *
 * E o modo de falhar é dos ruins: um `import { Home }` de um nome inexistente
 * não quebra o empacotamento nem acusa nada no editor — ele entrega `undefined`,
 * e o app só estoura no aparelho, no instante em que a tela renderiza, com
 * "Element type is invalid". Mapeando aqui, o erro vira erro de TypeScript na
 * hora de escrever o nome.
 *
 * 🌳 O REGISTRO É EXPLÍCITO, e não `import * as Lucide`. O curinga arrasta o
 * catálogo inteiro — mais de mil ícones — para dentro do bundle, porque o
 * empacotador não tem como provar quais serão usados quando o nome só se conhece
 * em tempo de execução. A lista abaixo importa nome a nome: entra no aplicativo
 * o que estiver escrito aqui, e mais nada.
 *
 * ➕ PARA ACRESCENTAR UM ÍCONE: importe-o no topo e acrescente a linha no
 * `REGISTRO`. O tipo `NomeIcone` se atualiza sozinho e as telas passam a aceitar
 * o nome novo — não há segunda lista para manter em sincronia.
 */
const REGISTRO = {
  // Navegação e estrutura
  Home: House,
  Painel: ChartColumn,
  Atividade: Activity,
  Tendencia: TrendingUp,
  Modulos: Package,

  // Identidade
  Usuario: User,
  Avatar: CircleUser,
  Equipe: Users,
  Empresa: Building2,

  // Ações
  Configuracoes: Settings,
  Ajustes: Sliders,
  Ferramentas: Wrench,
  Sair: LogOut,
  Energia: Power,
  Recarregar: RefreshCw,

  // Comunicação e apoio
  Suporte: MessageCircle,
  Ajuda: CircleQuestionMark,
  Informacao: Info,
  Email: Mail,

  // Estado
  Sucesso: CircleCheck,
  Erro: CircleAlert,
  Relogio: Clock,
  Banco: Database,
  Escudo: Shield,
  EscudoOk: ShieldCheck,
  Raio: Zap,

  // Localização
  Planeta: Globe,
  Local: MapPin,

  // Controles
  Avancar: ChevronRight,
  Voltar: ChevronLeft,

  /*
    ✏️ AÇÕES DE EDIÇÃO — acrescentadas na v9 para o Meu Perfil e o Painel de
    Engenharia do mobile (editar/apagar conta, gerir empresas, ajustes globais).

    ⚠️ `Apagar` É `Trash`, NÃO `Trash2`. O `Trash2` que toda documentação
    anterior à v1 cita sobrevive no pacote apenas como APELIDO (`Trash as
    Trash2`) — usar o apelido funcionaria hoje e some sem aviso na próxima
    limpeza de catálogo, exatamente como sumiram `Home` e `CheckCircle`.
  */
  Editar: Pencil,
  Apagar: Trash,
  Adicionar: Plus,
  Salvar: Save,
  Confirmar: Check,
  Restaurar: RotateCcw,
  Paleta: Palette,
  UsuarioOk: UserCheck,
  Senha: Lock,
  Ver: Eye,
  Ocultar: EyeOff,
} as const;

/** Todo nome aceito por `<Icon name="..." />`. Derivado do registro acima. */
export type NomeIcone = keyof typeof REGISTRO;

export interface IconProps {
  name: NomeIcone;
  /** Padrão: 24 (`ICONE.medio`). Use os degraus de `constants/Spacing.ts`. */
  size?: number;
  /** Padrão: o azul da marca. */
  color?: string;
  /**
   * Espessura do traço. O padrão do Lucide é 2; esta refatoração usa 2 para
   * ícone de ação e 1.75 para ícone grande de cartão — traço fino demais some
   * em tela de densidade média, grosso demais num ícone de 32pt vira mancha.
   */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 🖼️ O ÍCONE.
 *
 * ♿ ELE É INVISÍVEL PARA O LEITOR DE TELA, de propósito
 * (`accessibilityElementsHidden` / `importantForAccessibility="no-hide-
 * descendants"`). Em toda esta interface o ícone acompanha um texto que diz a
 * mesma coisa — "Configurações" ao lado da engrenagem. Deixá-lo acessível faria
 * o VoiceOver anunciar o item duas vezes, e a segunda sem sentido nenhum
 * ("imagem"). Ícone que anda sozinho recebe `accessibilityLabel` de quem o
 * contém, que é o botão — ver `Button.tsx`.
 */
function IconeBase({
  name,
  size = ICONE.medio,
  color = BRAND.primary,
  strokeWidth = 2,
  style,
}: IconProps) {
  const Desenho = REGISTRO[name];

  return (
    <Desenho
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export const Icon = memo(IconeBase);
export default Icon;
