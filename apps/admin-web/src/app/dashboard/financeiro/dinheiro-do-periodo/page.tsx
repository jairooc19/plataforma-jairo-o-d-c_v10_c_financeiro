"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatarBRL, rotuloDoMes, agruparEmBlocos,
  type LinhaDoDinheiro,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import { useDinheiroDoPeriodo } from "@/components/financeiro/orcamento/useDinheiroDoPeriodo";
import SeletorDeCompetencia from "@/components/financeiro/orcamento/SeletorDeCompetencia";
import BarraDeConsumo from "@/components/financeiro/orcamento/BarraDeConsumo";
import IconeFin from "@/components/financeiro/IconeFin";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";

/**
 * 💵 TELA: DINHEIRO DO PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/dinheiro-do-periodo/page.tsx
 *
 * O orçado contra o realizado da competência, em barras — na ordem RECEITAS →
 * DESPESAS → RESULTADO → OUTRAS, e no fim o bloco do gasto que ninguém planejou.
 *
 * ⚠️ QUANDO NÃO HÁ ORÇAMENTO, A TELA AVISA E OFERECE CRIAR (bônus B12). Só
 * avisar e parar deixaria a pessoa procurando onde se faz o orçamento.
 *
 * ⚠️ NO MODO "SÓ PERCENTUAL" OS VALORES NÃO CHEGAM NESTA TELA — eles não são
 * enviados pelo banco. Não há nada aqui escondendo número nenhum, e é esse o
 * ponto: o que a tela esconde já viajou até o navegador e se lê com a tecla F12.
 *
 * ⚠️ O `<Suspense>` É OBRIGATÓRIO e fica FORA do componente que lê a URL.
 */
export default function DinheiroDoPeriodoPage() {
  return (
    <Suspense fallback={<Girando />}>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const { carregando: carregandoContexto, erro: erroContexto } = useEmpresaAtiva();
  const d = useDinheiroDoPeriodo();
  const { pode, nomeEmpresa } = d.ctx;
  const router = useRouter();

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;
  if (!pode("dp_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER O DINHEIRO DO PERÍODO. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  const blocos = agruparEmBlocos(d.linhas);
  const contas = d.linhas.filter((l) => l.linha_tipo === "CONTA" && l.bloco !== "FORA");

  const abrirLancamento = (linha: LinhaDoDinheiro) => {
    if (!linha.conta_id || linha.bloco === "RESULTADO") return;
    router.push(
      `/dashboard/financeiro/dinheiro-do-periodo/lancar?${new URLSearchParams({
        conta: linha.conta_id,
        competencia: d.competencia,
      })}`,
    );
  };

  /** 🎁 O papel mostra o estado detalhado, como o dono do projeto pediu. */
  const imprimir = () => {
    const linhas: string[][] = [];
    const destaques: number[] = [];
    const v = (n: number | null) => (n === null ? "—" : formatarBRL(n, { semSimbolo: true }));

    for (const b of blocos) {
      destaques.push(linhas.length);
      linhas.push([b.rotulo, "", "", "", ""]);
      for (const l of b.linhas) {
        linhas.push([
          l.nome ?? "", v(l.orcado_centavos), v(l.realizado_centavos), v(l.saldo_centavos),
          l.consumo_percentual === null ? "—" : `${l.consumo_percentual}%`,
        ]);
      }
      if (b.total) {
        destaques.push(linhas.length);
        linhas.push([
          `TOTAL ${b.rotulo}`, v(b.total.orcado_centavos), v(b.total.realizado_centavos),
          v(b.total.saldo_centavos),
          b.total.consumo_percentual === null ? "—" : `${b.total.consumo_percentual}%`,
        ]);
      }
    }

    abrirImpressao({
      titulo: "ORÇAMENTO × REALIZADO",
      empresa: nomeEmpresa,
      filtros: [
        `COMPETÊNCIA ${rotuloDoMes(d.competencia)}`,
        "REGIME CAIXA (COMPETÊNCIA NÃO ENTRA — RN-19)",
        d.veValores ? "" : "MODO PERCENTUAL — OS VALORES NÃO SÃO EXIBIDOS PARA ESTE USUÁRIO",
      ].filter(Boolean),
      colunas: ["CONTA IDENTIFICADORA", "ORÇADO", "REALIZADO", "SALDO", "CONSUMO"],
      colunasNumericas: [1, 2, 3, 4],
      linhas,
      linhasDestaque: destaques,
      rodape: `${contas.length} CONTA(S) ORÇADA(S) · ${rotuloDoMes(d.competencia)} · ${d.ritmo}% DO MÊS DECORRIDO`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
            <IconeFin nome="dinheiroPeriodo" tamanho={26} traco={1.75} />
            DINHEIRO DO PERÍODO
          </h1>
          {nomeEmpresa && (
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
              {nomeEmpresa} · {rotuloDoMes(d.competencia)} · {d.ritmo}% DO MÊS DECORRIDO
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <SeletorDeCompetencia id="dp-comp" competencia={d.competencia} aoEscolher={d.setCompetencia} />
          {pode("imprimir") && (
            <button type="button" onClick={imprimir} disabled={contas.length === 0}
                    title={contas.length === 0 ? "NÃO HÁ ORÇAMENTO NESTA COMPETÊNCIA" : "IMPRIMIR O ESTADO ATUAL"}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white
                               text-xs font-black uppercase tracking-widest disabled:opacity-30">
              <IconeFin nome="imprimir" tamanho={15} />
              IMPRIMIR
            </button>
          )}
        </div>
      </div>

      {d.erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{d.erro}</div>}

      {/* ⚠️ O aviso do modo percentual é para a PESSOA, e não para o sistema.
          Ela precisa saber por que não está vendo números — senão vai achar que
          o sistema está com defeito. */}
      {!d.veValores && !d.carregando && (
        <p className="text-[11px] font-bold uppercase text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
          <IconeFin nome="ver" tamanho={13} className="inline mr-2" />
          O PROPRIETÁRIO LIBEROU PARA VOCÊ SOMENTE O PERCENTUAL DE CONSUMO. OS VALORES EM REAIS NÃO
          SÃO ENVIADOS A ESTA TELA.
        </p>
      )}

      {d.carregando ? (
        <Girando />
      ) : d.semOrcamento ? (
        /* 🎁 BÔNUS B12 — avisar E oferecer o caminho. */
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="flex justify-center mb-3 text-amber-500">
            <IconeFin nome="atencao" tamanho={30} traco={1.75} />
          </div>
          <p className="text-lg font-black uppercase text-slate-800 mb-2">
            NÃO EXISTE ORÇAMENTO PARA {rotuloDoMes(d.competencia)}
          </p>
          <p className="text-sm text-slate-500 font-medium mb-6">
            O DINHEIRO DO PERÍODO COMPARA O QUE VOCÊ PLANEJOU COM O QUE ACONTECEU — E O PLANO AINDA
            NÃO FOI FEITO PARA ESTE MÊS.
          </p>
          {pode("orc_gravar") && (
            <Link href={`/dashboard/financeiro/orcamento/novo?competencia=${d.competencia}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
              <IconeFin nome="novo" tamanho={15} />
              CRIAR O ORÇAMENTO DESTA COMPETÊNCIA
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {blocos.map((bloco) => (
            <section key={bloco.chave}
                     className={`rounded-3xl border p-6 shadow-sm ${
                       bloco.chave === "FORA"
                         ? "bg-amber-50/50 border-amber-200"
                         : "bg-white border-slate-200"}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-1">
                {bloco.rotulo}
              </h2>

              {/* ⚠️ O bloco FORA precisa se explicar: ele é o único que mostra
                  contas que NÃO estão no orçamento, e sem uma frase a pessoa
                  acharia que o orçamento dela cresceu sozinho. */}
              {bloco.chave === "FORA" && (
                <p className="text-[11px] font-bold uppercase text-amber-700 mb-4">
                  ESTAS CONTAS TIVERAM MOVIMENTO NESTA COMPETÊNCIA E NÃO ESTAVAM NO ORÇAMENTO.
                  ELAS NÃO ENTRAM NOS TOTAIS ACIMA.
                </p>
              )}

              <div className="space-y-5 mt-4">
                {bloco.linhas.map((l) => {
                  const clicavel = pode("lc_criar") && l.conta_id !== null;
                  return (
                    <div key={l.conta_id}
                         onClick={clicavel ? () => abrirLancamento(l) : undefined}
                         onKeyDown={clicavel ? (e) => { if (e.key === "Enter") abrirLancamento(l); } : undefined}
                         tabIndex={clicavel ? 0 : undefined}
                         title={clicavel ? "LANÇAR NESTA CONTA" : undefined}
                         className={`rounded-2xl p-3 -m-3 ${clicavel ? "cursor-pointer hover:bg-blue-50/40" : ""}`}>
                      <BarraDeConsumo linha={l} ritmo={d.ritmo} />
                    </div>
                  );
                })}
              </div>

              {bloco.total && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <BarraDeConsumo linha={{ ...bloco.total, nome: `TOTAL ${bloco.rotulo}` }} ritmo={d.ritmo} />
                </div>
              )}

              {/* O RESULTADO é uma linha só, sem contas — ele já vem como total. */}
              {bloco.chave === "RESULTADO" && bloco.total && (
                <p className="text-[11px] font-bold uppercase text-slate-400 mt-3">
                  RECEITAS PLANEJADAS MENOS DESPESAS PLANEJADAS, CONTRA O QUE DE FATO ACONTECEU.
                  O BLOCO OUTRAS NÃO ENTRA: APORTE E TRANSFERÊNCIA NÃO SÃO RESULTADO DO NEGÓCIO.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
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
