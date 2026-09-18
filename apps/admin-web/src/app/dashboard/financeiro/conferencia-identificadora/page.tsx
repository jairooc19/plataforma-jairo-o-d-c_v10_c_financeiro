"use client";

import { Suspense } from "react";
import { cadastroFinanceiroService, formatarBRL, formatarDataBR } from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import { useConferenciaIdentificadora } from "@/components/financeiro/conferencia/useConferenciaIdentificadora";
import ExtratoDaIdentificadora from "@/components/financeiro/ExtratoDaIdentificadora";
import AtalhosDeMes from "@/components/financeiro/AtalhosDeMes";
import SelecaoComBusca from "@/components/financeiro/SelecaoComBusca";
import IconeFin from "@/components/financeiro/IconeFin";
import BotaoVoltar from "@/components/financeiro/conferencia/BotaoVoltar";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";

/**
 * 📊 TELA: CONFERÊNCIA DA CONTA IDENTIFICADORA (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/conferencia-identificadora/page.tsx
 *
 * Criada em 18/09/2026 a pedido do dono do projeto, "nos moldes da que já
 * existe da conta movimento". É o destino do clique no dashboard 2.
 *
 * ⚠️ O RODAPÉ DESTA TELA TEM DE SER IDÊNTICO À CÉLULA DO DASHBOARD. É o que faz
 * dela uma CONFERÊNCIA: o número de cima nasce dos números de baixo. Os dois
 * saem da mesma regra, no banco (`fin_extrato_identificadora` e
 * `fin_movimentos_mensais_identificadora` usam o mesmo sinal por tipo e o mesmo
 * filtro de regime CAIXA). Se um dia divergirem, há defeito — e a trava 40 do
 * `teste_financeiro.sql` compara os dois.
 *
 * ⚠️ NÃO EXISTE "SALDO INICIAL" AQUI, e a coluna da direita se chama ACUMULADO.
 * O porquê está em `ExtratoDaIdentificadora.tsx`.
 *
 * ⚠️ O `<Suspense>` É OBRIGATÓRIO e fica FORA do componente que lê a URL — a
 * mesma armadilha de build da tela "Novo Lançamento".
 */
export default function ConferenciaIdentificadoraPage() {
  return (
    <Suspense fallback={<Girando />}>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const { carregando: carregandoContexto, erro: erroContexto } = useEmpresaAtiva();
  const c = useConferenciaIdentificadora();
  const { pode, nomeEmpresa, tenantId } = c.ctx;

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;
  if (!pode("extrato_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER A CONFERÊNCIA. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  const semFiltro = !c.contaId || !c.de || !c.ate;
  const lancamentos = c.linhas.filter((l) => l.linha_tipo === "LANCAMENTO").length;
  const total = c.linhas.find((l) => l.linha_tipo === "TOTAL");
  const tipo = c.contaEscolhida?.tipo ?? "";

  const imprimir = () => abrirImpressao({
    titulo: "CONFERÊNCIA DA CONTA IDENTIFICADORA",
    empresa: nomeEmpresa,
    filtros: [
      `CONTA ${c.contaEscolhida?.nome ?? "—"}${tipo ? ` (${tipo})` : ""}`,
      `PERÍODO ${formatarDataBR(c.de)} A ${formatarDataBR(c.ate)}`,
      "REGIME CAIXA (COMPETÊNCIA NÃO ENTRA — RN-19)",
      tipo === "DESPESA"
        ? "O ACUMULADO SOMA AS SAÍDAS E DESCONTA AS ENTRADAS (ESTORNO REDUZ A DESPESA)"
        : "O ACUMULADO SOMA AS ENTRADAS E DESCONTA AS SAÍDAS",
    ],
    colunas: ["DATA", "ORDEM", "CONTA MOVIMENTO", "ENTRADA", "SAÍDA", "ACUMULADO", "HISTÓRICO", "USUÁRIO"],
    colunasNumericas: [3, 4, 5],
    linhas: c.linhas.map((l) => [
      formatarDataBR(l.data_movimento),
      l.ordem_extrato != null ? String(l.ordem_extrato) : "",
      l.conta_movimento ?? "",
      l.entrada_centavos != null ? formatarBRL(l.entrada_centavos, { semSimbolo: true }) : "",
      l.saida_centavos != null ? formatarBRL(l.saida_centavos, { semSimbolo: true }) : "",
      formatarBRL(l.acumulado_centavos, { semSimbolo: true }),
      l.historico ?? "",
      l.usuario ?? "",
    ]),
    rodape: `${lancamentos} LANÇAMENTO(S) · TOTAL DO PERÍODO ${formatarBRL(total?.acumulado_centavos ?? 0)}`,
  });

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
            <IconeFin nome="relatorio" tamanho={20} traco={1.75} />
            CONFERÊNCIA DA CONTA IDENTIFICADORA
          </h1>
          {nomeEmpresa && (
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">{nomeEmpresa}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
        {/* O mesmo par de botões da outra conferência, na mesma ordem. */}
        <BotaoVoltar />

        {pode("imprimir") && (
          <button type="button" onClick={imprimir} disabled={c.linhas.length === 0}
                  title={c.linhas.length === 0
                    ? "ESCOLHA A CONTA E O PERÍODO PARA HABILITAR A IMPRESSÃO"
                    : "IMPRIMIR A CONFERÊNCIA EXIBIDA"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white
                             text-xs font-black uppercase tracking-widest disabled:opacity-30 shrink-0">
            <IconeFin nome="imprimir" tamanho={15} />
            IMPRIMIR
          </button>
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label htmlFor="ci-conta" className={rotulo}>
            CONTA IDENTIFICADORA {tipo && <span className="text-slate-400">· {tipo}</span>}
          </label>
          <SelecaoComBusca
            id="ci-conta"
            valor={c.contaId}
            opcoes={c.categorias}
            aoEscolher={c.setContaId}
            aoBuscar={async (texto) => tenantId
              ? cadastroFinanceiroService.sugerirIdentificadoras(tenantId, texto)
              : []}
            placeholder="DIGITE PARA PROCURAR OU CLIQUE PARA VER A LISTA"
          />
        </div>

        <div>
          <label htmlFor="ci-de" className={rotulo}>DATA INICIAL</label>
          <input id="ci-de" type="date" value={c.de} onChange={(e) => c.setDe(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="ci-ate" className={rotulo}>DATA FINAL</label>
          <input id="ci-ate" type="date" value={c.ate} onChange={(e) => c.setAte(e.target.value)} className={campo} />
        </div>
      </div>

      <AtalhosDeMes id="ci-atalhos" de={c.de} ate={c.ate} aoEscolher={c.definirPeriodo} />

      {/* ⚠️ A frase muda com o TIPO da conta, porque a direção do acumulado
          muda com ele. Uma frase fixa ensinaria o errado em metade dos casos. */}
      {tipo && (
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {tipo === "DESPESA"
            ? "NESTA CONTA DE DESPESA, O ACUMULADO SOMA AS SAÍDAS E DESCONTA AS ENTRADAS — UM REEMBOLSO RECEBIDO REDUZ A DESPESA DO PERÍODO."
            : "O ACUMULADO SOMA AS ENTRADAS E DESCONTA AS SAÍDAS. ELE COMEÇA EM ZERO: CONTA IDENTIFICADORA NÃO TEM SALDO DE ABERTURA."}
        </p>
      )}

      {c.erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">
          {c.erro}
        </div>
      )}

      <ExtratoDaIdentificadora
        linhas={c.linhas}
        carregando={c.carregando}
        mensagem={semFiltro ? "INFORME A CONTA, A DATA INICIAL E A DATA FINAL." : null}
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
