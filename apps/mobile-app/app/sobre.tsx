/**
 * ROTA: SOBRE (PJODC v10)
 * Local: apps/mobile-app/app/sobre.tsx
 *
 * v9: [100% NATIVO - ROTA]
 *
 * ARQUIVO DE UMA LINHA UTIL, DE PROPOSITO. No Expo Router quem define a rota e
 * o CAMINHO do arquivo, nao o conteudo dele. A tela mora em
 * `src/screens/AboutScreen.tsx` e aqui so se declara "esta rota e aquela tela".
 *
 * FORA DE `(tabs)`, E ISSO E DELIBERADO. Um arquivo dentro de `(tabs)/` vira
 * candidato a aba: o NativeTabs monta um gatilho para cada rota do grupo, e a
 * tela apareceria na barra inferior. Sobre e Suporte sao destinos EMPILHADOS,
 * alcancados por toque num cartao e fechados pelo botao voltar - o mesmo lugar
 * de `modal.tsx`.
 */
export { default } from '@/screens/AboutScreen';
