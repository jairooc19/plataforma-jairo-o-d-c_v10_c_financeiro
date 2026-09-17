"use client";

import { useCallback, useState } from "react";
import {
  manutencaoFinanceiroService, avaliarExclusao, resumirExclusao,
  type FiltroDeExclusao, type SimulacaoFeita,
} from "@jairo/core";

/**
 * 🧠 O ESTADO DA EXCLUSÃO POR PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/useExclusaoPorPeriodo.ts
 *
 * ⚠️ NENHUMA DECISÃO MORA AQUI. Quem responde "dá para excluir agora?" é o
 * `avaliarExclusao`, do Core, que tem teste pelo `npm test`. Este arquivo é a
 * ponte: guarda o que a pessoa digitou, chama o banco e repassa a resposta.
 *
 * ⚠️ A SIMULAÇÃO GUARDA O FILTRO COM QUE FOI FEITA, e isso é o coração da
 * proteção. Sem esse par, conferir "setembro" (137 registros), trocar a data
 * para "janeiro" e clicar em EXCLUIR apagaria janeiro com a confirmação de
 * setembro. O botão se desliga sozinho quando o filtro muda.
 */
export function useExclusaoPorPeriodo(tenantId: string | null, aoConcluir: () => void) {
  const [contaId, setContaId] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const [simulacao, setSimulacao] = useState<SimulacaoFeita | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  const filtroAtual: FiltroDeExclusao = {
    contaMovimentoId: contaId || null,
    dataInicial: de,
    dataFinal: ate,
  };

  const veredicto = avaliarExclusao({ filtroAtual, simulacao, textoDigitado: confirmacao });
  const frases = simulacao ? resumirExclusao(simulacao.relatorio) : [];

  /**
   * ⚠️ QUALQUER MEXIDA NO FILTRO JOGA A SIMULAÇÃO FORA.
   *
   * O `avaliarExclusao` já barraria o botão (motivo `SIMULACAO_VENCIDA`), mas
   * deixar o relatório antigo na tela seria pior que barrar: a pessoa
   * continuaria lendo "137 lançamentos serão excluídos" embaixo de um filtro
   * que já é outro. Some da tela junto com o motivo de ela existir.
   */
  const trocarFiltro = useCallback((mudar: () => void) => {
    mudar();
    setSimulacao(null);
    setConfirmacao("");
    setFeito(null);
  }, []);

  const conferir = useCallback(async () => {
    if (!tenantId) return;
    setOcupado(true); setErro(null); setFeito(null);
    try {
      const relatorio = await manutencaoFinanceiroService.simularExclusaoPorPeriodo({
        tenantId,
        contaMovimentoId: contaId || null,
        dataInicial: de,
        dataFinal: ate,
      });
      // Guarda o filtro EXATO desta conferência, junto com o resultado.
      setSimulacao({ filtro: { contaMovimentoId: contaId || null, dataInicial: de, dataFinal: ate }, relatorio });
      setConfirmacao("");
    } catch (e) {
      setSimulacao(null);
      setErro(e instanceof Error ? e.message : "FALHA AO CONFERIR.");
    } finally {
      setOcupado(false);
    }
  }, [tenantId, contaId, de, ate]);

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
      });
      setFeito(
        `${r.apagados} LANÇAMENTO(S) EXCLUÍDO(S). ELES ESTÃO NA LIXEIRA, ABAIXO, E PODEM SER RESTAURADOS.`,
      );
      setSimulacao(null);
      setConfirmacao("");
      aoConcluir();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO EXCLUIR.");
    } finally {
      setOcupado(false);
    }
  }, [tenantId, veredicto.podeExcluir, contaId, de, ate, aoConcluir]);

  return {
    contaId, de, ate, confirmacao,
    setContaId: (v: string) => trocarFiltro(() => setContaId(v)),
    setDe: (v: string) => trocarFiltro(() => setDe(v)),
    setAte: (v: string) => trocarFiltro(() => setAte(v)),
    setPeriodo: (p: { de: string; ate: string }) =>
      trocarFiltro(() => { setDe(p.de); setAte(p.ate); }),
    setConfirmacao,
    simulacao, frases, veredicto, ocupado, erro, feito,
    conferir, excluir,
  };
}
