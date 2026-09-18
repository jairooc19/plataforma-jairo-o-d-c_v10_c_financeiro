"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cadastroFinanceiroService, extratoService, dashboardFinanceiroService,
  type ContaMovimento, type LinhaDoExtrato, type LinhaDoExtratoConsolidado,
} from "@jairo/core";
import { useEmpresaAtiva } from "../useEmpresaAtiva";

/**
 * 🧠 O CÉREBRO DA CONFERÊNCIA COM ENDEREÇO PRÓPRIO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/conferencia/useConferencia.ts
 *
 * ===========================================================================
 * ⚠️ POR QUE ESTA TELA PRECISOU EXISTIR — 18/09/2026
 * ===========================================================================
 * A CONFERÊNCIA DA CONTA sempre morou DENTRO de "Novo Lançamento", como a
 * coluna direita dela, e isso é ótimo para quem lança olhando o extrato ao
 * lado. Mas aquela tela começa assim:
 *
 *     if (!pode("lc_criar")) return <Recado texto="VOCÊ NÃO TEM PERMISSÃO
 *                                                  PARA CRIAR LANÇAMENTOS" />;
 *
 * Quem tem `extrato_ver` e NÃO tem `lc_criar` — o contador, o sócio que só
 * confere — clicaria numa célula do dashboard e receberia uma recusa que nem
 * responde ao que ele pediu: ele não quis criar nada, quis conferir. E é
 * justamente essa pessoa que mais precisa de um dashboard.
 *
 * ⚠️ MAS A DECISÃO DE 13/09 CONTINUA VALENDO. Ela proíbe uma ENTRADA DE MENU
 * levando a uma terceira tela de extrato ("duas respostas para a mesma
 * pergunta"), e esta tela **não entra no menu**: só se chega a ela clicando no
 * dashboard. A coluna dentro de "Novo Lançamento" não mudou em nada.
 *
 * ⚠️ E NÃO HÁ SEGUNDA CÓPIA DE NADA: a tabela é o mesmo `ExtratoDaConta.tsx`,
 * os atalhos são o mesmo `AtalhosDeMes.tsx`, e os números vêm da mesma
 * `fin_extrato`. O que esta tela tem de próprio é a moldura.
 *
 * ===========================================================================
 * ⚠️ A URL NÃO É COPIADA PARA O ESTADO — ELA É O PADRÃO DELE
 * ===========================================================================
 * A tentação era um `useEffect` que lê `?conta=&de=&ate=` e chama `setState`.
 * Duas coisas a condenam:
 *
 *   1. O ESLint deste projeto recusa (`react-hooks/set-state-in-effect`), e a
 *      regra está certa: copiar de uma fonte para outra cria duas verdades.
 *   2. Ela teria de vir com uma guarda de "só na primeira vez" — senão, trocar
 *      o mês na tela seria DESFEITO na renderização seguinte pela URL antiga,
 *      e o campo voltaria sozinho sob o dedo da pessoa.
 *
 * O desenho aqui é outro: o estado nasce `null` (= "ainda não mexi nisto") e o
 * valor em uso é `estado ?? o que veio na URL`. Quem digita passa a mandar, sem
 * efeito nenhum, sem guarda e sem cópia.
 */
export function useConferencia() {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;
  const parametros = useSearchParams();

  const [contas, setContas] = useState<ContaMovimento[]>([]);

  // `null` = a pessoa ainda não mexeu neste campo; vale o que veio na URL.
  const [contaEscolhida, setContaId] = useState<string | null>(null);
  const [deEscolhido, setDe] = useState<string | null>(null);
  const [ateEscolhido, setAte] = useState<string | null>(null);
  const [saiuDoModoSomado, setSaiuDoModoSomado] = useState(false);

  const contaId = contaEscolhida ?? parametros?.get("conta") ?? "";
  const de = deEscolhido ?? parametros?.get("de") ?? "";
  const ate = ateEscolhido ?? parametros?.get("ate") ?? "";

  const paramContas = parametros?.get("contas") ?? null;

  /**
   * As contas do modo CONSOLIDADO — o clique na linha de TOTAL do dashboard.
   *
   * ⚠️ `null` E `[]` SÃO DIFERENTES, E ESTA TELA RESPEITA ISSO: `null` quer
   * dizer "não é conferência somada, é de uma conta só"; `[]` (que só chegaria
   * de uma URL montada à mão) quer dizer "nenhuma conta", e o banco devolve
   * saldo zero em vez do extrato inteiro da empresa. É a mesma lição da
   * exclusão em lote, agora do lado da leitura — e a trava 40 a fixa no banco.
   *
   * ⚠️ O `useMemo` NÃO É ENFEITE. Sem ele, `split(",")` devolveria um ARRAY
   * NOVO a cada renderização; como ele é dependência do `useCallback` que
   * busca, a busca se refaria para sempre, num laço que só apareceria como
   * lentidão e piscar de tela.
   */
  const contasSomadas = useMemo<string[] | null>(() => {
    if (saiuDoModoSomado || paramContas === null) return null;
    return paramContas === "" ? [] : paramContas.split(",");
  }, [paramContas, saiuDoModoSomado]);

  const tituloSomado = parametros?.get("titulo") ?? "CONTAS SOMADAS";

  const [linhas, setLinhas] = useState<LinhaDoExtrato[]>([]);
  const [consolidado, setConsolidado] = useState<LinhaDoExtratoConsolidado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** O cadastro, para o campo de escolher conta funcionar sozinho nesta tela. */
  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return;
      // ⚠️ `incluirInativos`: a conta encerrada tem extrato, e é justamente
      // dela que alguém vai querer o histórico. A RN-06 vale para LANÇAR.
      const lista = await cadastroFinanceiroService.listarContasMovimento(tenantId, { incluirInativos: true });
      setContas(lista);
    };
    carregar();
  }, [tenantId]);

  const carregar = useCallback(async () => {
    if (!tenantId || !de || !ate || (!contasSomadas && !contaId)) {
      setLinhas([]);
      setConsolidado([]);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      if (contasSomadas) {
        const r = await dashboardFinanceiroService.extratoConsolidado(tenantId, contasSomadas, de, ate);
        setConsolidado(r);
        setLinhas([]);
      } else {
        const r = await extratoService.extrato(tenantId, contaId, de, ate);
        setLinhas(r);
        setConsolidado([]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR A CONFERÊNCIA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, contaId, contasSomadas, de, ate]);

  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar]);

  const definirPeriodo = useCallback((p: { de: string; ate: string }) => {
    setDe(p.de);
    setAte(p.ate);
  }, []);

  /** Volta ao modo "uma conta só" — desfaz a conferência somada sem voltar ao dashboard. */
  const sairDoModoSomado = useCallback(() => setSaiuDoModoSomado(true), []);

  return {
    ctx, contas, contaId, setContaId,
    contaEscolhida: contas.find((c) => c.id === contaId),
    de, setDe, ate, setAte, definirPeriodo,
    contasSomadas, tituloSomado, sairDoModoSomado,
    linhas, consolidado, carregando, erro, recarregar: carregar,
  };
}
