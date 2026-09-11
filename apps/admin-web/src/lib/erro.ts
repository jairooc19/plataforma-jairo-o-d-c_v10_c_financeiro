/**
 * 🧯 MENSAGEM DE ERRO A PARTIR DE UM `unknown` (PJODC v10)
 * Local: apps/admin-web/src/lib/erro.ts
 *
 * Um arquivo, uma função — o `catch` do TypeScript entrega `unknown`, e quase
 * toda tela e rota desta aplicação precisa da mesma coisa: o texto legível de
 * dentro dele.
 *
 * ⚠️ ISTO SUBSTITUI `catch (error: any)`, e a diferença não é cosmética.
 * Com `any`, `error.message` compila mesmo quando o que foi lançado é uma
 * string, um objeto do PostgREST ou `undefined` — e aí `error.message` é
 * `undefined` em produção, entregando "undefined" ao usuário ou estourando um
 * `TypeError` dentro do próprio `catch`, que ninguém captura. A checagem aqui
 * é a que o `any` desligava.
 *
 * 🔎 A ORDEM DOS TESTES IMPORTA. `Error` vem primeiro por ser o caso comum;
 * o objeto com `message` cobre o PostgREST e o GoTrue, que rejeitam com objeto
 * simples (`{ message, code, details }`) e NÃO com uma instância de `Error` —
 * testar só `instanceof Error` deixaria justamente os erros do Supabase de fora.
 */
export function mensagemDeErro(erro: unknown, padrao = 'Erro inesperado.'): string {
  if (erro instanceof Error && erro.message) return erro.message;

  if (typeof erro === 'string' && erro.trim()) return erro;

  if (
    typeof erro === 'object' &&
    erro !== null &&
    'message' in erro &&
    typeof (erro as { message: unknown }).message === 'string' &&
    (erro as { message: string }).message
  ) {
    return (erro as { message: string }).message;
  }

  return padrao;
}
