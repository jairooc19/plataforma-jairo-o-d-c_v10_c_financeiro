"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { anoInteiro, mesDoAno, type LinhaDaGrade } from "@jairo/core";
import { useDashboard } from "@/components/financeiro/dashboard/useDashboard";
import BarraDoAno from "@/components/financeiro/dashboard/BarraDoAno";
import GradeDoDashboard from "@/components/financeiro/dashboard/GradeDoDashboard";
import AcoesDoDashboard from "@/components/financeiro/dashboard/AcoesDoDashboard";
import IconeFin from "@/components/financeiro/IconeFin";

/**
 * 📊 DASHBOARD 2 — MOVIMENTO POR CONTA IDENTIFICADORA (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/dashboards/contas-identificadoras/page.tsx
 *
 * Cinco blocos, na ordem pedida: RECEITAS PRÓPRIAS (com total), RECEITAS DE
 * TERCEIROS (com total), DESPESAS (com total), RESULTADO, e OUTRAS (com total).
 *
 * ===========================================================================
 * ⚠️ AQUI NÃO EXISTE "SALDO", E A DIFERENÇA É DE CONCEITO
 * ===========================================================================
 * A conta movimento GUARDA dinheiro — tem saldo de abertura, e por isso tem
 * saldo. A conta identificadora EXPLICA dinheiro: ela não tem coluna nenhuma de
 * saldo no banco. "ENERGIA ELÉTRICA" não tem saldo, do mesmo jeito que o motivo
 * de uma viagem não tem quilometragem.
 *
 * Por isso cada célula aqui é o MOVIMENTO LÍQUIDO DO MÊS — março mostra o que
 * aconteceu em março, sem acumular. É o oposto exato do dashboard 1. E é isso
 * que faz a coluna TOTAL DO ANO existir aqui e não existir lá: somar doze
 * fluxos dá o fluxo do ano; somar doze saldos não dá nada.
 *
 * ⚠️ DESPESA APARECE COMO NÚMERO POSITIVO, e um reembolso recebido a REDUZ. É
 * como se lê um relatório ("ENERGIA 380,00", não "−380,00") e é contabilmente
 * correto — a RN-13 permite de propósito lançar ENTRADA numa conta de DESPESA.
 *
 * ⚠️ A RECEITA SÃO DOIS BLOCOS desde a 2ª rodada de 18/09/2026: PRÓPRIAS e DE
 * TERCEIROS, separadas pela `propriedade` do LANÇAMENTO — não do cadastro. Por
 * isso **a mesma conta pode aparecer nos dois**, com valores diferentes. Não é
 * duplicidade: é a informação que o pedido quer.
 *
 * ⚠️ A LINHA `RESULTADO` USA SÓ AS RECEITAS PRÓPRIAS, e ignora o bloco OUTRAS.
 * Dinheiro de terceiros entra no SALDO (está na conta) mas não é receita do
 * negócio; somá-lo — como somar aporte de sócio ou transferência — daria um
 * número que se parece com lucro e não é.
 *
 * ⚠️ O `<Suspense>` ABAIXO É OBRIGATÓRIO DESDE QUE O ANO PASSOU A CABER NA URL
 * (18/09/2026). Quem lê a URL é `useSearchParams()`, dentro de `useDashboard`,
 * e sem um `<Suspense>` ACIMA dele o `npm run build` FALHA — não avisa, falha:
 * "Missing Suspense boundary with useSearchParams". E ele tem de ficar FORA do
 * componente que chama o hook: pôr o `<Suspense>` dentro dele não resolve nada,
 * porque o erro acontece ao renderizá-lo, antes de o `<Suspense>` existir na
 * árvore. Por isso a página está partida em duas.
 */
export default function DashboardContasIdentificadorasPage() {
  return (
    <Suspense fallback={<Girando />}>
      <ConteudoDoDashboard />
    </Suspense>
  );
}

function ConteudoDoDashboard() {
  const d = useDashboard("identificadora");
  const router = useRouter();
  const { pode, nomeEmpresa, carregando: carregandoContexto, erro: erroContexto } = d.ctx;

  const abrir = (linha: LinhaDaGrade, periodo: { de: string; ate: string }) => {
    /**
     * ⚠️ A LINHA DE TOTAL NÃO ABRE NADA NESTE DASHBOARD, e é honesto dizer por
     * quê: no dashboard 1 o total abre o extrato das contas SOMADAS, porque
     * existe `fin_extrato_consolidado` — um extrato de várias contas movimento
     * tem saldo, e faz sentido. Um "extrato somado de várias identificadoras"
     * seria uma lista de lançamentos sem saldo nenhum, que a tela PESQUISAR já
     * faz melhor, com 13 filtros. Prometer o clique e entregar isso seria pior
     * do que não o oferecer.
     */
    if (linha.ehTotal || !linha.contaId) return;
    // O `voltar` leva o ano e o filtro — ver o comentário gêmeo no dashboard 1.
    router.push(
      `/dashboard/financeiro/conferencia-identificadora?${new URLSearchParams({
        conta: linha.contaId,
        ...periodo,
        voltar: d.enderecoAtual("/dashboard/financeiro/dashboards/contas-identificadoras"),
      })}`,
    );
  };

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;

  if (!pode("extrato_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER SALDOS. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  return (
    <div className="space-y-6">
      <BarraDoAno
        titulo="MOVIMENTO POR CONTA IDENTIFICADORA"
        ano={d.ano}
        aoTrocarAno={d.setAno}
        empresa={nomeEmpresa}
        acoes={
          <AcoesDoDashboard
            blocos={d.blocos}
            comTotalDoAno
            titulo="MOVIMENTO POR CONTA IDENTIFICADORA"
            empresa={nomeEmpresa}
            ano={d.ano}
            podeImprimir={pode("imprimir")}
            nomeDoArquivo="movimento-por-conta-identificadora"
            avisos={[
              "CADA CÉLULA É O MOVIMENTO LÍQUIDO DO MÊS (NÃO ACUMULA)",
              ...(d.ocultarTransferencias ? ["TRANSFERÊNCIA ENTRE CONTAS OCULTA NA TELA"] : []),
            ]}
          />
        }
      />

      {d.erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">
          {d.erro}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 max-w-3xl">
          CADA CÉLULA É O MOVIMENTO LÍQUIDO DAQUELE MÊS — NÃO É SALDO, E NÃO ACUMULA ·
          A DESPESA APARECE POSITIVA, E UM REEMBOLSO A REDUZ ·
          A RECEITA É SEPARADA POR PROPRIEDADE DO LANÇAMENTO, ENTÃO A MESMA CONTA PODE APARECER
          NOS DOIS BLOCOS ·
          CLIQUE NO NOME PARA CONFERIR O ANO, OU NA CÉLULA PARA CONFERIR O MÊS · SÓ REGIME CAIXA
        </p>

        {/* ⚠️ A caixa esconde a LINHA, mas o total continua contando tudo — é
            ele que tem de bater com a conferência. Por isso o rótulo diz
            "OCULTAR", e não "EXCLUIR DO CÁLCULO". */}
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 shrink-0">
          <input
            type="checkbox"
            checked={d.ocultarTransferencias}
            onChange={(e) => d.setOcultarTransferencias(e.target.checked)}
            className="w-4 h-4"
          />
          OCULTAR TRANSFERÊNCIA ENTRE CONTAS (O TOTAL CONTINUA CONTANDO)
        </label>
      </div>

      {d.carregando ? (
        <Girando />
      ) : d.vazio ? (
        <Recado texto={`NÃO HÁ LANÇAMENTOS EM ${d.ano}.`} />
      ) : (
        <GradeDoDashboard
          blocos={d.blocos}
          comTotalDoAno
          aoClicarNaConta={(linha) => abrir(linha, anoInteiro(d.ano))}
          aoClicarNaCelula={(linha, _bloco, mes) => abrir(linha, mesDoAno(d.ano, mes))}
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
