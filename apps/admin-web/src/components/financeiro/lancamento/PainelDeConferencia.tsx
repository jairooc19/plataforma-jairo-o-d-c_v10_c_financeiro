"use client";

import { formatarBRL, formatarDataBR } from "@jairo/core";
import ExtratoDaConta from "../ExtratoDaConta";
import IconeFin from "../IconeFin";
import { abrirImpressao } from "../prepararImpressao";
import type { useNovoLancamento } from "./useNovoLancamento";

/**
 * 📊 A COLUNA DIREITA: CONFERÊNCIA DA CONTA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/lancamento/PainelDeConferencia.tsx
 *
 * ⚠️ O BOTÃO IMPRIMIR ENTROU AQUI EM 13/09/2026. Ele existia na tela PESQUISAR
 * e faltava nesta — o dono do projeto notou e perguntou se só apareceria depois
 * de haver linhas. **A resposta era não: ele não existia de jeito nenhum.**
 * Agora existe, e o comportamento é o mesmo da PESQUISAR: fica visível o tempo
 * todo (para quem tem a permissão `imprimir`) e só HABILITA quando o extrato
 * traz linhas. Botão que some confunde; botão apagado ensina que falta algo.
 *
 * ⚠️ ELE NÃO CALCULA NADA. As colunas de dinheiro e o saldo vêm prontos da
 * função `fin_extrato` — os mesmos números da tela vão para o papel. Se a soma
 * fosse refeita aqui, o dia em que uma cópia fosse corrigida e a outra não
 * apareceriam dois saldos para o mesmo mês.
 */
export default function PainelDeConferencia({
  m,
}: {
  m: ReturnType<typeof useNovoLancamento>;
}) {
  const { conferencia: c, contas, contaDoExtrato } = m;
  const { pode, nomeEmpresa } = m.ctx;

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  /** Só as linhas de lançamento entram na contagem do rodapé. */
  const lancamentos = c.linhas.filter((l) => l.linha_tipo === "LANCAMENTO");
  const saldoFinal = c.linhas.length > 0 ? c.linhas[c.linhas.length - 1].saldo_centavos : 0;

  const imprimir = () =>
    abrirImpressao({
      titulo: "CONFERÊNCIA DA CONTA",
      empresa: nomeEmpresa,
      filtros: [
        `CONTA ${contaDoExtrato?.nome ?? "—"}`,
        `PERÍODO ${formatarDataBR(c.de)} A ${formatarDataBR(c.ate)}`,
        "REGIME CAIXA (o extrato ignora COMPETÊNCIA — RN-19)",
      ],
      colunas: ["DATA", "ORDEM", "CONTA IDENTIFICADORA", "ENTRADA", "SAÍDA", "SALDO", "HISTÓRICO", "USUÁRIO"],
      colunasNumericas: [3, 4, 5],
      linhas: c.linhas.map((l) => [
        formatarDataBR(l.data_movimento),
        l.ordem_extrato != null ? String(l.ordem_extrato) : "",
        l.identificadora ?? "",
        l.entrada_centavos != null ? formatarBRL(l.entrada_centavos, { semSimbolo: true }) : "",
        l.saida_centavos != null ? formatarBRL(l.saida_centavos, { semSimbolo: true }) : "",
        formatarBRL(l.saldo_centavos, { semSimbolo: true }),
        l.historico ?? "",
        l.usuario ?? "",
      ]),
      rodape: `${lancamentos.length} LANÇAMENTO(S) · SALDO FINAL ${formatarBRL(saldoFinal)}`,
    });

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
          <IconeFin nome="relatorio" tamanho={20} traco={1.75} />
          CONFERÊNCIA DA CONTA
        </h2>

        {pode("imprimir") && (
          <button
            type="button"
            onClick={imprimir}
            disabled={c.linhas.length === 0}
            title={c.linhas.length === 0
              ? "ESCOLHA A CONTA E O PERÍODO PARA HABILITAR A IMPRESSÃO"
              : "IMPRIMIR O EXTRATO EXIBIDO"}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white
                       text-xs font-black uppercase tracking-widest disabled:opacity-30 shrink-0"
          >
            <IconeFin nome="imprimir" tamanho={15} />
            IMPRIMIR
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="sm:col-span-3">
          <label htmlFor="e-conta" className={rotulo}>CONTA MOVIMENTO</label>
          <select id="e-conta" value={c.contaExtrato} onChange={(e) => c.setContaExtrato(e.target.value)}
                  className={`${campo} uppercase font-bold`}>
            <option value="">SELECIONE</option>
            {contas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="e-de" className={rotulo}>DATA INICIAL</label>
          <input id="e-de" type="date" value={c.de} onChange={(e) => c.setDe(e.target.value)} className={campo} />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="e-ate" className={rotulo}>DATA FINAL</label>
          <input id="e-ate" type="date" value={c.ate} onChange={(e) => c.setAte(e.target.value)} className={campo} />
        </div>
      </div>

      {/* ⚠️ AS PERMISSÕES AQUI SÓ DESENHAM O MENU. Quem recusa de verdade é
          `fin_gravar_lancamento` / `fin_excluir_lancamento`, que chamam
          `fin_pode()` dentro do banco (RN-25). Mostrar EDITAR a quem só tem
          `lc_editar_proprios` e o lançamento é de outro é aceitável: o banco
          recusa e a tela mostra o motivo. Esconder não seria segurança —
          seria conforto, como todo o resto desta camada. */}
      <ExtratoDaConta
        linhas={c.linhas}
        carregando={c.carregandoExtrato}
        mensagem={!c.contaExtrato || !c.de || !c.ate
          ? "INFORME A CONTA, A DATA INICIAL E A DATA FINAL PARA VER O EXTRATO."
          : null}
        podeConciliar={pode("conciliar")}
        onConferir={m.conferir}
        podeEditar={pode("lc_editar_todos") || pode("lc_editar_proprios")}
        podeExcluir={pode("lc_excluir_todos") || pode("lc_excluir_proprios")}
        onEditar={m.editar}
        onExcluir={m.excluir}
      />
    </section>
  );
}
