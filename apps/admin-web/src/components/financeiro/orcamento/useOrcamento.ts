"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  cadastroFinanceiroService, orcamentoService, orcamentoExistente,
  competenciaAtual, competenciaDe, deslocarCompetencia, rotuloDoMes, formatarBRL,
  type ContaIdentificadora, type LinhaDoOrcamento,
} from "@jairo/core";
import { useEmpresaAtiva } from "../useEmpresaAtiva";

/**
 * 🧠 O CÉREBRO DA TELA "+ ADICIONAR NOVO" DO ORÇAMENTO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/orcamento/useOrcamento.ts
 *
 * ⚠️ A COMPETÊNCIA VEM DA URL QUANDO HÁ URL, e o estado nasce `null` ("ainda
 * não mexi nisto"). É o mesmo desenho das conferências: copiar a URL para o
 * estado num `useEffect` seria recusado pelo ESLint e desfaria, na renderização
 * seguinte, o mês que a pessoa acabou de escolher.
 *
 * ⚠️ A LISTA RECARREGA A CADA TROCA DE COMPETÊNCIA. É o que faz a "conferência
 * dos registros existentes" ser da competência INFORMADA, e não de um mês que
 * ficou para trás.
 */
export function useOrcamento() {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;
  const parametros = useSearchParams();

  const [competenciaEscolhida, setCompetencia] = useState<string | null>(null);
  const daUrl = parametros?.get("competencia");
  const competencia = competenciaEscolhida
    ?? (daUrl && /^\d{4}-\d{2}-\d{2}$/.test(daUrl) ? competenciaDe(daUrl) : competenciaAtual());

  const [categorias, setCategorias] = useState<ContaIdentificadora[]>([]);
  const [linhas, setLinhas] = useState<LinhaDoOrcamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // --- o formulário
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return;
      // ⚠️ `incluirInativos`: uma conta desativada pode ter orçamento de meses
      // passados, e ela precisa aparecer na lista. A RN-06 vale para LANÇAR.
      const lista = await cadastroFinanceiroService.listarIdentificadoras(tenantId, { incluirInativos: true });
      setCategorias(lista);
    };
    carregar();
  }, [tenantId]);

  const carregarLista = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await orcamentoService.listar(tenantId, competencia);
      setLinhas(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR O ORÇAMENTO.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, competencia]);

  useEffect(() => {
    const rodar = async () => { await carregarLista(); };
    rodar();
  }, [carregarLista]);

  const limpar = useCallback(() => {
    setEditandoId(null);
    setContaId("");
    setValor(0);
    setObservacao("");
  }, []);

  /**
   * ⚠️ TROCAR DE COMPETÊNCIA SAI DO MODO DE EDIÇÃO. Sem isto, quem estivesse
   * editando o aluguel de setembro e trocasse para outubro gravaria a alteração
   * **no registro de setembro** — o id em edição não muda com o campo de cima.
   */
  const trocarCompetencia = useCallback((nova: string) => {
    setCompetencia(nova);
    limpar();
  }, [limpar]);

  const gravar = async () => {
    if (!tenantId || !contaId || valor <= 0) return;
    setErro(null);
    setAviso(null);

    /**
     * ⚠️ A PERGUNTA ANTES É CONFORTO; QUEM IMPEDE É O ÍNDICE ÚNICO DO BANCO.
     * Sem ela, gravar de novo devolveria o `23505` traduzido — correto, mas
     * obrigaria a pessoa a ir até a lista, achar a linha e clicar em EDITAR.
     */
    const existente = editandoId ? null : orcamentoExistente(linhas, contaId);
    if (existente) {
      const texto =
        `JÁ EXISTE ORÇAMENTO DE ${existente.nome} PARA ${rotuloDoMes(competencia)}, ` +
        `NO VALOR DE ${formatarBRL(existente.valor_centavos)}.\n\n` +
        `SUBSTITUIR POR ${formatarBRL(valor)}?`;
      if (!window.confirm(texto)) return;
    }

    setGravando(true);
    try {
      const r = await orcamentoService.gravar(tenantId, {
        id: editandoId ?? existente?.orcamento_id ?? null,
        competencia,
        contaIdentificadoraId: contaId,
        valorCentavos: valor,
        observacao: observacao || null,
      });
      setAviso(`ORÇAMENTO DE ${r.conta} GRAVADO PARA ${rotuloDoMes(competencia)}.`);
      limpar();
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR O ORÇAMENTO.");
    } finally {
      setGravando(false);
    }
  };

  /**
   * Carrega uma linha no formulário.
   *
   * ⚠️ A COMPETÊNCIA E A CONTA FICAM TRAVADAS NA EDIÇÃO. Mudar as duas seria
   * criar OUTRO registro, não editar este — e o resultado seria um orçamento a
   * mais, num mês que ninguém pediu, com o original intacto.
   */
  const editar = (linha: LinhaDoOrcamento) => {
    if (!linha.orcamento_id || !linha.conta_id) return;
    setEditandoId(linha.orcamento_id);
    setContaId(linha.conta_id);
    setValor(linha.valor_centavos);
    setObservacao(linha.observacao ?? "");
    setAviso("EDITANDO UM ORÇAMENTO EXISTENTE. A CONTA E A COMPETÊNCIA FICAM TRAVADAS.");
  };

  const excluir = async (linha: LinhaDoOrcamento) => {
    if (!tenantId || !linha.orcamento_id) return;
    const texto =
      `EXCLUIR O ORÇAMENTO ABAIXO?\n\n` +
      `CONTA: ${linha.nome}\n` +
      `COMPETÊNCIA: ${rotuloDoMes(competencia)}\n` +
      `VALOR: ${formatarBRL(linha.valor_centavos)}\n\n` +
      `OS LANÇAMENTOS NÃO SÃO APAGADOS — SÓ O PLANO.`;
    if (!window.confirm(texto)) return;

    setErro(null);
    setAviso(null);
    try {
      await orcamentoService.excluir(tenantId, linha.orcamento_id);
      setAviso(`ORÇAMENTO DE ${linha.nome} EXCLUÍDO.`);
      if (editandoId === linha.orcamento_id) limpar();
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO EXCLUIR.");
    }
  };

  /**
   * 🎁 BÔNUS B1 — copiar o mês anterior.
   *
   * ⚠️ SEM SUBSTITUIR, POR PADRÃO. O que já foi ajustado à mão nesta competência
   * sobrevive; só entram as contas que faltavam. Substituir é uma segunda
   * pergunta, feita só depois de a primeira ter sido respondida.
   */
  const copiarDoMesAnterior = async () => {
    if (!tenantId) return;
    const origem = deslocarCompetencia(competencia, -1);
    const texto =
      `COPIAR O ORÇAMENTO DE ${rotuloDoMes(origem)} PARA ${rotuloDoMes(competencia)}?\n\n` +
      `AS CONTAS QUE JÁ EXISTEM AQUI NÃO SERÃO ALTERADAS.`;
    if (!window.confirm(texto)) return;

    setErro(null);
    setAviso(null);
    try {
      const r = await orcamentoService.copiar(tenantId, { origem, destino: competencia });
      if (r.naOrigem === 0) {
        setErro(`NÃO HÁ ORÇAMENTO EM ${rotuloDoMes(origem)} PARA COPIAR.`);
        return;
      }
      setAviso(`${r.naOrigem} CONTA(S) DE ${rotuloDoMes(origem)} CONSIDERADAS; O QUE JÁ EXISTIA AQUI FOI PRESERVADO.`);
      await carregarLista();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO COPIAR.");
    }
  };

  /** 🎁 BÔNUS B9 — contas orçadas no mês anterior que ainda faltam aqui. */
  const [faltando, setFaltando] = useState<string[]>([]);
  useEffect(() => {
    const comparar = async () => {
      if (!tenantId) return;
      try {
        const anterior = await orcamentoService.listar(tenantId, deslocarCompetencia(competencia, -1));
        const aqui = new Set(linhas.filter((l) => l.conta_id).map((l) => l.conta_id));
        setFaltando(
          anterior
            .filter((l) => l.linha_tipo === "CONTA" && l.conta_id && !aqui.has(l.conta_id))
            .map((l) => l.nome ?? ""),
        );
      } catch {
        setFaltando([]);   // sem permissão de ver o mês anterior: o aviso some
      }
    };
    comparar();
  }, [tenantId, competencia, linhas]);

  return {
    ctx, competencia, trocarCompetencia, categorias, linhas, carregando, erro, aviso,
    setErro, setAviso, recarregar: carregarLista,
    formulario: { editandoId, contaId, setContaId, valor, setValor, observacao, setObservacao, gravando },
    gravar, editar, excluir, limpar, copiarDoMesAnterior, faltando,
  };
}
