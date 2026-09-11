/**
 * 👤 ROTA: MEU PERFIL (PJODC v10)
 * Local: apps/mobile-app/app/(tabs)/perfil.tsx
 *
 * v9: [100% NATIVO — ROTA]
 * - Segunda aba da barra nativa do sistema
 *
 * 📄 ARQUIVO DE UMA LINHA ÚTIL, DE PROPÓSITO. No Expo Router quem define a rota
 * é o CAMINHO do arquivo, não o conteúdo dele. A tela mora em
 * `src/screens/ProfileScreen.tsx` e aqui só se declara "esta rota é aquela
 * tela" — do mesmo jeito que `(tabs)/index.tsx` separa o endereço do que é
 * exibido. Escrever a tela dentro de `app/` misturaria roteamento com
 * interface e deixaria o componente inalcançável para qualquer outra rota.
 *
 * 🙈 A ABA NÃO APARECE PARA O DESENVOLVEDOR. Quem a esconde é o
 * `(tabs)/_layout.tsx`, via `hidden` do gatilho — a rota continua existindo,
 * só não ganha lugar na barra. A própria tela repete a checagem, para o caso
 * de alguém chegar pelo endereço direto.
 */
export { default } from '@/screens/ProfileScreen';
