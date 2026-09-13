"use client";

import { useContext } from "react";
import { CtxFinanceiro, type ContextoFinanceiro } from "./ContextoFinanceiro";

/**
 * 🏢 O CONTEXTO DA EMPRESA ATIVA, COMO AS TELAS O CONSOMEM (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/useEmpresaAtiva.ts
 *
 * ⚠️ ESTE ARQUIVO ERA A BUSCA INTEIRA ATÉ 13/09/2026, e virou uma linha. A
 * busca mudou para `ContextoFinanceiro.tsx`, que a faz UMA vez na moldura do
 * módulo; aqui ficou só a leitura. **A assinatura não mudou de propósito**: as
 * nove telas continuam escrevendo `const { pode, tenantId } = useEmpresaAtiva()`
 * sem saber que a origem do dado mudou de lugar.
 *
 * Ver `ContextoFinanceiro.tsx` para o porquê e para as advertências sobre o
 * `sessionStorage` e sobre permissão de tela não ser autorização.
 */
export function useEmpresaAtiva(): ContextoFinanceiro {
  return useContext(CtxFinanceiro);
}

export type { ContextoFinanceiro };
