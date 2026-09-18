"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  orcamentoService, competenciaAtual, competenciaDe, ritmoDoMes, hojeISO,
  type ConfigDoDinheiro, type LinhaDoDinheiro,
} from "@jairo/core";
import { useEmpresaAtiva } from "../useEmpresaAtiva";

/**
 * 🧠 O CÉREBRO DO DINHEIRO DO PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/orcamento/useDinheiroDoPeriodo.ts
 *
 * ⚠️ ELE NÃO FILTRA NADA E NÃO ESCONDE NADA. As contas que este membro pode ver
 * e o modo dele (valores ou só percentual) são decididos DENTRO do banco, por
 * `fin_dinheiro_do_periodo`. Se o filtro morasse aqui, bastaria abrir as
 * ferramentas do navegador para ver o que a tela escondeu — o valor teria
 * viajado até lá de qualquer jeito.
 *
 * A `config` existe só para a tela **se desenhar**: escrever "VOCÊ VÊ SOMENTE O
 * PERCENTUAL" e saber se mostra as colunas de dinheiro.
 *
 * ⚠️ E A COMPETÊNCIA VEM DA URL QUANDO HÁ URL — é assim que o lançamento volta
 * para o mês certo depois de gravar.
 */
export function useDinheiroDoPeriodo() {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;
  const parametros = useSearchParams();

  const [competenciaEscolhida, setCompetencia] = useState<string | null>(null);
  const daUrl = parametros?.get("competencia");
  const competencia = competenciaEscolhida
    ?? (daUrl && /^\d{4}-\d{2}-\d{2}$/.test(daUrl) ? competenciaDe(daUrl) : competenciaAtual());

  const [linhas, setLinhas] = useState<LinhaDoDinheiro[]>([]);
  const [config, setConfig] = useState<ConfigDoDinheiro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Congelado na primeira renderização — ver o gêmeo em `useDashboard`. */
  const [hoje] = useState(hojeISO);

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true);
    setErro(null);
    try {
      const [cfg, r] = await Promise.all([
        orcamentoService.configDoDinheiro(tenantId),
        orcamentoService.dinheiroDoPeriodo(tenantId, competencia),
      ]);
      setConfig(cfg);
      setLinhas(r);
    } catch (e) {
      setLinhas([]);
      setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR O DINHEIRO DO PERÍODO.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, competencia]);

  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar]);

  /**
   * A competência não tem orçamento nenhum.
   *
   * ⚠️ O BLOCO "FORA" NÃO CONTA AQUI, e essa distinção importa: gastar sem
   * orçar não é "ter orçamento". Se o `FORA` contasse, a tela mostraria só o
   * gasto imprevisto e diria que o mês está orçado — o oposto da verdade.
   */
  const semOrcamento = !carregando && !linhas.some(
    (l) => l.linha_tipo === "CONTA" && l.bloco !== "FORA",
  );

  return {
    ctx, competencia, setCompetencia, linhas, config, carregando, erro,
    recarregar: carregar,
    semOrcamento,
    /** 🎁 BÔNUS B4 — quanto do mês já passou, para a marca na barra. */
    ritmo: ritmoDoMes(competencia, hoje),
    /** `true` quando o banco devolveu os valores; `false` no modo percentual. */
    veValores: config?.ve_valores !== false,
  };
}
