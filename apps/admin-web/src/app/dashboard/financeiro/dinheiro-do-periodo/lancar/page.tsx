"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cadastroFinanceiroService, lancamentoService, orcamentoService,
  competenciaDe, competenciaAtual, dataPadraoNaCompetencia, ehDataNaCompetencia,
  rotuloDoMes, hojeISO, ritmoDoMes,
  type ContaMovimento, type ContaIdentificadora, type LinhaDoDinheiro,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import SelecaoComBusca from "@/components/financeiro/SelecaoComBusca";
import CampoDinheiro from "@/components/financeiro/CampoDinheiro";
import BarraDeConsumo from "@/components/financeiro/orcamento/BarraDeConsumo";
import IconeFin from "@/components/financeiro/IconeFin";

/**
 * ✍️ TELA: LANÇAR A PARTIR DO DINHEIRO DO PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/dinheiro-do-periodo/lancar/page.tsx
 *
 * O "NOVO LANÇAMENTO" reduzido que o dono do projeto pediu. O que sai e o que
 * fica, e por quê:
 *
 *   ✗ TRANSFERÊNCIA   — pedido dele. Transferir não consome orçamento: é o
 *                       mesmo dinheiro mudando de lugar.
 *   ✗ ORDEM NO EXTRATO— pedido dele. ⚠️ Ela NÃO deixa de existir: o banco a
 *                       atribui sozinho (RN-11), mandando o lançamento para o
 *                       fim do dia. O que some é o campo. Se ela sumisse de
 *                       verdade, o extrato passaria a embaralhar lançamentos do
 *                       mesmo dia entre uma abertura e outra.
 *   ✗ REGIME          — fixo em CAIXA, pedido dele. E é coerente: o realizado
 *                       do orçamento só conta CAIXA (RN-19), então um
 *                       lançamento de COMPETÊNCIA não mexeria na barra.
 *   ⛔ TIPO DO MOVIMENTO — fixo pelo TIPO da conta: ENTRADA na receita, SAÍDA na
 *                       despesa. Em OUTRAS fica livre, porque "OUTRAS" existe
 *                       justamente para o que vai nos dois sentidos.
 *   ✓ CONTA MOVIMENTO — a única pergunta de verdade que sobra: de onde sai (ou
 *                       para onde entra) o dinheiro.
 *
 * ⚠️ A COLUNA DIREITA É A BARRA DAQUELA CONTA, e ela se atualiza a cada
 * gravação — foi o pedido ("ao gravar atualizar automaticamente a correlação").
 */
export default function LancarDoOrcamentoPage() {
  return (
    <Suspense fallback={<Girando />}>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const { carregando: carregandoContexto, erro: erroContexto, pode, tenantId } = useEmpresaAtiva();
  const parametros = useSearchParams();
  const router = useRouter();

  const contaIdentificadoraId = parametros?.get("conta") ?? "";
  const daUrl = parametros?.get("competencia");
  const competencia = daUrl && /^\d{4}-\d{2}-\d{2}$/.test(daUrl) ? competenciaDe(daUrl) : competenciaAtual();

  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [categoria, setCategoria] = useState<ContaIdentificadora | null>(null);
  const [linha, setLinha] = useState<LinhaDoDinheiro | null>(null);

  const [contaMovimentoId, setContaMovimentoId] = useState("");
  const [dataEscolhida, setData] = useState<string | null>(null);
  const [tipoMov, setTipoMov] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [propriedade, setPropriedade] = useState<"PROPRIO" | "TERCEIROS">("PROPRIO");
  const [valor, setValor] = useState(0);
  const [historico, setHistorico] = useState("");
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gravados, setGravados] = useState(0);

  const data = dataEscolhida ?? dataPadraoNaCompetencia(competencia, hojeISO());

  /** O tipo do movimento é decidido pelo TIPO da conta — e travado nos dois casos. */
  const tipoTravado = categoria?.tipo === "RECEITA" || categoria?.tipo === "DESPESA";

  /**
   * ⚠️ UM CONTADOR QUE SÓ CRESCE, e não um `useCallback` chamado de fora.
   *
   * A busca precisa ser refeita DEPOIS DE GRAVAR — e gravar não muda a conta
   * nem a competência, que são as dependências naturais do efeito. É a mesma
   * armadilha já documentada na sugestão de ordem do lançamento: prender um
   * efeito ao que MUDA falha quando a tela foi feita para NÃO mudar. Um número
   * que só cresce é o jeito de dizer "leia de novo, mesmo que nada pareça
   * diferente".
   *
   * (Um `useCallback` aqui também era recusado pelo compilador do React com
   * "existing memoization could not be preserved".)
   */
  const [releitura, setReleitura] = useState(0);

  useEffect(() => {
    const carregar = async () => {
      if (!tenantId || !contaIdentificadoraId) return;
      try {
        const [cm, ci, dp] = await Promise.all([
          cadastroFinanceiroService.listarContasMovimento(tenantId),
          cadastroFinanceiroService.listarIdentificadoras(tenantId, { incluirInativos: true }),
          orcamentoService.dinheiroDoPeriodo(tenantId, competencia),
        ]);
        const cat = ci.find((c) => c.id === contaIdentificadoraId) ?? null;
        setContas(cm);
        setCategoria(cat);
        setLinha(dp.find((l) => l.conta_id === contaIdentificadoraId) ?? null);
        if (cat?.tipo === "RECEITA") setTipoMov("ENTRADA");
        else if (cat?.tipo === "DESPESA") setTipoMov("SAIDA");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR.");
      }
    };
    carregar();
  }, [tenantId, contaIdentificadoraId, competencia, releitura]);

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;
  if (!pode("lc_criar")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA CRIAR LANÇAMENTOS. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }
  if (!contaIdentificadoraId) {
    return <Recado texto="ESTA TELA É ABERTA A PARTIR DO DINHEIRO DO PERÍODO, CLICANDO NUMA CONTA." />;
  }

  const gravar = async () => {
    if (!tenantId || !contaMovimentoId || valor <= 0) return;

    /**
     * ⚠️ O AVISO DA DATA FORA DA COMPETÊNCIA (bônus B7). Lançar 03/10 no
     * orçamento de setembro produz um lançamento VÁLIDO que não mexe na barra —
     * a pessoa conclui que a gravação falhou. Avisar, e não bloquear: pode ser
     * proposital.
     */
    if (!ehDataNaCompetencia(data, competencia)) {
      const texto =
        `A DATA ${data} ESTÁ FORA DE ${rotuloDoMes(competencia)}.\n\n` +
        `O LANÇAMENTO SERÁ GRAVADO, MAS NÃO VAI ENTRAR NESTA BARRA.\n\nCONFIRMA?`;
      if (!window.confirm(texto)) return;
    }

    setGravando(true);
    setErro(null);
    setAviso(null);
    try {
      await lancamentoService.gravar(tenantId, {
        id: null,
        conta_movimento_id: contaMovimentoId,
        conta_identificadora_id: contaIdentificadoraId,
        data_movimento: data,
        // ⚠️ `null` = o banco escolhe a próxima ordem do dia (RN-11).
        ordem_extrato: null,
        tipo_movimento: tipoMov,
        propriedade,
        regime: "CAIXA",
        valor_centavos: valor,
        historico: historico || null,
      });
      setAviso("LANÇAMENTO REGISTRADO. A BARRA AO LADO JÁ FOI ATUALIZADA.");
      setGravados((n) => n + 1);
      // mantém conta e data (que repetem em série) e limpa o resto
      setValor(0);
      setHistorico("");
      setReleitura((n) => n + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR O LANÇAMENTO.");
    } finally {
      setGravando(false);
    }
  };

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
            <IconeFin nome="novo" tamanho={26} traco={1.75} />
            LANÇAR EM {categoria?.nome ?? "—"}
          </h1>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
            {rotuloDoMes(competencia)} · {categoria?.tipo ?? ""}
            {gravados > 0 && ` · ${gravados} LANÇAMENTO(S) NESTA SESSÃO`}
          </p>
        </div>

        <button type="button"
                onClick={() => router.push(`/dashboard/financeiro/dinheiro-do-periodo?competencia=${competencia}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300
                           text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100">
          <IconeFin nome="voltar" tamanho={15} />
          VOLTAR
        </button>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{erro}</div>}
      {aviso && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800">{aviso}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ---------------- O FORMULÁRIO ---------------- */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="l-cm" className={rotulo}>CONTA MOVIMENTO</label>
            <SelecaoComBusca
              id="l-cm"
              valor={contaMovimentoId}
              opcoes={contas}
              aoEscolher={setContaMovimentoId}
              aoBuscar={async (texto) => tenantId
                ? cadastroFinanceiroService.sugerirContasMovimento(tenantId, texto)
                : []}
              placeholder="DIGITE PARA PROCURAR OU CLIQUE PARA VER A LISTA"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="l-data" className={rotulo}>DATA</label>
              <input id="l-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
              {!ehDataNaCompetencia(data, competencia) && (
                <p className="text-[10px] font-black uppercase text-amber-700 mt-1">
                  FORA DE {rotuloDoMes(competencia)} — NÃO ENTRA NESTA BARRA
                </p>
              )}
            </div>

            <div>
              <label htmlFor="l-valor" className={rotulo}>VALOR</label>
              <CampoDinheiro id="l-valor" valorCentavos={valor} onChange={setValor} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="l-tipo" className={rotulo}>TIPO DO MOVIMENTO</label>
              {tipoTravado ? (
                /* ⚠️ Travado, e mostrando o porquê: uma caixa cinza sem
                   explicação parece defeito. */
                <div className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200
                                text-sm font-black uppercase text-slate-700">
                  {tipoMov === "ENTRADA" ? "ENTRADA" : "SAÍDA"}
                  <span className="ml-2 text-[10px] font-bold text-slate-400">
                    FIXO PELO TIPO {categoria?.tipo}
                  </span>
                </div>
              ) : (
                <select id="l-tipo" value={tipoMov} className={campo}
                        onChange={(e) => setTipoMov(e.target.value as "ENTRADA" | "SAIDA")}>
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="SAIDA">SAÍDA</option>
                </select>
              )}
            </div>

            <div>
              <label htmlFor="l-prop" className={rotulo}>PROPRIEDADE</label>
              <select id="l-prop" value={propriedade} className={campo}
                      onChange={(e) => setPropriedade(e.target.value as "PROPRIO" | "TERCEIROS")}>
                <option value="PROPRIO">PRÓPRIO</option>
                <option value="TERCEIROS">TERCEIROS</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="l-hist" className={rotulo}>HISTÓRICO</label>
            <input id="l-hist" type="text" maxLength={200} value={historico}
                   onChange={(e) => setHistorico(e.target.value.toUpperCase())}
                   className={`${campo} uppercase`} />
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            REGIME FIXO EM CAIXA · A ORDEM NO EXTRATO É ESCOLHIDA PELO SISTEMA ·
            TRANSFERÊNCIA NÃO ENTRA NO ORÇAMENTO
          </p>

          <button type="button" onClick={gravar} disabled={gravando || !contaMovimentoId || valor <= 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white
                             text-xs font-black uppercase tracking-widest disabled:opacity-40">
            <IconeFin nome="salvar" tamanho={15} />
            {gravando ? "GRAVANDO…" : "GRAVAR"}
          </button>
        </section>

        {/* ---------------- A BARRA, QUE SE ATUALIZA ---------------- */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">
            ORÇAMENTO × REALIZADO
          </h2>

          {linha ? (
            <BarraDeConsumo linha={linha} ritmo={ritmoDoMes(competencia, hojeISO())} />
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                ESTA CONTA NÃO ESTÁ NO ORÇAMENTO DE {rotuloDoMes(competencia)}.
                O LANÇAMENTO SERÁ GRAVADO NORMALMENTE.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Girando() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function Recado({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-6
                    font-black uppercase text-amber-900 text-sm">
      <IconeFin nome="atencao" tamanho={20} traco={1.75} />
      <span>{texto}</span>
    </div>
  );
}
