"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cadastroFinanceiroService, lancamentoService, extratoService,
  hojeISO, formatarBRL,
  type ContaMovimento, type ContaIdentificadora, type LinhaDoExtrato,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import CampoDinheiro from "@/components/financeiro/CampoDinheiro";
import ExtratoDaConta from "@/components/financeiro/ExtratoDaConta";
import ModalNovoCadastro from "@/components/financeiro/ModalNovoCadastro";

/**
 * ✍️ TELA: NOVO LANÇAMENTO + CONFERÊNCIA DA CONTA (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/lancamentos/novo/page.tsx
 *
 * A tela central do módulo (especificação, seções 12 e 13): o formulário à
 * esquerda, o extrato da conta à direita — para lançar conferindo contra o
 * extrato do banco, que é o propósito de tudo isto.
 *
 * ⚠️ DEPOIS DE GRAVAR, O EXTRATO É RECARREGADO SEMPRE. Não é só para mostrar o
 * novo lançamento: se a ordem informada já existia no dia, o banco DESLOCOU as
 * seguintes (RN-12) — outras linhas mudaram de posição, e a tela precisa
 * refletir isso.
 */
export default function NovoLancamentoPage() {
  const { carregando: carregandoContexto, tenantId, erro: erroContexto, pode } = useEmpresaAtiva();

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

  // --- conferência
  const [contaExtrato, setContaExtrato] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [linhas, setLinhas] = useState<LinhaDoExtrato[]>([]);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);
  const [saldoDaConta, setSaldoDaConta] = useState<number | null>(null);

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

  /** O extrato só aparece com as duas datas válidas (RN-17). */
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

  if (carregandoContexto) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }
  if (erroContexto) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">{erroContexto}</div>;
  }
  if (!pode("lc_criar")) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">
      VOCÊ NÃO TEM PERMISSÃO PARA CRIAR LANÇAMENTOS. FALE COM O PROPRIETÁRIO DA EMPRESA.
    </div>;
  }

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ================= COLUNA ESQUERDA: LANÇAMENTO ================= */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-black uppercase tracking-tight text-slate-800">NOVO LANÇAMENTO</h1>
          {gravadosNaSessao > 0 && (
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              {gravadosNaSessao} REGISTRADO(S) NESTA SESSÃO
            </span>
          )}
        </div>

        {erro && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-red-800">{erro}</div>}
        {aviso && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-emerald-800">{aviso}</div>}

        <div className="space-y-4">
          {/* CONTA MOVIMENTO + adicionar nova (modal) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="l-conta" className={rotulo.replace(" mb-1.5", "")}>CONTA MOVIMENTO</label>
              {pode("cm_gravar") && (
                <button type="button" onClick={() => setModal("movimento")}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600">+ ADICIONAR NOVA</button>
              )}
            </div>
            <select id="l-conta" value={contaId} onChange={(e) => setContaId(e.target.value)} className={`${campo} uppercase font-bold`}>
              <option value="">SELECIONE</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                TIPO: {contaEscolhida?.tipo ?? "—"}
              </span>
              {saldoDaConta !== null && (
                <span className="text-[11px] font-black uppercase text-slate-600">
                  SALDO ATUAL: {formatarBRL(saldoDaConta)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="l-data" className={rotulo}>DATA DO MOVIMENTO</label>
              <input id="l-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
            </div>
            <div>
              <label htmlFor="l-ordem" className={rotulo}>ORDEM NO EXTRATO</label>
              <input id="l-ordem" type="number" min={1} value={ordem}
                     onChange={(e) => setOrdem(e.target.value === "" ? "" : Number(e.target.value))}
                     className={campo} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="l-tipo" className={rotulo}>TIPO DO MOVIMENTO</label>
              <select id="l-tipo" value={tipoMov} onChange={(e) => setTipoMov(e.target.value as "ENTRADA" | "SAIDA")}
                      className={`${campo} font-bold`}>
                <option value="ENTRADA">ENTRADA</option>
                <option value="SAIDA">SAÍDA</option>
              </select>
            </div>
            <div>
              <label htmlFor="l-prop" className={rotulo}>PROPRIEDADE</label>
              <select id="l-prop" value={propriedade} onChange={(e) => setPropriedade(e.target.value as "PROPRIO" | "TERCEIROS")}
                      className={`${campo} font-bold`}>
                <option value="PROPRIO">PRÓPRIO</option>
                <option value="TERCEIROS">TERCEIROS</option>
              </select>
            </div>
            <div>
              <label htmlFor="l-regime" className={rotulo}>REGIME</label>
              <select id="l-regime" value={regime} onChange={(e) => setRegime(e.target.value as "CAIXA" | "COMPETENCIA")}
                      className={`${campo} font-bold`}>
                <option value="CAIXA">CAIXA</option>
                <option value="COMPETENCIA">COMPETÊNCIA</option>
              </select>
            </div>
          </div>

          {/* CONTA IDENTIFICADORA + adicionar nova */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="l-cat" className={rotulo.replace(" mb-1.5", "")}>CONTA IDENTIFICADORA DO MOVIMENTO</label>
              {pode("ci_gravar") && (
                <button type="button" onClick={() => setModal("identificadora")}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600">+ ADICIONAR NOVA</button>
              )}
            </div>
            <select id="l-cat" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={`${campo} uppercase font-bold`}>
              <option value="">SELECIONE</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <span className="text-[11px] font-bold uppercase text-slate-400">
              TIPO: {categoriaEscolhida?.tipo ?? "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="l-valor" className={rotulo}>VALOR DO LANÇAMENTO</label>
              <CampoDinheiro id="l-valor" valorCentavos={valor} onChange={setValor} />
            </div>
            <div>
              <label htmlFor="l-hist" className={rotulo}>HISTÓRICO DO MOVIMENTO</label>
              <input id="l-hist" type="text" maxLength={200} value={historico}
                     onChange={(e) => setHistorico(e.target.value.toUpperCase())}
                     className={`${campo} uppercase`} placeholder="OPCIONAL" />
            </div>
          </div>

          <button
            type="button"
            onClick={gravar}
            disabled={gravando || !contaId || !categoriaId || !data || valor <= 0}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            {gravando ? "GRAVANDO…" : "GRAVAR LANÇAMENTO"}
          </button>
        </div>
      </section>

      {/* ================= COLUNA DIREITA: CONFERÊNCIA ================= */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-800 mb-5">CONFERÊNCIA DA CONTA</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="sm:col-span-3">
            <label htmlFor="e-conta" className={rotulo}>CONTA MOVIMENTO</label>
            <select id="e-conta" value={contaExtrato} onChange={(e) => setContaExtrato(e.target.value)} className={`${campo} uppercase font-bold`}>
              <option value="">SELECIONE</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="e-de" className={rotulo}>DATA INICIAL</label>
            <input id="e-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} className={campo} />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="e-ate" className={rotulo}>DATA FINAL</label>
            <input id="e-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={campo} />
          </div>
        </div>

        <ExtratoDaConta
          linhas={linhas}
          carregando={carregandoExtrato}
          mensagem={!contaExtrato || !de || !ate ? "INFORME A CONTA, A DATA INICIAL E A DATA FINAL PARA VER O EXTRATO." : null}
          podeConciliar={pode("conciliar")}
          onConferir={conferir}
        />
      </section>

      {modal && (
        <ModalNovoCadastro
          variante={modal}
          tenantId={tenantId!}
          onFechar={() => setModal(null)}
          onGravado={async (id) => {
            setModal(null);
            await carregarListas();
            if (modal === "movimento") setContaId(id); else setCategoriaId(id);
          }}
        />
      )}
    </div>
  );
}
