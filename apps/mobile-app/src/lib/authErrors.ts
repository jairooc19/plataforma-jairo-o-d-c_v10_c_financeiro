/**
 * 🌍 TRADUÇÃO DAS FALHAS DO GOTRUE (PJODC v10)
 * Local: apps/mobile-app/src/lib/authErrors.ts
 *
 * O Supabase responde em inglês e em jargão. "Invalid login credentials" não
 * diz ao usuário o que fazer; "Usuário ou senha inválidos." diz.
 *
 * ⚠️ ISTO É UMA TERCEIRA CÓPIA DO MESMO MAPA. As outras duas vivem em
 * `apps/admin-web/src/app/auth/actions.ts` (login por senha) e em
 * `packages/core/src/services/platform/googleAuthService.ts` (erros do Google).
 * O lugar certo para as três é o Core — traduzir erro de autenticação é regra
 * de plataforma, não de tela, e a regra de ouro do CLAUDE.md manda toda
 * inteligência nascer no `@jairo/core`.
 *
 * Não unifiquei agora porque a tarefa era sincronizar o mobile: mexer no mapa
 * da web significaria alterar uma Server Action já testada, fora do escopo
 * pedido. Fica registrado como o próximo passo óbvio — quando alguém acrescentar
 * uma tradução, vai ter de lembrar de fazê-lo em três lugares, e é exatamente
 * assim que os três divergem.
 */

const ERROS_TRADUZIDOS: Record<string, string> = {
  'Invalid login credentials': 'Usuário ou senha inválidos.',
  'Email not confirmed': 'E-mail ainda não confirmado.',
  'User already registered': 'Este e-mail já está registrado.',
  'Password should be at least 6 characters': 'Senha: mín. 6 caracteres.',
  'Invalid email': 'E-mail inválido.',
};

/**
 * Devolve a mensagem em português quando conhecemos o erro, e a original quando
 * não — mostrar o texto cru é melhor do que engolir a falha num "erro
 * inesperado" genérico, que não dá ao usuário nem a nós nada para investigar.
 */
export function traduzirErroAuth(mensagem: string | undefined | null): string {
  if (!mensagem) return 'Erro inesperado na autenticação.';
  return ERROS_TRADUZIDOS[mensagem] || mensagem;
}
