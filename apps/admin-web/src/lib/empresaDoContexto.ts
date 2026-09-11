import type { ContextoMembro, EmpresaEmbutida } from "@/types/plataforma";

/**
 * 🏢 A EMPRESA DE UM CONTEXTO DE MEMBRO, VENHA ELA COMO FOR (PJODC v10)
 * Local: apps/admin-web/src/lib/empresaDoContexto.ts
 *
 * Um arquivo, uma função. O embed `tenants` do PostgREST chega ora como objeto,
 * ora como array de um elemento — e o dashboard precisa do mesmo campo nos dois
 * casos.
 *
 * Este achatamento já existia, copiado em dois lugares (`DashboardHeader` e o
 * orquestrador do dashboard), cada um com o seu `Array.isArray` e um
 * `as any` no fim para calar o TypeScript. Agora é uma função só, e o `as any`
 * some junto: quem devolve `EmpresaEmbutida | undefined` não precisa mentir
 * sobre o tipo.
 */
export function empresaDoContexto(
  contexto: ContextoMembro | null | undefined
): EmpresaEmbutida | undefined {
  const empresa = contexto?.tenants;
  if (!empresa) return undefined;
  return Array.isArray(empresa) ? empresa[0] : empresa;
}
