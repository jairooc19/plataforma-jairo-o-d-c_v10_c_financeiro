/**
 * 📍 ROTA: /financeiro/meus-lancamentos (PJODC v10)
 * Local: apps/mobile-app/app/financeiro/meus-lancamentos.tsx
 *
 * Só o ENDEREÇO. A tela mora em `src/modules/financeiro/MeusLancamentosScreen.tsx`.
 *
 * Recebe `competencia` pela URL — quem a passa é o botão do DINHEIRO DO PERÍODO,
 * para a lista abrir no MESMO mês que a pessoa está olhando. Sem o parâmetro,
 * cai na competência atual.
 */
export { default } from '@/modules/financeiro/MeusLancamentosScreen';
