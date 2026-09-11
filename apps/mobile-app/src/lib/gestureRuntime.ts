import { TurboModuleRegistry } from 'react-native';

/**
 * ✋ FONTE ÚNICA: "ESTE APARELHO TEM GESTOS NATIVOS?" (PJODC v10)
 * Local: apps/mobile-app/src/lib/gestureRuntime.ts
 *
 * v9: [OTIMIZADO PARA MÁXIMA PERFORMANCE]
 * - Gesture Handler: ativado em development e production builds
 * - Expo Go: comutado para o caminho sem gestos, sem quebrar o arranque
 *
 * ⚠️ ESTE ARQUIVO EXISTE PORQUE **NÃO HÁ FALLBACK AUTOMÁTICO**. É tentador
 * imaginar que o `react-native-gesture-handler` "vira um View" quando o módulo
 * nativo falta — ele não vira. Um `import { GestureHandlerRootView } from
 * 'react-native-gesture-handler'` no topo de um arquivo mata o app no arranque
 * dentro do Expo Go, antes de qualquer tela nascer. Foi por isso que a v8
 * arrancou os imports em vez de protegê-los: o erro acontece na AVALIAÇÃO do
 * módulo, e nenhum `try` em volta do JSX chega a tempo.
 *
 * 🎯 ONDE EXATAMENTE ELE QUEBRA — vale saber, porque é isso que a checagem
 * abaixo persegue. Duas linhas, nesta ordem:
 *
 *   1. `specs/NativeRNGestureHandlerModule.ts` termina em
 *      `TurboModuleRegistry.getEnforcing('RNGestureHandlerModule')`. O
 *      `getEnforcing` LANÇA quando o módulo não está registrado.
 *   2. `v3/NativeProxy.ts` faz, no nível do módulo,
 *      `const { flushOperations, updateGestureHandlerConfig } = RNGestureHandlerModule;`
 *      Se o runtime registrar um módulo ANTIGO, sem essas funções, o
 *      destructuring passa liso e o estouro só aparece depois, no primeiro
 *      gesto, como `undefined is not a function` — o sintoma que a v8 relatou.
 *
 * 🔬 POR ISSO A DETECÇÃO PERGUNTA PELO MÓDULO NATIVO, E NÃO PELO AMBIENTE.
 * A tentação era usar `Constants.executionEnvironment === 'storeClient'` do
 * `expo-constants`, e ela seria um erro: nessa versão do SDK, `storeClient`
 * significa "Expo Go **ou** development build com expo-dev-client" — os dois
 * ambientes que precisamos DISTINGUIR caem no mesmo valor. Os gestos ficariam
 * desligados justamente no dev build onde eles deveriam funcionar.
 * `TurboModuleRegistry.get` responde à pergunta de verdade: o lado nativo está
 * aqui? E `get` (ao contrário de `getEnforcing`) devolve `null` em vez de lançar.
 *
 * 🌐 NA WEB O RESULTADO É `false`, e está certo assim. O alvo desta plataforma
 * é o aparelho; a folha do `SearchableSelect` continua fechando por toque fora,
 * pelo botão "Fechar" e pelo voltar do Android nos dois caminhos.
 *
 * 🔑 O CARREGAMENTO É POR `require()` PREGUIÇOSO, NÃO POR `import`. Um `import`
 * estático é içado para o topo e avaliado sempre, em todo ambiente. Um
 * `require()` dentro de uma função só avalia o módulo quando a função roda — e
 * aqui ela só roda se a checagem acima passou. O Metro continua EMPACOTANDO a
 * biblioteca (a string é literal e ele a resolve estaticamente); o que muda é
 * que o código dela nunca é executado onde quebraria.
 *
 * 📐 `import type` É SEGURO e não desfaz nada disso: o TypeScript o apaga na
 * compilação, então não sobra `require` nenhum no bundle. É assim que este
 * arquivo fica 100% tipado sem tocar no módulo em tempo de execução.
 */

/** Módulo do gesture-handler, carregado no máximo uma vez. */
type ModuloGestos = typeof import('react-native-gesture-handler');

/** As funções que a v3 exige do lado nativo. Faltando uma, não há gesto. */
const FUNCOES_V3 = [
  'flushOperations',
  'updateGestureHandlerConfig',
  'installUIRuntimeBindings',
] as const;

function detectarModuloNativo(): boolean {
  try {
    const nativo = TurboModuleRegistry.get<Record<string, unknown>>(
      'RNGestureHandlerModule'
    );
    if (!nativo) return false;

    // Presença não basta: um módulo da era v2 responde ao nome e não tem as
    // funções que o `NativeProxy` da v3 chama. Ver o item 2 do cabeçalho.
    return FUNCOES_V3.every((fn) => typeof nativo[fn] === 'function');
  } catch {
    return false;
  }
}

/**
 * ✅ O aparelho consegue rodar `react-native-gesture-handler`?
 *
 * Constante de módulo, e não função: o lado nativo não aparece no meio da
 * execução do app, e resolvê-la uma vez evita repetir a sondagem a cada render.
 */
export const GESTOS_NATIVOS: boolean = detectarModuloNativo();

/** Cache do `require`, para não repetir a resolução do módulo a cada chamada. */
let moduloCarregado: ModuloGestos | null = null;

/**
 * 📦 Devolve o gesture-handler, ou `null` quando ele não pode ser usado.
 *
 * ⚠️ NUNCA transforme isto num `import` estático "porque é mais limpo". A
 * feiura do `require` é a única coisa que segura a avaliação do módulo.
 *
 * O `try/catch` é a terceira rede, depois da sondagem e do cache: cobre o caso
 * de a biblioteca estar no `package.json` com o módulo nativo não compilado
 * (acontece ao trocar de perfil de build sem `prebuild`). Aí o app cai no
 * caminho sem gestos em vez de morrer.
 */
export function carregarGestos(): ModuloGestos | null {
  if (!GESTOS_NATIVOS) return null;
  if (moduloCarregado) return moduloCarregado;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduloCarregado = require('react-native-gesture-handler') as ModuloGestos;
    return moduloCarregado;
  } catch (e) {
    console.warn(
      '[GESTOS] react-native-gesture-handler indisponível; seguindo sem gestos.',
      e
    );
    return null;
  }
}
