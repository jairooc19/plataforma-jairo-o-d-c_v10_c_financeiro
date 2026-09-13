"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cadastroFinanceiroService, lancamentoService, extratoService, hojeISO,
  type ContaMovimento, type ContaIdentificadora, type LinhaDoExtrato,
} from "@jairo/core";
import { useEmpresaAtiva } from "../useEmpresaAtiva";

/**
 * 🧠 O CÉREBRO DA TELA "NOVO LANÇAMENTO" (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/lancamento/useNovoLancamento.ts
 *
 * Todo o estado e toda a conversa com o banco. As duas colunas da tela
 * (formulário e conferência) são desenho puro e recebem daqui o que mostrar.
 *
 * ⚠️ DEPOIS DE GRAVAR, O EXTRATO É RECARREGADO SEMPRE. Não é só para mostrar o
 * novo lançamento: se a ordem informada já existia no dia, o banco DESLOCOU as
 * seguintes (RN-12) — outras linhas mudaram de posição, e a tela precisa
 * refletir isso.
 *
 * ⚠️ TODA BUSCA É UMA FUNÇÃO `async` DEFINIDA DENTRO DO EFEITO, e o estado só
 * muda depois do `await` (regra `react-hooks/set-state-in-effect`). Não use
 * `eslint-disable` para calar essa regra neste projeto.
 */
export function useNovoLancamento() {
  const ctx = useEmpresaAtiva();
  const { tenantId } = ctx;

  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [categorias, setCategorias] = useState<ContaIdentificadora[]>([]);

  // --- formulário
  const [contaId, setContaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [data, setData] = useState("");
  const [ordem, setOrdem] = useState<number | "">("");
  const [tipoMov, setTipoMov] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [propriedade, setPropriedade] = useState<"PROPRIO" | "TERCEIROS">("PROPRIO");
  const [regime, setRegime] = useState<"CAIXA" | "COMPETENCIA">("CAIXA");
  const [valor, setValor] = useState(0);
  const [historico, setHistorico] = useState("");
  const [saldoDaConta, setSaldoDaConta] = useState<number | null>(null);

  // --- conferência
  const [contaExtrato, setContaExtrato] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [linhas, setLinhas] = useState<LinhaDoExtrato[]>([]);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);

  const [modal, setModal] = useState<null | "movimento" | "identificadora">(null);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gravadosNaSessao, setGravadosNaSessao] = useState(0);

  const carregarListas = useCallback(async () => {
    if (!tenantId) return;
    const [cm, ci] = await Promise.all([
      cadastroFinanceiroService.listarContasMovimento(tenantId),
      cadastroFinanceiroService.listarIdentificadoras(tenantId),
    ]);
    setContas(cm);
    setCategorias(ci);
  }, [tenantId]);

  useEffect(() => {
    const rodar = async () => { await carregarListas(); };
    rodar();
  }, [carregarListas]);

  /** O extrato só aparece com a conta e as duas datas (RN-17). */
  const carregarExtrato = useCallback(async () => {
    if (!tenantId || !contaExtrato || !de || !ate) { setLinhas([]); return; }
    setCarregandoExtrato(true);
    try {
      setLinhas(await extratoService.extrato(tenantId, contaExtrato, de, ate));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR O EXTRATO.");
    } finally {
      setCarregandoExtrato(false);
    }
  }, [tenantId, contaExtrato, de, ate]);

  useEffect(() => {
    const rodar = async () => { await carregarExtrato(); };
    rodar();
  }, [carregarExtrato]);

  /** Saldo da conta escolhida, mostrado ao lado do campo (bônus B-2). */
  useEffect(() => {
    const ler = async () => {
      if (!tenantId || !contaId) { setSaldoDaConta(null); return; }
      try { setSaldoDaConta(await extratoService.saldoAtual(tenantId, contaId)); }
      catch { setSaldoDaConta(null); }
    };
    ler();
  }, [tenantId, contaId]);

  /** A ordem sugerida: a próxima livre do dia naquela conta (RN-11). */
  useEffect(() => {
    const sugerir = async () => {
      if (!contaId || !data) return;
      try { setOrdem(await lancamentoService.proximaOrdem(contaId, data)); }
      catch { /* sem sugestão, o campo fica em branco — é permitido */ }
    };
    sugerir();
  }, [contaId, data]);

  const categoriaEscolhida = categorias.find((c) => c.id === categoriaId);
  const contaEscolhida = contas.find((c) => c.id === contaId);
  const contaDoExtrato = contas.find((c) => c.id === contaExtrato);

  const gravar = async () => {
    if (!tenantId) return;
    setErro(null); setAviso(null);

    // Avisos que NÃO bloqueiam (RN-13, RN-14): há casos legítimos para os dois.
    if (categoriaEscolhida) {
      const incoerente =
        (categoriaEscolhida.tipo === "DESPESA" && tipoMov === "ENTRADA") ||
        (categoriaEscolhida.tipo === "RECEITA" && tipoMov === "SAIDA");
      if (incoerente && !window.confirm(
        `ESTA É UMA CONTA DE ${categoriaEscolhida.tipo} E VOCÊ ESTÁ LANÇANDO UMA ${tipoMov}. CONFIRMA?`)) return;
    }
    if (data) {
      const dias = (new Date(data).getTime() - new Date(hojeISO()).getTime()) / 86400000;
      if (dias > 90 && !window.confirm("A DATA INFORMADA ESTÁ MAIS DE 90 DIAS À FRENTE. CONFIRMA?")) return;
    }

    setGravando(true);
    try {
      await lancamentoService.gravar(tenantId, {
        conta_movimento_id: contaId,
        conta_identificadora_id: categoriaId,
        data_movimento: data,
        ordem_extrato: ordem === "" ? null : Number(ordem),
        tipo_movimento: tipoMov,
        propriedade,
        regime,
        valor_centavos: valor,
        historico: historico || null,
      });

      setGravadosNaSessao((n) => n + 1);
      setAviso("LANÇAMENTO REGISTRADO.");

      // Mantém conta e data (que repetem em série) e limpa o resto — bônus N2.
      setCategoriaId(""); setValor(0); setHistorico("");
      if (!contaExtrato) setContaExtrato(contaId);
      await carregarExtrato();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR O LANÇAMENTO.");
    } finally {
      setGravando(false);
    }
  };

  const conferir = async (id: string, marcado: boolean) => {
    if (!tenantId) return;
    try {
      await lancamentoService.marcarConferido(tenantId, id, marcado);
      await carregarExtrato();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO MARCAR COMO CONFERIDO.");
    }
  };

  const aoGravarCadastro = async (id: string) => {
    const qual = modal;
    setModal(null);
    await carregarListas();
    if (qual === "movimento") setContaId(id); else setCategoriaId(id);
  };

  return {
    ctx, contas, categorias, contaEscolhida, categoriaEscolhida, contaDoExtrato,
    formulario: {
      contaId, setContaId, categoriaId, setCategoriaId, data, setData,
      ordem, setOrdem, tipoMov, setTipoMov, propriedade, setPropriedade,
      regime, setRegime, valor, setValor, historico, setHistorico, saldoDaConta,
    },
    conferencia: { contaExtrato, setContaExtrato, de, setDe, ate, setAte, linhas, carregandoExtrato },
    modal, setModal, gravando, erro, aviso, gravadosNaSessao,
    gravar, conferir, aoGravarCadastro,
  };
}
