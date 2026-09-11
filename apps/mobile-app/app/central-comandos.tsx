import CommandCenterScreen from '@/screens/admin/CommandCenterScreen';

/**
 * 🛰️ ROTA: CENTRAL DE COMANDOS (PJODC v10)
 * Local: apps/mobile-app/app/central-comandos.tsx
 *
 * Destino empilhado, aberto por um `MenuCard` do Painel de Engenharia e fechado
 * pelo botão voltar — como `sobre.tsx` e `suporte.tsx`.
 *
 * ⚠️ FICA FORA DE `(tabs)/`. Um arquivo dentro do grupo vira candidato a aba: o
 * `NativeTabs` monta um gatilho por rota do grupo, e esta tela apareceria na
 * barra inferior de todo mundo — inclusive de quem não é Desenvolvedor.
 *
 * 🔐 A PROTEÇÃO NÃO ESTÁ AQUI, E NÃO PODE ESTAR. Esconder a rota não é controle
 * de acesso: o papel vem do cofre do aparelho, gravável por quem tem o aparelho.
 * Quem protege é o servidor — e, hoje, as rotas `/api/admin/*` do admin-web NÃO
 * têm autenticação, exatamente como as demais `/api` deste projeto. Está
 * registrado como risco conhecido no CLAUDE.md.
 */
export default CommandCenterScreen;
