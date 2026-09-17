"use client";

import { useCallback, useState } from "react";
import {
  manutencaoFinanceiroService, lancamentoService,
  avaliarExclusao, resumirExclusao,
  type FiltroDeExclusao, type SimulacaoFeita, type LancamentoNaLista,
} from "@jairo/core";

/**
 * 🧠 O ESTADO DA EXCLUSÃO POR PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/useExclusaoPorPeriodo.ts
 *
 * ⚠️ NENHUMA DECISÃO MORA AQUI. Quem responde "dá para excluir agora?" é o
 * `avaliarExclusao`, do Core, que tem teste pelo `npm test`. Este arquivo é a
 * ponte: guarda o que a pessoa escolheu, chama o banco e repassa a resposta.
 *
 * ===========================================================================
 * OS TRÊS PASSOS — e por que são três, e não um (17/09/2026, 2ª rodada)
 * ===========================================================================
 *   1. LISTAR    → traz os registros do período; todos nascem MARCADOS
 *   2. marcar/desmarcar à vontade (nada é consultado nem apagado aqui)
 *   3. CONFERIR  → o banco diz quantos sairiam, já contando as transferências
 *   4. EXCLUIR   → só destrava depois de digitar o número conferido
 *
 * ⚠️ LISTAR E CONFERIR SÃO PASSOS SEPARADOS DE PROPÓSITO. Se a listagem já
 * disparasse a conferência, cada clique numa caixa invalidaria o número e
 * obrigaria a conferir de novo — marcar cinco registros custaria cinco
 * conferências. Separando, a pessoa mexe nas caixas quanto quiser e confere
 * uma vez só, no fim.
 */

/**
 * ⚠️ O TETO DA LISTAGEM, E POR QUE ELE PRECISA EXISTIR.
 *
 * O `pesquisar` do Core pagina (50 por página, por padrão). Sem um teto
 * explícito, um período com 300 lançamentos mostraria 50 — e a pessoa marcaria
 * as 50 achando que marcou o mês. O número da conferência viria 300 e a
 * confirmação pediria um número que não corresponde a nada na tela.
 *
 * 500 é folgado para o uso real deste módulo e fica abaixo do teto de linhas
 * que o PostgREST costuma impor. Ao bater no teto, a tela AVISA e recusa
 * seguir, em vez de trabalhar sobre um pedaço em silêncio.
 */
const TETO_DA_LISTAGEM = 500;

export function useExclusaoPorPeriodo(tenantId: string | null, aoConcluir: () => void) {
  const [contaId, setContaId] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const [lista, setLista] = useState<LancamentoNaLista[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [cortada, setCortada] = useState(false);

  const [simulacao, setSimulacao] = useState<SimulacaoFeita | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  /**
   * ⚠️ ENQUANTO NÃO SE LISTOU, A SELEÇÃO É `null` — E ISSO NÃO É O MESMO QUE
   * VAZIA. `null` diz ao banco "leve o período inteiro"; `[]` diz "desmarquei
   * tudo, não leve nada". Confundir os dois faria DESMARCAR TODOS apagar o mês.
   * O Core tem teste para essa distinção.
   */
  const idsSelecionados = lista === null ? null : Array.from(marcados);

  const filtroAtual: FiltroDeExclusao = {
    contaMovimentoId: contaId || null,
    dataInicial: de,
    dataFinal: ate,
    idsSelecionados,
  };

  const veredicto = avaliarExclusao({ filtroAtual, simulacao, textoDigitado: confirmacao });
  const frases = simulacao ? resumirExclusao(simulacao.relatorio) : [];

  /** Joga fora a conferência (e o número digitado). Usado sempre que a pergunta muda. */
  const invalidarConferencia = useCallback(() => {
    setSimulacao(null);
    setConfirmacao("");
    setFeito(null);
  }, []);

  /**
   * ⚠️ MEXER NO FILTRO JOGA FORA A LISTA, E NÃO SÓ A CONFERÊNCIA.
   * Uma lista de setembro sob um filtro que agora diz janeiro seria pior que
   * lista nenhuma: as caixas marcadas continuariam parecendo válidas.
   */
  const trocarFiltro = useCallback((mudar: () => void) => {
    mudar();
    setLista(null);
    setMarcados(new Set());
    setCortada(false);
    invalidarConferencia();
  }, [invalidarConferencia]);

  /** Passo 1 — traz os registros do período. Não apaga e não conta nada. */
  const listar = useCallback(async () => {
    if (!tenantId) return;
    setOcupado(true); setErro(null); setFeito(null);
    try {
      const linhas = await lancamentoService.pesquisar(tenantId, {
        contasMovimento: contaId ? [contaId] : undefined,
        dataInicial: de,
        dataFinal: ate,
        porPagina: TETO_DA_LISTAGEM,
        pagina: 0,
      });
      setLista(linhas);
      setCortada(linhas.length >= TETO_DA_LISTAGEM);
      // Todos nascem marcados: era o comportamento antigo (apagar o período
      // inteiro), e desmarcar é mais rápido do que marcar um a um.
      setMarcados(new Set(linhas.map((l) => l.id)));
      invalidarConferencia();
    } catch (e) {
      setLista(null);
      setErro(e instanceof Error ? e.message : "FALHA AO LISTAR OS LANÇAMENTOS.");
    } finally {
      setOcupado(false);
    }
  }, [tenantId, contaId, de, ate, invalidarConferencia]);

  /** Passo 2 — as caixas. Qualquer mexida invalida a conferência. */
  const alternarUm = useCallback((id: string) => {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
    invalidarConferencia();
  }, [invalidarConferencia]);

  const marcarTodos = useCallback(() => {
    setMarcados(new Set((lista ?? []).map((l) => l.id)));
    invalidarConferencia();
  }, [lista, invalidarConferencia]);

  const desmarcarTodos = useCallback(() => {
    setMarcados(new Set());
    invalidarConferencia();
  }, [invalidarConferencia]);

  /** Passo 3 — o banco conta o que sairia, sem apagar. */
  const conferir = useCallback(async () => {
    if (!tenantId) return;
    setOcupado(true); setErro(null); setFeito(null);
    try {
      const relatorio = await manutencaoFinanceiroService.simularExclusaoPorPeriodo({
        tenantId,
        contaMovimentoId: contaId || null,
        dataInicial: de,
        dataFinal: ate,
        ids: idsSelecionados,
      });
      // Guarda o filtro EXATO desta conferência — a seleção inclusive.
      setSimulacao({
        filtro: { contaMovimentoId: contaId || null, dataInicial: de, dataFinal: ate, idsSelecionados },
        relatorio,
      });
      setConfirmacao("");
    } catch (e) {
      setSimulacao(null);
      setErro(e instanceof Error ? e.message : "FALHA AO CONFERIR.");
    } finally {
      setOcupado(false);
    }
  }, [tenantId, contaId, de, ate, idsSelecionados]);

  /** Passo 4 — apaga. */
  const excluir = useCallback(async () => {
    // ⚠️ A CHECAGEM É REFEITA AQUI, e não só no `disabled` do botão. Botão
    // desligado é conforto visual; quem chama esta função por outro caminho
    // (Enter num campo, um clique que escapou) passaria direto.
    if (!tenantId || !veredicto.podeExcluir) return;
    setOcupado(true); setErro(null);
    try {
      const r = await manutencaoFinanceiroService.excluirPorPeriodo({
        tenantId,
        contaMovimentoId: contaId || null,
        dataInicial: de,
        dataFinal: ate,
        ids: idsSelecionados,
      });
      setFeito(
        `${r.apagados} LANÇAMENTO(S) EXCLUÍDO(S). ELES ESTÃO NA LIXEIRA, ABAIXO, E PODEM SER RESTAURADOS.`,
      );
      setLista(null);
      setMarcados(new Set());
      setCortada(false);
      setSimulacao(null);
      setConfirmacao("");
      aoConcluir();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO EXCLUIR.");
    } finally {
      setOcupado(false);
    }
  }, [tenantId, veredicto.podeExcluir, contaId, de, ate, idsSelecionados, aoConcluir]);

  return {
    contaId, de, ate, confirmacao,
    setContaId: (v: string) => trocarFiltro(() => setContaId(v)),
    setDe: (v: string) => trocarFiltro(() => setDe(v)),
    setAte: (v: string) => trocarFiltro(() => setAte(v)),
    setPeriodo: (p: { de: string; ate: string }) =>
      trocarFiltro(() => { setDe(p.de); setAte(p.ate); }),
    setConfirmacao,
    lista, marcados, cortada, tetoDaListagem: TETO_DA_LISTAGEM,
    listar, alternarUm, marcarTodos, desmarcarTodos,
    simulacao, frases, veredicto, ocupado, erro, feito,
    conferir, excluir,
  };
}
