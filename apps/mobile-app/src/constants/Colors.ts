import { Platform } from 'react-native';

/**
 * 🎨 FONTE ÚNICA DE COR E FORMA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/constants/Colors.ts
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Paleta repintada no padrão de aplicativo de transporte (Uber-like)
 * - Superfície branca pura, fundo cinza de um degrau, azul-marinho de marca
 *
 * ⚖️ A DECISÃO CENTRAL DESTE ARQUIVO: existem DUAS famílias de cor, e confundi-las
 * é o erro que ele previne.
 *
 *   MARCA (`BRAND`)  → é a identidade do produto. É a MESMA no iOS e no Android.
 *                      Um botão "ENTRAR" azul-marca no iPhone e azul-Material no
 *                      Android seriam dois produtos diferentes para o mesmo
 *                      usuário, que troca de aparelho e não reconhece o app.
 *
 *   SISTEMA (`PLATFORM`) → é a convenção da plataforma. Aqui SIM o iOS e o Android
 *                      divergem, porque divergem para todos os apps do aparelho:
 *                      o azul de link do iOS é #007AFF, o do Material é #2196F3.
 *                      Imitar a plataforma nesses pontos é o que faz o app
 *                      parecer nativo; imitá-la na marca é o que o faz parecer
 *                      genérico.
 *
 * ⚠️ A MARCA DO MOBILE DIVERGIU DA DO `admin-web` NESTA REFATORAÇÃO, por decisão
 * explícita do dono do projeto (2026-09-06). O app passou a `#2c5282`
 * (azul-marinho) e a web permaneceu em `#1d4ed8` (blue-700). Até a web ser
 * alinhada, as duas pontas do mesmo produto mostram azuis diferentes — quem for
 * unificar troca `BRAND.primary` aqui e a referência de
 * `apps/admin-web/src/app/dashboard/settings/page.tsx`.
 *
 * ⚠️ NUNCA escreva um hexadecimal solto num `StyleSheet.create`. Se a cor que
 * você precisa não existe aqui, ela nasce aqui — é assim que a próxima troca de
 * identidade visual continua sendo um arquivo, e não uma caçada por literais
 * espalhados.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MARCA — idêntica nas duas plataformas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paleta de aplicativo nativo: azul-marinho de marca sobre neutros quase
 * acromáticos.
 *
 * 🎯 O FUNDO É CINZA DE UM DEGRAU SÓ (#f5f5f5), E ISSO É DELIBERADO. Aplicativos
 * de transporte e entrega põem o conteúdo em cartões BRANCOS sobre um cinza
 * quase imperceptível — a separação vem da SOMBRA, não do contraste de fundo.
 * Um fundo mais escuro exigiria cartões com borda para não sumirem, e borda
 * desenhada em cartão é justamente o que faz uma tela parecer página HTML.
 */
export const BRAND = {
  primary: '#2c5282',      // azul-marinho — botões, títulos, ícone ativo
  primaryLight: '#64b5f6', // azul claro   — foco, realce, série secundária
  primaryDark: '#1a365d',  // azul fundo   — estado pressionado
  primarySoft: '#ebf2fa',  // tinta ~8%    — fundo de destaque e de ícone
  primaryEdge: '#d6e4f2',  // tinta ~20%   — borda de destaque

  background: '#f5f5f5',   // o cinza sob os cartões
  surface: '#ffffff',      // branco puro — todo cartão e toda barra
  surfaceVariant: '#f5f5f5',
  border: '#e0e0e0',
  borderSoft: '#eeeeee',
  divider: '#eeeeee',

  text: '#1c1c1c',         // quase preto: o preto puro vibra em tela OLED
  textStrong: '#000000',
  textMuted: '#757575',
  textFaint: '#bdbdbd',
  onPrimary: '#ffffff',

  success: '#4caf50',
  successSoft: '#e8f5e9',
  error: '#f44336',
  errorSoft: '#ffebee',
  warning: '#ff9800',
  warningSoft: '#fff3e0',
  info: '#2196f3',
  infoSoft: '#e3f2fd',
} as const;

/**
 * 🌑 TEMA ESCURO DO PAINEL DE ENGENHARIA.
 * Não é um "modo escuro" do app — é a identidade própria de uma tela só, o
 * `DeveloperDashboard`. Fica aqui porque as cores dele estavam soltas no
 * `StyleSheet`, que é exatamente o que este arquivo existe para impedir.
 *
 * 🪜 AS SUPERFÍCIES SÃO TRÊS, e não duas, desde esta refatoração: o painel
 * técnico passou a empilhar cartão dentro de cartão (métrica dentro do bloco de
 * infraestrutura). No escuro, profundidade não se lê por sombra — sombra preta
 * sobre fundo preto não existe. Lê-se por superfície mais clara, que é como o
 * Material 3 resolve o mesmo problema.
 */
export const BRAND_DARK = {
  background: '#121212',   // superfície 0 do Material 3
  surface: '#1e1e1e',      // superfície 1: o cartão sobre o fundo
  surfaceHigh: '#272727',  // superfície 2: o cartão dentro do cartão
  border: '#2f2f2f',
  borderDanger: '#4a1512',

  text: '#f5f5f5',
  textMuted: '#9e9e9e',
  textFaint: '#616161',
  textGhost: '#424242',

  accent: '#64b5f6',       // o azul da marca, clareado para vencer o fundo
  online: '#4caf50',
  offline: '#f44336',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA — aqui, e só aqui, iOS e Android divergem
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contrato dos tokens de plataforma.
 *
 * ⚠️ ELE PRECISA SER DECLARADO ANTES DOS DOIS OBJETOS, e os dois precisam ser
 * anotados com ele. Sem a anotação, o TypeScript infere o tipo do PRIMEIRO ramo
 * do `Platform.select` a partir dos literais (`accent: '#007AFF'`, não `string`)
 * e passa a recusar o segundo ramo: "'#2196F3' não é atribuível a '#007AFF'".
 * A interface é o que diz que os dois são a MESMA forma com valores diferentes.
 */
export interface PlatformTokens {
  accent: string;
  surfaceGrouped: string;
  systemText: string;
  destructive: string;
  separator: string;
  radiusCard: number;
  radiusControl: number;
  radiusField: number;
  /** Estratégia do `KeyboardAvoidingView` — diferente por plataforma de fato. */
  keyboardBehavior: 'padding' | 'height';
  monoFont: string;
  tabBarHeight: number;
  tabBarPaddingBottom: number;
}

/**
 * Convenções nativas do iOS (Human Interface Guidelines).
 *
 * 📐 OS RAIOS ENCOLHERAM NESTA REFATORAÇÃO. Cartões de 28pt pertencem a folhas
 * modais do iOS, não a cartões de conteúdo empilhados numa lista — ali o canto
 * generoso rouba área útil da linha e faz um cartão de texto parecer um balão de
 * conversa. O iOS continua um degrau acima do Material, que é a diferença que
 * de fato existe entre as duas convenções.
 */
const IOS: PlatformTokens = {
  accent: '#007AFF',            // systemBlue
  surfaceGrouped: '#f2f2f7',    // systemGroupedBackground
  systemText: '#000000',        // label
  destructive: '#FF3B30',       // systemRed
  separator: '#c6c6c8',
  radiusCard: 16,
  radiusControl: 12,
  radiusField: 10,
  keyboardBehavior: 'padding' as const,
  monoFont: 'Courier',
  tabBarHeight: 88,
  tabBarPaddingBottom: 30,
};

/** Convenções nativas do Android (Material Design 3). */
const ANDROID: PlatformTokens = {
  accent: '#2196F3',            // Material Blue 500
  surfaceGrouped: '#ffffff',
  systemText: '#333333',
  destructive: '#B3261E',       // M3 error
  separator: '#e0e0e0',
  radiusCard: 12,
  radiusControl: 10,
  radiusField: 8,
  keyboardBehavior: 'height' as const,
  monoFont: 'monospace',
  tabBarHeight: 65,
  tabBarPaddingBottom: 10,
};

/**
 * 🤖 RESOLVE OS TOKENS DA PLATAFORMA ATUAL, uma vez, no carregamento do módulo.
 *
 * `Platform.OS` não muda durante a vida do processo, então resolver por chamada
 * seria desperdício. `Platform.select` cobre o `web` com o ramo do Android
 * (Material é a convenção do Chrome/Android e o `react-native-web` não tem
 * convenção própria).
 */
export const PLATFORM: PlatformTokens = Platform.select({
  ios: IOS,
  default: ANDROID,
});

/**
 * 🎯 A FUNÇÃO QUE O PROMPT PEDE, com uma diferença deliberada: ela resolve
 * tokens de SISTEMA, não de marca.
 *
 * Pedir `getColorByPlatform('primary')` devolve o azul da MARCA nas duas
 * plataformas — porque a marca não é negociável. Pedir `'accent'` devolve
 * #007AFF no iOS e #2196F3 no Android, que é onde a diferença de plataforma
 * genuinamente pertence.
 *
 * @example
 *   getColorByPlatform('accent')      // '#007AFF' no iOS, '#2196F3' no Android
 *   getColorByPlatform('primary')     // '#2c5282' sempre — é a marca
 *   getColorByPlatform('background')  // '#f2f2f7' no iOS, '#ffffff' no Android
 */
export type ColorName =
  | 'primary' | 'primarySoft' | 'onPrimary'
  | 'background' | 'surface' | 'border'
  | 'text' | 'textMuted'
  | 'success' | 'error' | 'warning'
  | 'accent' | 'destructive' | 'separator';

export function getColorByPlatform(colorName: ColorName): string {
  switch (colorName) {
    // Sistema: divergem por plataforma.
    case 'accent':
      return PLATFORM.accent;
    case 'destructive':
      return PLATFORM.destructive;
    case 'separator':
      return PLATFORM.separator;
    case 'background':
      return PLATFORM.surfaceGrouped;

    // Marca: idênticas nas duas plataformas, por decisão de identidade.
    case 'primary':
      return BRAND.primary;
    case 'primarySoft':
      return BRAND.primarySoft;
    case 'onPrimary':
      return BRAND.onPrimary;
    case 'surface':
      return BRAND.surface;
    case 'border':
      return BRAND.border;
    case 'text':
      return BRAND.text;
    case 'textMuted':
      return BRAND.textMuted;
    case 'success':
      return BRAND.success;
    case 'error':
      return BRAND.error;
    case 'warning':
      return BRAND.warning;
  }
}

/**
 * 🌓 SOMBRA QUE FUNCIONA NAS DUAS PLATAFORMAS.
 *
 * iOS desenha sombra por `shadow*`; Android por `elevation` — e ignora
 * `shadowRadius` por completo. Declarar só um dos dois deixa metade dos
 * aparelhos com o cartão chapado, sem que ninguém perceba até ver o outro.
 *
 * 📊 OS QUATRO NÍVEIS, e quando cada um se usa:
 *   1 → repouso: cartão de leitura, campo elevado
 *   2 → cartão TOCÁVEL (`MenuCard`) — o padrão desta refatoração
 *   3 → algo que flutua sobre outro conteúdo (folha, modal)
 *   4 → elemento pressionado ou arrastado
 *
 * ⚠️ O NÍVEL 4 EXISTE PARA O ESTADO PRESSIONADO, e é por isso que ele é mais
 * forte, não mais fraco. A intuição diz "afundou, logo some a sombra"; o
 * Material diz o contrário — o dedo LEVANTA o cartão em direção a ele. Trocar
 * os dois faz o toque parecer um bug de renderização.
 */
export function elevacao(nivel: 1 | 2 | 3 | 4) {
  const mapa = {
    1: { raio: 6, opacidade: 0.06, altura: 1, elevation: 1 },
    2: { raio: 10, opacidade: 0.08, altura: 2, elevation: 2 },
    3: { raio: 16, opacidade: 0.1, altura: 4, elevation: 4 },
    4: { raio: 22, opacidade: 0.14, altura: 8, elevation: 8 },
  }[nivel];

  return Platform.select({
    ios: {
      shadowColor: BRAND.textStrong,
      shadowOpacity: mapa.opacidade,
      shadowRadius: mapa.raio,
      shadowOffset: { width: 0, height: mapa.altura },
    },
    default: { elevation: mapa.elevation },
  });
}
