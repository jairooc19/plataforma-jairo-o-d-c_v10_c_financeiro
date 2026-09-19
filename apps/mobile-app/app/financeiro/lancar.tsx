/**
 * 📍 ROTA: /financeiro/lancar (PJODC v10)
 * Local: apps/mobile-app/app/financeiro/lancar.tsx
 *
 * Só o ENDEREÇO. A tela mora em `src/modules/financeiro/LancarScreen.tsx`.
 *
 * Recebe dois parâmetros pela URL — `conta` e `competencia` —, exatamente como a
 * tela equivalente do site. Quem os passa é o toque numa conta do DINHEIRO DO
 * PERÍODO; abrir este endereço sem `conta` cai num recado explicando isso, em vez
 * de num formulário que não teria onde gravar.
 */
export { default } from '@/modules/financeiro/LancarScreen';
