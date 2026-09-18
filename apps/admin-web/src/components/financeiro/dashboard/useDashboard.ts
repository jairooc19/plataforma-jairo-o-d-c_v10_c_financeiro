"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
 *
 * ===========================================================================
 * ⚠️ O ANO E O FILTRO CABEM NA URL — 18/09/2026 (2ª rodada)
 * ===========================================================================
 * Pedido do dono do projeto: "ao clicar e abrir a conferência, seria possível
 * ter função para retornar para a tela que estava antes? Atualmente preciso
 * iniciar todo o caminho do zero".
 *
 * Voltar pelo histórico do navegador (`router.back()`) traria a página de
 * volta, mas o ANO e a caixa de ocultar transferências são ESTADO DE COMPONENTE
 * — eles se perdem na remontagem, e a pessoa voltaria para 2026 depois de ter
 * navegado até 2023. Por isso os dois moram na URL: o endereço passa a
 * descrever a tela inteira, e o botão VOLTAR da conferência só precisa
 * reabri-lo.
 *
 * ⚠️ A URL É O PADRÃO DO ESTADO, NÃO UMA CÓPIA DELE. O estado nasce `null`
 * ("ainda não mexi nisto") e o valor em uso é `estado ?? o que veio na URL`.
 * Copiar num `useEffect` seria recusado pelo ESLint e desfaria, na renderização
 * seguinte, o ano que a pessoa acabou de escolher.
 */
export type VarianteDoDashboard = "movimento" | "identificadora";

export function useDashboard(variante: VarianteDoDashboard) {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;

  const parametros = useSearchParams();
  const [anoEscolhido, setAno] = useState<number | null>(null);
  const [ocultarEscolhido, setOcultarTransferencias] = useState<boolean | null>(null);

  const anoDaUrl = Number(parametros?.get("ano"));
  const ano = anoEscolhido
    ?? (Number.isInteger(anoDaUrl) && anoDaUrl >= 1900 && anoDaUrl <= 2999 ? anoDaUrl : anoAtual());
  const ocultarTransferencias = ocultarEscolhido ?? parametros?.get("semtransf") === "1";
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

  /**
   * O endereço desta tela, exatamente como ela está agora.
   *
   * É o que vai no `?voltar=` do clique, para a conferência saber como desfazer
   * o caminho. Inclui o ano e o filtro — sem eles, voltar traria a tela certa
   * com o conteúdo errado.
   */
  const enderecoAtual = (rota: string) => {
    const q = new URLSearchParams({ ano: String(ano) });
    if (ocultarTransferencias) q.set("semtransf", "1");
    return `${rota}?${q}`;
  };

  return {
    ctx,
    ano,
    setAno,
    enderecoAtual,
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
