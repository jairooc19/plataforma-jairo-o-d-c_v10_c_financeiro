/**
 * 🔑 CLIENT ID DO GOOGLE — FONTE ÚNICA (PJODC v10)
 * Local: apps/admin-web/src/lib/googleClientId.ts
 *
 * Dois lugares precisam desta mesma resposta e não podem discordar:
 * o provedor que embrulha a aplicação (GoogleAuthProvider) e a tela de login
 * por Google (`LoginGoogleView`, usada pelo Proprietário E pelo Dependente).
 * Se um achasse que há Client ID e o outro não, o botão do Google renderizaria
 * fora do contexto do provedor e quebraria em tempo de execução.
 *
 * ⚠️ ESTE COMENTÁRIO DIZIA `LoginGoogleOwnerView` ATÉ 17/09/2026 — arquivo que
 * deixou de existir em 13/09/2026, quando virou `LoginGoogleView.tsx` com a prop
 * `papel`. Comentário que aponta para arquivo inexistente manda quem lê procurar
 * o que não está lá.
 *
 * ⚠️ `process.env.NEXT_PUBLIC_*` é substituído literalmente pelo Next no build.
 * Por isso a leitura acontece aqui, uma vez, e nunca por chave dinâmica.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/**
 * Quando falso, a plataforma usa o caminho de reserva: redirecionamento OAuth
 * conduzido pelo próprio Supabase, que não depende de Client ID no navegador.
 */
export const HAS_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID.trim().length > 0;
