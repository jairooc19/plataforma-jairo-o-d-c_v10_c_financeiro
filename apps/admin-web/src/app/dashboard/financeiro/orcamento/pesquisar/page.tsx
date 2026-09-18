"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cadastroFinanceiroService, orcamentoService, formatarBRL, rotuloDoMes,
  competenciaAtual, competenciaDoMes, anoDe,
  type ContaIdentificadora, type CompetenciaOrcada,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import SeletorDeCompetencia from "@/components/financeiro/orcamento/SeletorDeCompetencia";
import SelecaoComBusca from "@/components/financeiro/SelecaoComBusca";
import IconeFin from "@/components/financeiro/IconeFin";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";

/**
 * 🔎 TELA: ORÇAMENTO · PESQUISAR (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/orcamento/pesquisar/page.tsx
 *
 * Os dois filtros que o dono do projeto pediu (competência e conta), e a lista
 * das competências existentes. Clicar numa linha abre a CONFERÊNCIA daquela
 * competência — a mesma tela de "+ ADICIONAR NOVO", já no mês certo.
 *
 * ⚠️ AS COLUNAS DE TOTAL NÃO ESTAVAM NO PEDIDO, e entraram por necessidade: sem
 * elas a lista seria uma coluna de meses e nada mais, e a pessoa teria de abrir
 * um por um só para saber onde está o dinheiro.
 *
 * ⚠️ E O FILTRO DE CONTA MUDA O SENTIDO DA LISTA — a tela avisa quando ele está
 * ligado. Sem o aviso, "SETEMBRO / 2026 · 1 conta · 400,00" seria lido como "o
 * orçamento de setembro é de 400,00".
 *
 * ⚠️ NÃO HÁ `<Suspense>` AQUI porque esta tela NÃO lê a URL — ela escreve nela,
 * ao navegar. Quem lê é a tela de destino.
 */
export default function OrcamentoPesquisarPage() {
  const { carregando: carregandoContexto, erro: erroContexto, pode, tenantId, nomeEmpresa } = useEmpresaAtiva();
  const router = useRouter();

  const [de, setDe] = useState(() => competenciaDoMes(anoDe(competenciaAtual()), 1));
  const [ate, setAte] = useState(() => competenciaDoMes(anoDe(competenciaAtual()), 12));
  const [contaId, setContaId] = useState("");
  const [categorias, setCategorias] = useState<ContaIdentificadora[]>([]);
  const [linhas, setLinhas] = useState<CompetenciaOrcada[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return;
      const lista = await cadastroFinanceiroService.listarIdentificadoras(tenantId, { incluirInativos: true });
      setCategorias(lista);
    };
    carregar();
  }, [tenantId]);

  const pesquisar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await orcamentoService.competencias(tenantId, {
        de, ate, contaIdentificadoraId: contaId || null,
      });
      setLinhas(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA NA PESQUISA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, de, ate, contaId]);

  useEffect(() => {
    const rodar = async () => { await pesquisar(); };
    rodar();
  }, [pesquisar]);

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;
  if (!pode("orc_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER O ORÇAMENTO. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  const competencias = linhas.filter((l) => l.competencia !== null);
  const total = linhas.find((l) => l.competencia === null) ?? null;
  const nomeDaConta = categorias.find((c) => c.id === contaId)?.nome ?? null;

  const imprimir = () => abrirImpressao({
    titulo: "ORÇAMENTO · COMPETÊNCIAS",
    empresa: nomeEmpresa,
    filtros: [
      `DE ${rotuloDoMes(de)} A ${rotuloDoMes(ate)}`,
      nomeDaConta ? `SOMENTE A CONTA ${nomeDaConta} — OS TOTAIS SÃO DELA` : "TODAS AS CONTAS",
    ],
    colunas: ["COMPETÊNCIA", "CONTAS", "RECEITAS", "DESPESAS", "OUTRAS", "TOTAL"],
    colunasNumericas: [1, 2, 3, 4, 5],
    linhas: linhas.map((l) => [
      l.competencia ? rotuloDoMes(l.competencia) : "TOTAL DO PERÍODO",
      String(l.contas),
      formatarBRL(l.receitas_centavos, { semSimbolo: true }),
      formatarBRL(l.despesas_centavos, { semSimbolo: true }),
      formatarBRL(l.outras_centavos, { semSimbolo: true }),
      formatarBRL(l.total_centavos, { semSimbolo: true }),
    ]),
    linhasDestaque: total ? [linhas.length - 1] : [],
    rodape: `${competencias.length} COMPETÊNCIA(S)`,
  });

  const abrir = (competencia: string) =>
    router.push(`/dashboard/financeiro/orcamento/novo?competencia=${competencia}`);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
        <IconeFin nome="pesquisar" tamanho={26} traco={1.75} />
        ORÇAMENTO · PESQUISAR
      </h1>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{erro}</div>}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SeletorDeCompetencia id="p-de" rotulo="COMPETÊNCIA DE" competencia={de} aoEscolher={setDe} />
          <SeletorDeCompetencia id="p-ate" rotulo="COMPETÊNCIA ATÉ" competencia={ate} aoEscolher={setAte} />
        </div>

        <div>
          <label htmlFor="p-conta" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            CONTA IDENTIFICADORA DO MOVIMENTO <span className="text-slate-400">· DEIXE VAZIO PARA TODAS</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px]">
              <SelecaoComBusca
                id="p-conta"
                valor={contaId}
                opcoes={categorias}
                aoEscolher={setContaId}
                aoBuscar={async (texto) => tenantId
                  ? cadastroFinanceiroService.sugerirIdentificadoras(tenantId, texto)
                  : []}
                placeholder="TODAS AS CONTAS"
              />
            </div>
            {contaId && (
              <button type="button" onClick={() => setContaId("")}
                      className="text-[11px] font-black uppercase tracking-widest text-blue-700 hover:underline">
                LIMPAR O FILTRO
              </button>
            )}
            {pode("imprimir") && (
              <button type="button" onClick={imprimir} disabled={competencias.length === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-30">
                <IconeFin nome="imprimir" tamanho={15} />
                IMPRIMIR
              </button>
            )}
          </div>
        </div>

        {/* ⚠️ O aviso que impede a leitura errada dos totais. */}
        {nomeDaConta && (
          <p className="text-[11px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            MOSTRANDO SOMENTE A CONTA {nomeDaConta} — OS TOTAIS SÃO DELA, NÃO DA COMPETÊNCIA INTEIRA.
          </p>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
        {carregando ? (
          <p className="text-sm text-slate-400 font-bold uppercase">CARREGANDO…</p>
        ) : competencias.length === 0 ? (
          <p className="text-sm text-slate-400 font-bold uppercase">
            NENHUMA COMPETÊNCIA COM ORÇAMENTO NESTE PERÍODO.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                {["COMPETÊNCIA", "CONTAS", "RECEITAS", "DESPESAS", "OUTRAS", "TOTAL"].map((c, i) => (
                  <th key={c} className={`px-2 py-2 font-black uppercase tracking-widest text-slate-400
                                          border-b border-slate-200 whitespace-nowrap ${i > 0 ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencias.map((l) => (
                <tr key={l.competencia}
                    onClick={() => abrir(l.competencia!)}
                    onKeyDown={(e) => { if (e.key === "Enter") abrir(l.competencia!); }}
                    tabIndex={0}
                    title="ABRIR A CONFERÊNCIA DESTA COMPETÊNCIA"
                    className="hover:bg-blue-50/40 cursor-pointer">
                  <td className="px-2 py-2 uppercase font-bold text-slate-700 border-b border-slate-100 whitespace-nowrap">
                    {rotuloDoMes(l.competencia!)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100">{l.contas}</td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-emerald-700">
                    {formatarBRL(l.receitas_centavos, { semSimbolo: true })}
                  </td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-red-700">
                    {formatarBRL(l.despesas_centavos, { semSimbolo: true })}
                  </td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100 text-slate-600">
                    {formatarBRL(l.outras_centavos, { semSimbolo: true })}
                  </td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100 font-bold text-slate-800">
                    {formatarBRL(l.total_centavos, { semSimbolo: true })}
                  </td>
                </tr>
              ))}

              {/* 🎁 BÔNUS B5 — somar competências faz sentido: orçamento é FLUXO. */}
              {total && (
                <tr className="bg-slate-50 font-black">
                  <td className="px-2 py-2 uppercase text-slate-800 border-b border-slate-100">TOTAL DO PERÍODO</td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100">{total.contas}</td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100">{formatarBRL(total.receitas_centavos, { semSimbolo: true })}</td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100">{formatarBRL(total.despesas_centavos, { semSimbolo: true })}</td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100">{formatarBRL(total.outras_centavos, { semSimbolo: true })}</td>
                  <td className="px-2 py-2 text-right font-mono border-b border-slate-100">{formatarBRL(total.total_centavos, { semSimbolo: true })}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
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
