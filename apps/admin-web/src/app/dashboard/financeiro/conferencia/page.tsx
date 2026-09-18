"use client";

import { Suspense, useState } from "react";
import {
  cadastroFinanceiroService, lancamentoService, formatarBRL, formatarDataBR,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import { useConferencia } from "@/components/financeiro/conferencia/useConferencia";
import ExtratoConsolidado from "@/components/financeiro/conferencia/ExtratoConsolidado";
import ExtratoDaConta from "@/components/financeiro/ExtratoDaConta";
import DetalheDoLancamento from "@/components/financeiro/lancamento/DetalheDoLancamento";
import AtalhosDeMes from "@/components/financeiro/AtalhosDeMes";
import SelecaoComBusca from "@/components/financeiro/SelecaoComBusca";
import IconeFin from "@/components/financeiro/IconeFin";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";

/**
 * 📊 TELA: CONFERÊNCIA DA CONTA — com endereço próprio (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/conferencia/page.tsx
 *
 * ⚠️ ESTA TELA **NÃO** ESTÁ NO MENU, e isso é cumprimento de uma decisão, não
 * esquecimento. Em 13/09/2026 ficou escrito em `menu/opcoes.ts` que não deve
 * haver entrada de menu para uma terceira tela de extrato, porque criaria "duas
 * respostas para a mesma pergunta". Continua havendo UMA porta no menu; o que
 * existe agora é um ATALHO, vindo do clique no dashboard.
 *
 * ⚠️ ELA EXIGE APENAS `extrato_ver` — e é esse o ponto inteiro dela. A
 * conferência que mora dentro de "Novo Lançamento" exige `lc_criar`, e quem só
 * confere (o contador, o sócio) bateria numa recusa que nem responde ao que
 * pediu.
 *
 * ⚠️ O `<Suspense>` ABAIXO É OBRIGATÓRIO E TEM DE FICAR **FORA** DO COMPONENTE
 * QUE LÊ A URL. `useSearchParams()` num componente cliente, sem um `<Suspense>`
 * acima, faz o `npm run build` FALHAR (não avisar) com "Missing Suspense
 * boundary with useSearchParams". Pôr o `<Suspense>` dentro do próprio
 * componente não resolve: o erro acontece ao renderizá-lo, antes de o
 * `<Suspense>` dele existir na árvore. Por isso a página está partida em duas.
 */
export default function ConferenciaPage() {
  return (
    <Suspense fallback={<Girando />}>
      <ConteudoDaConferencia />
    </Suspense>
  );
}

function ConteudoDaConferencia() {
  const { carregando: carregandoContexto, erro: erroContexto } = useEmpresaAtiva();
  const c = useConferencia();
  const { pode, nomeEmpresa, tenantId } = c.ctx;
  const [detalheId, setDetalheId] = useState<string | null>(null);

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;
  if (!pode("extrato_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER A CONFERÊNCIA DA CONTA. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  const somado = c.contasSomadas !== null;
  const linhasVisiveis = somado ? c.consolidado : c.linhas;
  const lancamentos = somado
    ? c.consolidado.filter((l) => l.linha_tipo === "LANCAMENTO").length
    : c.linhas.filter((l) => l.linha_tipo === "LANCAMENTO").length;
  const saldoFinal = linhasVisiveis.length > 0
    ? linhasVisiveis[linhasVisiveis.length - 1].saldo_centavos
    : 0;

  const semFiltro = !c.de || !c.ate || (!somado && !c.contaId);
  const nomeDoRecorte = somado ? c.tituloSomado : (c.contaEscolhida?.nome ?? "—");

  const conferir = async (lancamentoId: string, marcado: boolean) => {
    if (!tenantId) return;
    await lancamentoService.marcarConferido(tenantId, lancamentoId, marcado);
    await c.recarregar();
  };

  /**
   * ⚠️ A IMPRESSÃO USA A MESMA PEÇA DE SEMPRE (`abrirImpressao` + a guia
   * `/financeiro/imprimir`), e sai em RETRATO — aqui são 8 ou 9 colunas, que
   * cabem em pé. O papel deitado é dos dashboards, com 13 ou 14.
   */
  const imprimir = () => abrirImpressao({
    titulo: somado ? `CONFERÊNCIA SOMADA — ${c.tituloSomado}` : "CONFERÊNCIA DA CONTA",
    empresa: nomeEmpresa,
    filtros: [
      somado ? `CONTAS ${c.tituloSomado} (${c.contasSomadas?.length ?? 0} CONTAS SOMADAS)` : `CONTA ${nomeDoRecorte}`,
      `PERÍODO ${formatarDataBR(c.de)} A ${formatarDataBR(c.ate)}`,
      "REGIME CAIXA (o extrato ignora COMPETÊNCIA — RN-19)",
    ],
    colunas: somado
      ? ["DATA", "ORDEM", "CONTA MOVIMENTO", "CONTA IDENTIFICADORA", "ENTRADA", "SAÍDA", "SALDO", "HISTÓRICO", "USUÁRIO"]
      : ["DATA", "ORDEM", "CONTA IDENTIFICADORA", "ENTRADA", "SAÍDA", "SALDO", "HISTÓRICO", "USUÁRIO"],
    colunasNumericas: somado ? [4, 5, 6] : [3, 4, 5],
    linhas: somado
      ? c.consolidado.map((l) => [
          formatarDataBR(l.data_movimento),
          l.ordem_extrato != null ? String(l.ordem_extrato) : "",
          l.conta_movimento ?? "",
          l.identificadora ?? "",
          l.entrada_centavos != null ? formatarBRL(l.entrada_centavos, { semSimbolo: true }) : "",
          l.saida_centavos != null ? formatarBRL(l.saida_centavos, { semSimbolo: true }) : "",
          formatarBRL(l.saldo_centavos, { semSimbolo: true }),
          l.historico ?? "", l.usuario ?? "",
        ])
      : c.linhas.map((l) => [
          formatarDataBR(l.data_movimento),
          l.ordem_extrato != null ? String(l.ordem_extrato) : "",
          l.identificadora ?? "",
          l.entrada_centavos != null ? formatarBRL(l.entrada_centavos, { semSimbolo: true }) : "",
          l.saida_centavos != null ? formatarBRL(l.saida_centavos, { semSimbolo: true }) : "",
          formatarBRL(l.saldo_centavos, { semSimbolo: true }),
          l.historico ?? "", l.usuario ?? "",
        ]),
    rodape: `${lancamentos} LANÇAMENTO(S) · SALDO FINAL ${formatarBRL(saldoFinal)}`,
  });

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
            <IconeFin nome="relatorio" tamanho={20} traco={1.75} />
            {somado ? `CONFERÊNCIA SOMADA — ${c.tituloSomado}` : "CONFERÊNCIA DA CONTA"}
          </h1>
          {nomeEmpresa && (
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">{nomeEmpresa}</p>
          )}
        </div>

        {pode("imprimir") && (
          <button type="button" onClick={imprimir} disabled={linhasVisiveis.length === 0}
                  title={linhasVisiveis.length === 0
                    ? "ESCOLHA A CONTA E O PERÍODO PARA HABILITAR A IMPRESSÃO"
                    : "IMPRIMIR O EXTRATO EXIBIDO"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white
                             text-xs font-black uppercase tracking-widest disabled:opacity-30 shrink-0">
            <IconeFin nome="imprimir" tamanho={15} />
            IMPRIMIR
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label htmlFor="cf-conta" className={rotulo}>CONTA MOVIMENTO</label>
          {somado ? (
            /* No modo somado não há UMA conta: há o bloco inteiro. O botão
               desfaz, em vez de a pessoa ter de voltar ao dashboard. */
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200
                               text-xs font-black uppercase tracking-widest text-slate-700">
                {c.tituloSomado} · {c.contasSomadas?.length ?? 0} CONTA(S) SOMADA(S)
              </span>
              <button type="button" onClick={c.sairDoModoSomado}
                      className="text-[11px] font-black uppercase tracking-widest text-blue-700 hover:underline">
                CONFERIR UMA CONTA SÓ
              </button>
            </div>
          ) : (
            <SelecaoComBusca
              id="cf-conta"
              valor={c.contaId}
              opcoes={c.contas}
              aoEscolher={c.setContaId}
              aoBuscar={async (texto) => tenantId
                ? cadastroFinanceiroService.sugerirContasMovimento(tenantId, texto)
                : []}
              placeholder="DIGITE PARA PROCURAR OU CLIQUE PARA VER A LISTA"
            />
          )}
        </div>

        <div>
          <label htmlFor="cf-de" className={rotulo}>DATA INICIAL</label>
          <input id="cf-de" type="date" value={c.de} onChange={(e) => c.setDe(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="cf-ate" className={rotulo}>DATA FINAL</label>
          <input id="cf-ate" type="date" value={c.ate} onChange={(e) => c.setAte(e.target.value)} className={campo} />
        </div>
      </div>

      {/* Os MESMOS atalhos das outras telas, pelo mesmo componente. */}
      <AtalhosDeMes id="cf-atalhos" de={c.de} ate={c.ate} aoEscolher={c.definirPeriodo} />

      {c.erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">
          {c.erro}
        </div>
      )}

      {somado ? (
        <ExtratoConsolidado
          linhas={c.consolidado}
          carregando={c.carregando}
          mensagem={semFiltro ? "INFORME A DATA INICIAL E A DATA FINAL." : null}
        />
      ) : (
        <ExtratoDaConta
          linhas={c.linhas}
          carregando={c.carregando}
          mensagem={semFiltro ? "INFORME A CONTA, A DATA INICIAL E A DATA FINAL PARA VER O EXTRATO." : null}
          podeConciliar={pode("conciliar")}
          onConferir={conferir}
          onAbrirDetalhe={setDetalheId}
        />
      )}

      <DetalheDoLancamento
        tenantId={tenantId}
        lancamentoId={detalheId}
        onFechar={() => setDetalheId(null)}
      />
    </section>
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
