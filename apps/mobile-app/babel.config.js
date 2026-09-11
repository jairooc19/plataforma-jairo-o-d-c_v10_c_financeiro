module.exports = function (api) {
  api.cache(true);
  return {
    /**
     * ⚠️ O PLUGIN DO REANIMATED NÃO ENTRA AQUI.
     * O `babel-preset-expo` já injeta `react-native-worklets/plugin` sozinho
     * quando o pacote está instalado (ver `babel-preset-expo/build/configs/expo.js`).
     * Declará-lo de novo o aplicaria DUAS VEZES sobre o mesmo código — o
     * transform de worklets roda em cima do que ele próprio já gerou, e as
     * animações passam a falhar em tempo de execução sem erro de compilação.
     *
     * `react-native-reanimated/plugin` é apenas um re-export do plugin de
     * worklets, então repeti-lo por aquele nome dá exatamente o mesmo problema.
     */
    presets: ['babel-preset-expo'],
  };
};
