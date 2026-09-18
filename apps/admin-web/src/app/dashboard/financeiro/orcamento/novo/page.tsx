"use client";

import { Suspense } from "react";
import {
  cadastroFinanceiroService, formatarBRL, rotuloDoMes, agruparEmBlocos,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import { useOrcamento } from "@/components/financeiro/orcamento/useOrcamento";
import SeletorDeCompetencia from "@/components/financeiro/orcamento/SeletorDeCompetencia";
import ListaDoOrcamento from "@/components/financeiro/orcamento/ListaDoOrcamento";
import SelecaoComBusca from "@/components/financeiro/SelecaoComBusca";
import CampoDinheiro from "@/components/financeiro/CampoDinheiro";
import IconeFin from "@/components/financeiro/IconeFin";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";

/**
 * 🎯 TELA: ORÇAMENTO · + ADICIONAR NOVO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/orcamento/novo/page.tsx
 *
 * Os três campos que o dono do projeto pediu (competência, conta e valor) e,
 * logo abaixo, a CONFERÊNCIA DOS REGISTROS EXISTENTES da competência informada.
 *
 * ⚠️ O CAMPO DE CONTA É O MESMO DO "NOVO LANÇAMENTO" — literalmente o mesmo
 * componente (`SelecaoComBusca`) chamando a mesma função do banco
 * (`fin_buscar_identificadoras`, que ignora acento e limita a 4). Foi o pedido,
 * e é também o que impede duas buscas com comportamentos diferentes no mesmo
 * sistema.
 *
 * ⚠️ O `<Suspense>` É OBRIGATÓRIO e fica FORA do componente que lê a URL: a
 * competência pode chegar por `?competencia=`, vinda da tela PESQUISAR. Sem
 * ele, o `npm run build` falha com "Missing Suspense boundary".
 */
export default function OrcamentoNovoPage() {
  return (
    <Suspense fallback={<Girando />}>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const { carregando: carregandoContexto, erro: erroContexto } = useEmpresaAtiva();
  const o = useOrcamento();
  const { pode, nomeEmpresa, tenantId } = o.ctx;
  const f = o.formulario;

  if (carregandoContexto) return <Girando />;
  if (erroContexto) return <Recado texto={erroContexto} />;
  if (!pode("orc_ver")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA VER O ORÇAMENTO. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  const podeGravar = pode("orc_gravar");
  const contas = o.linhas.filter((l) => l.linha_tipo === "CONTA");

  const imprimir = () => {
    const blocos = agruparEmBlocos(o.linhas);
    const linhas: string[][] = [];
    const destaques: number[] = [];
    for (const b of blocos) {
      destaques.push(linhas.length);
      linhas.push([b.rotulo, "", ""]);
      for (const l of b.linhas) {
        linhas.push([
          (l.nome ?? "") + (l.is_active === false ? " (INATIVA)" : ""),
          l.observacao ?? "",
          formatarBRL(l.valor_centavos, { semSimbolo: true }),
        ]);
      }
      if (b.total) {
        destaques.push(linhas.length);
        linhas.push([`TOTAL ${b.rotulo}`, "", formatarBRL(b.total.valor_centavos, { semSimbolo: true })]);
      }
    }

    abrirImpressao({
      titulo: "ORÇAMENTO DE CONTA IDENTIFICADORA",
      empresa: nomeEmpresa,
      filtros: [`COMPETÊNCIA ${rotuloDoMes(o.competencia)}`],
      colunas: ["CONTA IDENTIFICADORA", "OBSERVAÇÃO", "VALOR ORÇADO"],
      colunasNumericas: [2],
      linhas,
      linhasDestaque: destaques,
      rodape: `${contas.length} CONTA(S) ORÇADA(S) · ${rotuloDoMes(o.competencia)}`,
    });
  };

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
          <IconeFin nome="orcamento" tamanho={26} traco={1.75} />
          ORÇAMENTO · ADICIONAR
        </h1>
        {pode("imprimir") && (
          <button type="button" onClick={imprimir} disabled={contas.length === 0}
                  title={contas.length === 0 ? "NÃO HÁ ORÇAMENTO NESTA COMPETÊNCIA" : "IMPRIMIR A CONFERÊNCIA"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white
                             text-xs font-black uppercase tracking-widest disabled:opacity-30">
            <IconeFin nome="imprimir" tamanho={15} />
            IMPRIMIR
          </button>
        )}
      </div>

      {o.erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{o.erro}</div>}
      {o.aviso && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800">{o.aviso}</div>}

      {/* ---------------- OS CAMPOS ---------------- */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <SeletorDeCompetencia
          id="o-comp"
          competencia={o.competencia}
          aoEscolher={o.trocarCompetencia}
          /* ⚠️ TRAVADA NA EDIÇÃO: mudar a competência de um registro em edição
             seria criar OUTRO orçamento, não editar este. */
          desabilitado={f.editandoId !== null}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="o-conta" className={rotulo}>CONTA IDENTIFICADORA DO MOVIMENTO</label>
            {f.editandoId ? (
              <div className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black uppercase text-slate-700">
                {o.categorias.find((c) => c.id === f.contaId)?.nome ?? "—"}
              </div>
            ) : (
              <SelecaoComBusca
                id="o-conta"
                valor={f.contaId}
                opcoes={o.categorias}
                aoEscolher={f.setContaId}
                aoBuscar={async (texto) => tenantId
                  ? cadastroFinanceiroService.sugerirIdentificadoras(tenantId, texto)
                  : []}
                placeholder="DIGITE PARA PROCURAR OU CLIQUE PARA VER A LISTA"
              />
            )}
          </div>

          <div>
            <label htmlFor="o-valor" className={rotulo}>VALOR DO ORÇAMENTO</label>
            <CampoDinheiro id="o-valor" valorCentavos={f.valor} onChange={f.setValor} />
          </div>
        </div>

        <div>
          <label htmlFor="o-obs" className={rotulo}>
            OBSERVAÇÃO <span className="text-slate-400">· OPCIONAL</span>
          </label>
          <input id="o-obs" type="text" maxLength={200} value={f.observacao}
                 onChange={(e) => f.setObservacao(e.target.value.toUpperCase())}
                 className={`${campo} uppercase`}
                 placeholder="AUMENTEI POR CAUSA DO REAJUSTE" />
        </div>

        {podeGravar && (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={o.gravar} disabled={f.gravando || !f.contaId || f.valor <= 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
              <IconeFin nome="salvar" tamanho={15} />
              {f.gravando ? "GRAVANDO…" : f.editandoId ? "ALTERAR" : "GRAVAR"}
            </button>

            {f.editandoId && (
              <button type="button" onClick={o.limpar}
                      className="px-6 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-700">
                CANCELAR A EDIÇÃO
              </button>
            )}

            {/* 🎁 BÔNUS B1 — sem isto, montar outubro é redigitar setembro inteiro. */}
            <button type="button" onClick={o.copiarDoMesAnterior}
                    title="TRAZER AS CONTAS ORÇADAS NO MÊS ANTERIOR, SEM ALTERAR AS QUE JÁ EXISTEM AQUI"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-700">
              <IconeFin nome="importar" tamanho={15} />
              COPIAR O MÊS ANTERIOR
            </button>
          </div>
        )}

        {/* 🎁 BÔNUS B9 — o que estava orçado no mês anterior e ainda falta aqui. */}
        {o.faltando.length > 0 && (
          <p className="text-[11px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            NO MÊS ANTERIOR VOCÊ ORÇOU {o.faltando.length} CONTA(S) QUE AINDA NÃO ESTÃO AQUI:{" "}
            {o.faltando.slice(0, 6).join(" · ")}
            {o.faltando.length > 6 ? ` · E MAIS ${o.faltando.length - 6}` : ""}
          </p>
        )}
      </section>

      {/* ---------------- A CONFERÊNCIA ---------------- */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">
          CONFERÊNCIA DOS REGISTROS EXISTENTES
        </h2>
        <p className="text-[11px] font-bold uppercase text-slate-400 mb-5">
          {rotuloDoMes(o.competencia)} · {contas.length} CONTA(S)
        </p>

        <ListaDoOrcamento
          linhas={o.linhas}
          carregando={o.carregando}
          podeEditar={podeGravar}
          podeExcluir={pode("orc_excluir")}
          aoEditar={o.editar}
          aoExcluir={o.excluir}
        />
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
