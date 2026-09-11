import { BRAND, BRAND_DARK, PLATFORM, elevacao, type PlatformTokens } from '@/constants/Colors';

export interface Theme {
  // Marca — idêntica nas duas plataformas (ver o cabeçalho de Colors.ts).
  primary: string;
  primarySoft: string;
  primaryEdge: string;
  onPrimary: string;
  secondary: string;

  background: string;
  surface: string;
  border: string;
  borderSoft: string;

  text: string;
  textMuted: string;
  textFaint: string;
  textStrong: string;

  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;
  warning: string;
  warningSoft: string;

  /** Acento do SISTEMA: #007AFF no iOS, #2196F3 no Android. */
  accent: string;
  /** Vermelho de ação destrutiva, na convenção da plataforma. */
  destructive: string;

  /** Raios, alturas, fonte mono e comportamento de teclado da plataforma. */
  tokens: PlatformTokens;
  /** Sombra (iOS) ou elevation (Android), já resolvida. */
  elevacao: typeof elevacao;
  /** Paleta do Painel de Engenharia — a única tela de fundo escuro. */
  dark: typeof BRAND_DARK;
}

/**
 * 🎨 O TEMA, PRONTO PARA CONSUMO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useTheme.ts
 *
 * Porta única entre `constants/Colors.ts` e os componentes. Nenhuma tela importa
 * `BRAND` direto: importa este hook. A indireção parece burocracia até o dia em
 * que o tema precisar variar em tempo de execução — o white-label desta
 * plataforma JÁ guarda cores no banco (`global_settings.color_bg_general`, que
 * o `app/_layout.tsx` lê). No dia em que essas cores mandarem de verdade, o
 * `Provider` entra AQUI DENTRO e nenhum componente muda.
 *
 * ⚠️ O OBJETO É CONGELADO NO MÓDULO, e não montado a cada chamada. Sendo hoje
 * um valor constante, recriá-lo por render daria a cada componente uma
 * referência nova de `theme` — e todo `useMemo([theme])` ou `React.memo` que
 * dependesse dele recalcularia sempre, que é o oposto do que a fase de
 * performance quer.
 *
 * 🌑 `dark` não é "modo escuro do app". É a identidade do `DeveloperDashboard`,
 * a única tela de fundo escuro da plataforma. Não confunda os dois: acrescentar
 * um modo escuro de verdade significaria alternar TODO o objeto, não ler o campo
 * `dark`.
 */
const TEMA: Theme = Object.freeze({
  primary: BRAND.primary,
  primarySoft: BRAND.primarySoft,
  primaryEdge: BRAND.primaryEdge,
  onPrimary: BRAND.onPrimary,
  secondary: BRAND.textMuted,

  background: BRAND.background,
  surface: BRAND.surface,
  border: BRAND.border,
  borderSoft: BRAND.borderSoft,

  text: BRAND.text,
  textMuted: BRAND.textMuted,
  textFaint: BRAND.textFaint,
  textStrong: BRAND.textStrong,

  success: BRAND.success,
  successSoft: BRAND.successSoft,
  error: BRAND.error,
  errorSoft: BRAND.errorSoft,
  warning: BRAND.warning,
  warningSoft: BRAND.warningSoft,

  accent: PLATFORM.accent,
  destructive: PLATFORM.destructive,

  tokens: PLATFORM,
  elevacao,
  dark: BRAND_DARK,
});

export function useTheme(): Theme {
  return TEMA;
}
