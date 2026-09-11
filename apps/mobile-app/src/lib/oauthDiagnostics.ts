/**
 * 🩺 DIAGNÓSTICO DO OAUTH — os DOIS endereços, lado a lado (PJODC v10)
 * Local: apps/mobile-app/src/lib/oauthDiagnostics.ts
 *
 * ESTE ARQUIVO EXISTE POR CAUSA DE UM ERRO QUE CUSTOU SEIS RODADAS DE DEPURAÇÃO
 * (2026-09-07). O `redirect_uri_mismatch` do Google foi lido como "a URI do app
 * está errada", e a URI do app foi cadastrada no Google Console quatro vezes, de
 * quatro formas. Nenhuma podia funcionar: **o Google nunca recebe a URI do app.**
 *
 * 🔀 SÃO DOIS ENDEREÇOS DIFERENTES, EM DOIS PAINÉIS DIFERENTES:
 *
 *   1) `callbackDoSupabase()` → GOOGLE CLOUD CONSOLE
 *      APIs e Serviços > Credenciais > (o OAuth client) > URIs de redirecionamento
 *      autorizados. É ESTE o valor que o Supabase envia ao Google como
 *      `redirect_uri`, e é a única coisa que o Google confere.
 *
 *   2) `montarRedirectUri()` → PAINEL DO SUPABASE
 *      Authentication > URL Configuration > Redirect URLs. O Supabase só usa
 *      este valor DEPOIS que o Google já devolveu o usuário para ele.
 *
 * Trocar os dois de lugar dá exatamente o sintoma observado: a web (que usa o
 * popup, e portanto "Origens JavaScript autorizadas") funciona, e o mobile (que
 * usa o redirecionamento, e portanto "URIs de redirecionamento") leva 400.
 */

/**
 * Endereço que o Supabase apresenta ao Google. Derivado da URL do projeto —
 * não é configurável e não deve ser digitado à mão em lugar nenhum do código.
 */
export function callbackDoSupabase(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return base ? `${base.replace(/\/+$/, '')}/auth/v1/callback` : '(EXPO_PUBLIC_SUPABASE_URL ausente)';
}

/**
 * Imprime os dois endereços no Metro, com o painel de destino ao lado de cada
 * um. Só em `__DEV__`: num build de produção os valores já estão cadastrados e
 * o log seria só ruído.
 */
export function registrarDiagnosticoOAuth(redirectUri: string): void {
  if (!__DEV__) return;

  console.log(
    [
      '',
      '┌─ 🩺 OAUTH GOOGLE — CONFERÊNCIA DE CADASTRO ─────────────────────',
      '│ 1) GOOGLE CLOUD CONSOLE > Credenciais > URIs de redirecionamento:',
      `│    ${callbackDoSupabase()}`,
      '│',
      '│ 2) SUPABASE > Authentication > URL Configuration > Redirect URLs:',
      `│    ${redirectUri}`,
      '│',
      '│ ⚠️  Não troque os dois de lugar. O Google NUNCA recebe o exp://.',
      '└──────────────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}
