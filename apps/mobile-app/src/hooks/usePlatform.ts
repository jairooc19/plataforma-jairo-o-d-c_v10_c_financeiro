import { Platform } from 'react-native';
import { PLATFORM, type PlatformTokens } from '@/constants/Colors';

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  /** Tokens nativos já resolvidos (raios, alturas, fonte mono, teclado). */
  tokens: PlatformTokens;
}

/**
 * 🤖 QUAL PLATAFORMA ESTÁ RODANDO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/usePlatform.ts
 *
 * Encapsula `Platform.OS` para que nenhuma tela precise repetir a comparação de
 * string. Ler `isIOS` diz o que a condição significa; ler `Platform.OS === 'ios'`
 * pela décima vez não diz nada além de que alguém comparou uma string.
 *
 * ⚠️ O VALOR É CONSTANTE DURANTE TODA A VIDA DO PROCESSO — o aparelho não troca
 * de sistema operacional no meio da sessão. Por isso o objeto é congelado no
 * nível do módulo e o hook apenas o devolve: sem `useState`, sem `useMemo`, sem
 * dependência. Um `useMemo` aqui custaria mais do que o objeto que ele evitaria
 * recriar.
 *
 * 🧰 `tokens` vem junto porque quase toda pergunta "é iOS?" existe para escolher
 * um valor logo em seguida. Devolver os dois evita o par
 * `const { isIOS } = usePlatform(); const raio = isIOS ? 28 : 16;` — que é
 * justamente o hardcoding por plataforma que o CLAUDE.md proíbe.
 */
const INFO: PlatformInfo = Object.freeze({
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  tokens: PLATFORM,
});

export function usePlatform(): PlatformInfo {
  return INFO;
}
