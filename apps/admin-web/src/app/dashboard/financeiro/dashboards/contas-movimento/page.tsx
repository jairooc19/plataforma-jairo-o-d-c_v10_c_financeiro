"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { anoInteiro, mesDoAno, type BlocoDaGrade, type LinhaDaGrade } from "@jairo/core";
import { useDashboard } from "@/components/financeiro/dashboard/useDashboard";
import BarraDoAno from "@/components/financeiro/dashboard/BarraDoAno";
import GradeDoDashboard from "@/components/financeiro/dashboard/GradeDoDashboard";
import AcoesDoDashboard from "@/components/financeiro/dashboard/AcoesDoDashboard";
import IconeFin from "@/components/financeiro/IconeFin";

/**
 * 📊 DASHBOARD 1 — SALDOS POR CONTA MOVIMENTO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/dashboards/contas-movimento/page.tsx
 *
 * Dois blocos, como o dono do projeto pediu: CAIXA e BANCO juntos (com um total
 * só) e OUTRAS (com o total dela). Doze meses, de janeiro a dezembro.
 *
 * ===========================================================================
 * ⚠️ CADA CÉLULA É UM SALDO, NÃO O MOVIMENTO DO MÊS
 * ===========================================================================
 * O valor de março é quanto havia na conta em 31 de março — ele já carrega
 * janeiro e fevereiro dentro. Mês sem lançamento nenhum REPETE o saldo
 * anterior; ele não zera nem some. A diferença entre duas células vizinhas é
 * que dá o movimento do mês.
 *
 * ⚠️ NÃO HÁ COLUNA "TOTAL DO ANO" AQUI, E ISSO NÃO É ESQUECIMENTO. Somar doze
 * saldos daria a soma de doze fotografias do MESMO dinheiro — um número que
 * nunca existiu. O número do ano já está na tela: é a coluna DEZEMBRO. A
 * explicação longa está em `dashboardRegras.ts`, no Core.
 *
 * ⚠️ ESTA TELA NÃO SOMA NADA. Os saldos e as linhas de TOTAL vêm prontos de
 * `fin_saldos_mensais_movimento`, numa única ida ao banco (e não doze por
 * conta). É o que garante que a tela, o papel impresso e o .TSV mostrem o
 * mesmo número.
 *
 * ⚠️ QUEM DECIDE SE O MÊS APARECE É A COLUNA, NÃO A LINHA (3ª rodada de
 * 18/09/2026). Basta UM lançamento em QUALQUER conta para que TODAS mostrem o
 * saldo daquele mês, inclusive as que ficaram paradas; e um mês sem lançamento
 * nenhum sai com a coluna inteira em 0,00. É o que faz a soma das células
 * bater com a linha de TOTAL nos dois casos — a 2ª rodada decidia conta a
 * conta, e ali o total contava um dinheiro que a tela não mostrava. O porquê
 * longo está em `CelulaDoMes.tsx`.
 *
 * 📖 Estudo: `_estudos/estudo-2026-09-18-dashboards-saldos-por-mes.html`.
 *
 * ⚠️ O `<Suspense>` ABAIXO É OBRIGATÓRIO DESDE QUE O ANO PASSOU A CABER NA URL
 * (18/09/2026). Quem lê a URL é `useSearchParams()`, dentro de `useDashboard`,
 * e sem um `<Suspense>` ACIMA dele o `npm run build` FALHA — não avisa, falha:
 * "Missing Suspense boundary with useSearchParams". E ele tem de ficar FORA do
 * componente que chama o hook: pôr o `<Suspense>` dentro dele não resolve nada,
 * porque o erro acontece ao renderizá-lo, antes de o `<Suspense>` existir na
 * árvore. Por isso a página está partida em duas.
 */
export default function DashboardContasMovimentoPage() {
  return (
    <Suspense fallback={<Girando />}>
      <ConteudoDoDashboard />
    </Suspense>
  );
}

function ConteudoDoDashboard() {
  const d = useDashboard("movimento");
  const router = useRouter();
  const { pode, nomeEmpresa, carregando: carregandoContexto, erro: erroContexto } = d.ctx;

  /**
   * ⚠️ O DESTINO É A TELA PRÓPRIA DA CONFERÊNCIA, E NÃO A "NOVO LANÇAMENTO".
   * A CONFERÊNCIA DA CONTA sempre morou dentro do formulário de lançar, e
   * aquela tela recusa quem não tem `lc_criar` com a mensagem "VOCÊ NÃO TEM
   * PERMISSÃO PARA CRIAR LANÇAMENTOS" — que, para quem só queria conferir, não
   * faz sentido nenhum. Quem mais precisa de um dashboard é justamente quem só
   * confere. Por isso o clique leva a `/financeiro/conferencia`, que exige
   * apenas `extrato_ver`.
   */
  const irParaConferencia = (params: Record<string, string>) => {
    // ⚠️ O `voltar` LEVA O ANO JUNTO. Sem ele, o botão VOLTAR traria o
    // dashboard certo com o ano errado — e quem tivesse navegado até 2023
    // recomeçaria o caminho, que é exatamente a reclamação que isto conserta.
    const destino = new URLSearchParams(params);
    destino.set("voltar", d.enderecoAtual("/dashboard/financeiro/dashboards/contas-movimento"));
    router.push(`/dashboard/financeiro/conferencia?${destino}`);
  };

  /** Os ids das contas de um bloco — o que a linha de TOTAL abre. */
  const contasDoBloco = (bloco: BlocoDaGrade) =>
    bloco.linhas.filter((l) => !l.ehTotal && l.contaId).map((l) => l.contaId!).join(",");

  const abrir = (linha: LinhaDaGrade, bloco: BlocoDaGrade, periodo: { de: string; ate: string }) => {
    if (linha.ehTotal) {
      // O total abre o extrato das contas do bloco SOMADAS (`fin_extrato_consolidado`).
      irParaConferencia({ contas: contasDoBloco(bloco), titulo: bloco.rotulo, ...periodo });
    } else if (linha.contaId) {
      irParaConferencia({ conta: linha.contaId, ...periodo });
    }
  };

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;

  if (!pode("extrato_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER SALDOS. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  return (
    <div className="space-y-6">
      <BarraDoAno
        titulo="SALDOS POR CONTA MOVIMENTO"
        ano={d.ano}
        aoTrocarAno={d.setAno}
        empresa={nomeEmpresa}
        acoes={
          <AcoesDoDashboard
            blocos={d.blocos}
            comTotalDoAno={false}
            titulo="SALDOS POR CONTA MOVIMENTO"
            empresa={nomeEmpresa}
            ano={d.ano}
            podeImprimir={pode("imprimir")}
            nomeDoArquivo="saldos-por-conta-movimento"
            ocultarSemLancamento
            avisos={[
              "CADA CÉLULA É O SALDO NO ÚLTIMO DIA DO MÊS (ACUMULADO)",
              "MÊS ZERADO NA COLUNA INTEIRA = NENHUM LANÇAMENTO NAQUELE MÊS, EM CONTA NENHUMA",
            ]}
          />
        }
      />

      {d.erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">
          {d.erro}
        </div>
      )}

      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        CADA CÉLULA É O SALDO NO ÚLTIMO DIA DAQUELE MÊS, ACUMULADO DESDE A ABERTURA DA CONTA ·
        MÊS SEM LANÇAMENTO EM CONTA NENHUMA APARECE ZERADO NA COLUNA INTEIRA; BASTA UM LANÇAMENTO
        EM QUALQUER CONTA PARA TODAS MOSTRAREM O SALDO DAQUELE MÊS ·
        CLIQUE NO NOME PARA CONFERIR O ANO INTEIRO, OU NA CÉLULA PARA CONFERIR AQUELE MÊS ·
        SÓ REGIME CAIXA
      </p>

      {d.carregando ? (
        <Girando />
      ) : d.vazio ? (
        <Recado texto={`NÃO HÁ CONTAS COM SALDO OU MOVIMENTO EM ${d.ano}.`} />
      ) : (
        <GradeDoDashboard
          blocos={d.blocos}
          comTotalDoAno={false}
          mostrarCadeado
          ocultarSemLancamento
          aoClicarNaConta={(linha, bloco) => abrir(linha, bloco, anoInteiro(d.ano))}
          aoClicarNaCelula={(linha, bloco, mes) => abrir(linha, bloco, mesDoAno(d.ano, mes))}
        />
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
