"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cadastroFinanceiroService, dashboardFinanceiroService,
  type ContaIdentificadora, type LinhaDoExtratoIdentificadora,
} from "@jairo/core";
import { useEmpresaAtiva } from "../useEmpresaAtiva";

/**
 * 🧠 O CÉREBRO DA CONFERÊNCIA DA CONTA IDENTIFICADORA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/conferencia/useConferenciaIdentificadora.ts
 *
 * Nos moldes de `useConferencia.ts`, sem o modo somado — a tela do dashboard 2
 * explica por que a linha de TOTAL não abre nada lá.
 *
 * ⚠️ A URL É O PADRÃO DO ESTADO, E NÃO É COPIADA PARA DENTRO DELE. O estado
 * nasce `null` ("ainda não mexi nisto") e o valor em uso é
 * `estado ?? o que veio na URL`. O motivo longo está em `useConferencia.ts`:
 * um `useEffect` que copiasse a URL para o estado seria recusado pelo ESLint do
 * projeto e, pior, desfaria a troca de mês feita na própria tela.
 *
 * ⚠️ AS DUAS DATAS SÃO OBRIGATÓRIAS (RN-17) e a tela diz isso, em vez de pedir
 * uma lista vazia ao banco.
 */
export function useConferenciaIdentificadora() {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;
  const parametros = useSearchParams();

  const [categorias, setCategorias] = useState<ContaIdentificadora[]>([]);

  const [contaEscolhidaPeloUsuario, setContaId] = useState<string | null>(null);
  const [deEscolhido, setDe] = useState<string | null>(null);
  const [ateEscolhido, setAte] = useState<string | null>(null);

  const contaId = contaEscolhidaPeloUsuario ?? parametros?.get("conta") ?? "";
  const de = deEscolhido ?? parametros?.get("de") ?? "";
  const ate = ateEscolhido ?? parametros?.get("ate") ?? "";

  const [linhas, setLinhas] = useState<LinhaDoExtratoIdentificadora[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return;
      // ⚠️ `incluirInativos`: a categoria desativada tem histórico, e é dele
      // que alguém vai atrás. A RN-06 vale para LANÇAR, não para conferir.
      const lista = await cadastroFinanceiroService.listarIdentificadoras(tenantId, { incluirInativos: true });
      setCategorias(lista);
    };
    carregar();
  }, [tenantId]);

  const carregar = useCallback(async () => {
    if (!tenantId || !contaId || !de || !ate) { setLinhas([]); return; }
    setCarregando(true);
    setErro(null);
    try {
      const r = await dashboardFinanceiroService.extratoDaIdentificadora(tenantId, contaId, de, ate);
      setLinhas(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR A CONFERÊNCIA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, contaId, de, ate]);

  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar]);

  const definirPeriodo = useCallback((p: { de: string; ate: string }) => {
    setDe(p.de);
    setAte(p.ate);
  }, []);

  return {
    ctx, categorias, contaId, setContaId,
    contaEscolhida: categorias.find((c) => c.id === contaId),
    de, setDe, ate, setAte, definirPeriodo,
    linhas, carregando, erro,
  };
}
