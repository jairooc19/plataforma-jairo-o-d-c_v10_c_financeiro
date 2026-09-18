"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dashboardFinanceiroService, montarGradeDeSaldos, montarGradeDeMovimentos,
  anoAtual, hojeISO, type BlocoDaGrade,
} from "@jairo/core";
import { useEmpresaAtiva } from "../useEmpresaAtiva";

/**
 * 🧠 O CÉREBRO DOS DOIS DASHBOARDS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/dashboard/useDashboard.ts
 *
 * ⚠️ UM HOOK PARA AS DUAS TELAS, E NÃO DOIS. Elas fazem exatamente a mesma
 * coisa: escolher um ano, pedir a grade ao banco, e mostrar. O que muda é qual
 * função do banco responde e se a coluna "TOTAL DO ANO" existe — duas linhas de
 * diferença. Em dois arquivos, a segunda cópia seria a que esquecesse o
 * tratamento de erro.
 *
 * ⚠️ ELE NÃO CALCULA NADA. Os valores e os totais vêm prontos do banco; quem os
 * arruma em grade é `montarGradeDeSaldos` / `montarGradeDeMovimentos`, no Core,
 * com teste no `npm test`. Aqui só mora o estado da tela.
 *
 * ⚠️ E A BUSCA É UMA FUNÇÃO `async` DENTRO DO EFEITO, com o estado mudando só
 * depois do `await` (regra `react-hooks/set-state-in-effect`). Não se cala essa
 * regra com `eslint-disable` neste projeto.
 */
export type VarianteDoDashboard = "movimento" | "identificadora";

export function useDashboard(variante: VarianteDoDashboard) {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;

  const [ano, setAno] = useState<number>(anoAtual());
  const [ocultarTransferencias, setOcultarTransferencias] = useState(false);
  const [blocos, setBlocos] = useState<BlocoDaGrade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * ⚠️ `hoje` É CONGELADO NA PRIMEIRA RENDERIZAÇÃO, de propósito. Ele só serve
   * para marcar quais meses ainda são PREVISÃO, e chamar `hojeISO()` a cada
   * montagem da grade recalcularia a mesma resposta dezenas de vezes — e, num
   * painel deixado aberto a noite toda, mudaria de valor no meio do uso.
   */
  const [hoje] = useState(hojeISO);

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true);
    setErro(null);
    try {
      if (variante === "movimento") {
        const linhas = await dashboardFinanceiroService.saldosMensaisDeContasMovimento(tenantId, ano);
        setBlocos(montarGradeDeSaldos(linhas, { ano, hoje }));
      } else {
        const linhas = await dashboardFinanceiroService.movimentosMensaisDeIdentificadoras(tenantId, ano);
        setBlocos(montarGradeDeMovimentos(linhas, { ano, hoje, ocultarTransferencias }));
      }
    } catch (e) {
      setBlocos([]);
      setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR O DASHBOARD.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, variante, ano, hoje, ocultarTransferencias]);

  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar]);

  /**
   * A grade está vazia de verdade — nenhum bloco, nenhuma linha.
   *
   * ⚠️ ELE EXISTE PARA A TELA DIZER "NÃO HÁ LANÇAMENTOS EM 2027" em vez de
   * mostrar uma tabela de zeros. Grade zerada parece defeito; uma frase é a
   * diferença entre "está quebrado" e "está certo, não há nada aí".
   */
  const vazio = !carregando && blocos.length === 0;

  return {
    ctx,
    ano,
    setAno,
    blocos,
    carregando,
    erro,
    vazio,
    recarregar: carregar,
    /** Só o dashboard das identificadoras soma o ano — ver `dashboardRegras.ts`. */
    comTotalDoAno: variante === "identificadora",
    ocultarTransferencias,
    setOcultarTransferencias,
  };
}
