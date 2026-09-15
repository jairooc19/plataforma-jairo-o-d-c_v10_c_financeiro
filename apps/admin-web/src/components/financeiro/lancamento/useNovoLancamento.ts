"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const parametros = useSearchParams();

  /**
   * 📝 O ID QUE ESTÁ SENDO EDITADO. `null` = lançamento novo.
   *
   * ⚠️ ELE MUDA O SIGNIFICADO DO BOTÃO DE GRAVAR, e é por isso que precisa ser
   * estado visível na tela e não uma variável escondida: com `editandoId`
   * preenchido, `fin_gravar_lancamento` faz UPDATE em vez de INSERT. Se a tela
   * não avisasse em que modo está, a pessoa pensaria estar criando um
   * lançamento novo e estaria sobrescrevendo um antigo.
   */
  const [editandoId, setEditandoId] = useState<string | null>(null);

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

  /** As até 4 sugestões da categoria, buscadas NO BANCO enquanto se digita. */
  const sugerirIdentificadoras = useCallback(async (texto: string) => {
    if (!tenantId) return [];
    return cadastroFinanceiroService.sugerirIdentificadoras(tenantId, texto);
  }, [tenantId]);

  /**
   * As até 4 sugestões da CONTA MOVIMENTO (pedido de 14/09/2026).
   *
   * ⚠️ A FUNÇÃO DO BANCO JÁ EXISTIA E NUNCA TINHA SIDO CHAMADA POR NINGUÉM.
   * `fin_buscar_contas_movimento` nasceu no degrau 7, com `LIKE '%texto%'` sobre
   * `nome_normalizado` e `LIMIT 4`, e com o par REVOKE+GRANT no lugar — era uma
   * tomada instalada esperando o aparelho. Este pedido só ligou o fio.
   */
  const sugerirContasMovimento = useCallback(async (texto: string) => {
    if (!tenantId) return [];
    return cadastroFinanceiroService.sugerirContasMovimento(tenantId, texto);
  }, [tenantId]);

  /**
   * Preenche as duas datas da conferência de uma vez (atalhos de mês).
   *
   * ⚠️ AS DUAS MUDANÇAS SÃO DO MESMO EVENTO, E ISSO IMPORTA. O React agrupa as
   * mudanças de estado disparadas dentro do mesmo clique numa renderização só
   * (automatic batching, React 18+), então o efeito que recarrega o extrato roda
   * UMA vez — e não uma por data. Se algum dia a lista piscar duas vezes por
   * clique, a correção é juntar `de` e `ate` num objeto único de período, não
   * remendar o efeito.
   */
  const definirPeriodo = useCallback((periodo: { de: string; ate: string }) => {
    setDe(periodo.de);
    setAte(periodo.ate);
  }, []);

  const limparFormulario = useCallback(() => {
    setEditandoId(null);
    setCategoriaId(""); setValor(0); setHistorico(""); setOrdem("");
  }, []);

  /**
   * Carrega um lançamento existente no formulário.
   *
   * ⚠️ O REGISTRO COMPLETO VEM DO BANCO, e não da linha que está na tela. O
   * extrato mostra entrada, saída e saldo — números já calculados. Ele não diz
   * o valor bruto, a propriedade nem o regime. Preencher o formulário com o que
   * está visível seria adivinhar, e gravar de volta o palpite corromperia o
   * lançamento em silêncio.
   */
  const editar = useCallback(async (lancamentoId: string) => {
    if (!tenantId) return;
    setErro(null); setAviso(null);
    try {
      const l = await lancamentoService.buscarPorId(tenantId, lancamentoId);
      if (!l) { setErro("LANÇAMENTO NÃO ENCONTRADO."); return; }

      // ⚠️ TRANSFERÊNCIA NÃO SE EDITA POR AQUI. Ela tem duas pernas amarradas
      // (RN-23); mexer numa deixaria a outra com valor ou data diferente, e o
      // saldo de uma das contas erraria para sempre. O caminho é excluir (o
      // banco apaga as duas) e lançar de novo.
      if (l.transferencia_id) {
        setErro("ESTE LANÇAMENTO É UMA PERNA DE TRANSFERÊNCIA E NÃO PODE SER EDITADO AQUI. EXCLUA-O (AS DUAS PERNAS SAEM JUNTAS) E LANCE A TRANSFERÊNCIA DE NOVO.");
        return;
      }

      setEditandoId(l.id);
      setContaId(l.conta_movimento_id);
      setCategoriaId(l.conta_identificadora_id);
      setData(l.data_movimento);
      setOrdem(l.ordem_extrato ?? "");
      setTipoMov(l.tipo_movimento);
      setPropriedade(l.propriedade);
      setRegime(l.regime);
      setValor(l.valor_centavos);
      setHistorico(l.historico ?? "");
      if (!contaExtrato) setContaExtrato(l.conta_movimento_id);
      setAviso("EDITANDO UM LANÇAMENTO EXISTENTE. GRAVAR VAI SUBSTITUIR O REGISTRO.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO ABRIR O LANÇAMENTO.");
    }
  }, [tenantId, contaExtrato]);

  /**
   * Quem chega em `/lancamentos/novo?editar=<id>` (vindo da tela PESQUISAR)
   * cai direto no formulário preenchido.
   *
   * ⚠️ SÓ DISPARA UMA VEZ, quando ainda não há nada em edição. Sem essa guarda,
   * qualquer nova renderização recarregaria o lançamento do banco e apagaria o
   * que a pessoa já tivesse digitado.
   */
  useEffect(() => {
    const pedido = parametros?.get("editar");
    if (!pedido || !tenantId || editandoId) return;
    const rodar = async () => { await editar(pedido); };
    rodar();
  }, [parametros, tenantId, editandoId, editar]);

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
        // `null` = lançamento novo; preenchido = o banco faz UPDATE (RN-12).
        id: editandoId,
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

      setAviso(editandoId ? "LANÇAMENTO ALTERADO." : "LANÇAMENTO REGISTRADO.");
      if (!editandoId) setGravadosNaSessao((n) => n + 1);

      // Mantém conta e data (que repetem em série) e limpa o resto — bônus N2.
      // Na edição, `limparFormulario` também zera o `editandoId`: a tela volta
      // ao modo "novo", senão a próxima gravação sobrescreveria o mesmo registro.
      limparFormulario();
      if (!contaExtrato) setContaExtrato(contaId);
      await carregarExtrato();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR O LANÇAMENTO.");
    } finally {
      setGravando(false);
    }
  };

  /**
   * Exclui um lançamento a partir do extrato.
   *
   * ⚠️ SE FOR PERNA DE TRANSFERÊNCIA, O BANCO APAGA AS DUAS (RN-23) — e a
   * resposta diz isso, para a tela avisar. Apagar só uma perna deixaria o saldo
   * de uma das contas errado para sempre.
   */
  const excluir = async (lancamentoId: string) => {
    if (!tenantId) return;
    if (!window.confirm("EXCLUIR ESTE LANÇAMENTO? SE FOR UMA TRANSFERÊNCIA, AS DUAS PERNAS SERÃO APAGADAS.")) return;
    setErro(null); setAviso(null);
    try {
      const r = await lancamentoService.excluir(tenantId, lancamentoId);
      setAviso(r.eraTransferencia
        ? `TRANSFERÊNCIA EXCLUÍDA: ${r.apagados} LANÇAMENTO(S) APAGADO(S).`
        : "LANÇAMENTO EXCLUÍDO.");
      // Se o que saiu era justamente o que estava aberto no formulário, o modo
      // de edição precisa cair junto — senão o botão gravaria um id que não
      // existe mais.
      if (editandoId === lancamentoId) limparFormulario();
      await carregarExtrato();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO EXCLUIR O LANÇAMENTO.");
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
    conferencia: {
      contaExtrato, setContaExtrato, de, setDe, ate, setAte,
      linhas, carregandoExtrato, definirPeriodo,
    },
    modal, setModal, gravando, erro, aviso, gravadosNaSessao,
    editandoId, editar, excluir, limparFormulario,
    sugerirIdentificadoras, sugerirContasMovimento,
    gravar, conferir, aoGravarCadastro,
  };
}
