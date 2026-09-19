/**
 * 📍 ROTA: /financeiro/dinheiro-do-periodo (PJODC v10)
 * Local: apps/mobile-app/app/financeiro/dinheiro-do-periodo.tsx
 *
 * Só o ENDEREÇO. A tela mora em `src/modules/financeiro/`, e este arquivo existe
 * porque no Expo Router **rota é arquivo**: o que está em `app/` vira endereço, e o
 * que não está, não existe para o roteador.
 *
 * É o mesmo padrão de `app/(tabs)/perfil.tsx`, que reexporta a `ProfileScreen` — e
 * existe pelo mesmo motivo: manter a tela junto do resto do código a que ela pertence
 * (aqui, a pasta do módulo), em vez de espalhar componentes pela árvore de rotas.
 *
 * ⚠️ APAGAR ESTE ARQUIVO NÃO DEIXA A TELA ÓRFÃ — deixa a ROTA inexistente, e o
 * cartão do painel cai no "Endereço não encontrado" do `+not-found`. Foi exatamente
 * o que aconteceu com o retorno do login Google em 07/09/2026.
 */
export { default } from '@/modules/financeiro/DinheiroDoPeriodoScreen';
