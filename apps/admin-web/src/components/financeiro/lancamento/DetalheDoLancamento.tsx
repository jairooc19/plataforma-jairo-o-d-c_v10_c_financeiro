"use client";

import { formatarBRL, formatarDataBR, formatarDataHoraBR } from "@jairo/core";
import IconeFin from "../IconeFin";
import { useDetalheDoLancamento } from "./useDetalheDoLancamento";

/**
 * 🔎 A JANELA "DETALHE DO LANÇAMENTO" (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/lancamento/DetalheDoLancamento.tsx
 *
 * Pedido do dono do projeto em 16/09/2026: *"ao clicar em algum registro
 * retornado da pesquisa no banco de dados, apresentar todas as informações do
 * registro"*. Abre clicando numa linha do extrato da CONFERÊNCIA DA CONTA.
 *
 * ⚠️ ELA SÓ LÊ. Não edita, não exclui, não marca conferido — essas três já têm
 * dono na própria linha (o menu AÇÕES e a caixa OK). Uma janela que mostra e
 * também altera precisaria repetir aqui as permissões e as recusas do banco,
 * e seria a segunda cópia de uma regra que já existe.
 *
 * ⚠️ MOSTRA O QUE O EXTRATO NÃO CABIA MOSTRAR. As colunas da tabela são as de
 * um extrato bancário — data, ordem, entrada, saída, saldo. PROPRIEDADE,
 * REGIME, o TIPO gravado das duas contas (RN-10) e a marca de transferência
 * não cabem numa linha sem espremer as que importam para conferir o saldo.
 */
export default function DetalheDoLancamento({
  tenantId, lancamentoId, onFechar,
}: {
  tenantId: string | null;
  lancamentoId: string | null;
  onFechar: () => void;
}) {
  const { dado, carregando, erro } = useDetalheDoLancamento(tenantId, lancamentoId, onFechar);

  if (!lancamentoId) return null;

  /** O banco grava sem acento (PROPRIO, COMPETENCIA, SAIDA); a tela mostra com. */
  const comAcento = (v: string) =>
    ({ PROPRIO: "PRÓPRIO", TERCEIROS: "TERCEIROS", COMPETENCIA: "COMPETÊNCIA",
       CAIXA: "CAIXA", SAIDA: "SAÍDA", ENTRADA: "ENTRADA" } as Record<string, string>)[v] ?? v;

  const ehEntrada = dado?.tipo_movimento === "ENTRADA";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="DETALHE DO LANÇAMENTO"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-4 border-b border-slate-200">
          <h2 className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-slate-800">
            <IconeFin nome="ver" tamanho={18} traco={1.75} />
            DETALHE DO LANÇAMENTO
          </h2>
          <button
            type="button"
            onClick={onFechar}
            title="FECHAR (ESC)"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
          >
            <IconeFin nome="fechar" tamanho={17} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-5">
          {carregando && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-red-800">
              {erro}
            </div>
          )}

          {dado && (
            <dl className="divide-y divide-slate-100">
              <Campo rotulo="DATA DO MOVIMENTO" valor={formatarDataBR(dado.data_movimento)} />
              <Campo
                rotulo="ORDEM NO EXTRATO"
                valor={dado.ordem_extrato != null ? String(dado.ordem_extrato) : "SEM ORDEM — VAI PARA O FIM DO DIA"}
                fraco={dado.ordem_extrato == null}
              />
              <Campo rotulo="CONTA MOVIMENTO" valor={dado.conta_movimento?.nome ?? "—"} />
              <Campo rotulo="TIPO DA CONTA MOVIMENTO" valor={dado.tipo_conta_movimento} />
              <Campo rotulo="CONTA IDENTIFICADORA" valor={dado.conta_identificadora?.nome ?? "—"} />
              <Campo rotulo="TIPO DA IDENTIFICADORA" valor={dado.tipo_conta_identificadora} />
              <Campo
                rotulo="MOVIMENTO"
                valor={comAcento(dado.tipo_movimento)}
                cor={ehEntrada ? "text-emerald-700" : "text-red-700"}
              />
              <Campo
                rotulo="VALOR"
                valor={formatarBRL(dado.valor_centavos)}
                cor={ehEntrada ? "text-emerald-700" : "text-red-700"}
              />
              <Campo rotulo="PROPRIEDADE" valor={comAcento(dado.propriedade)} />
              <Campo rotulo="REGIME" valor={comAcento(dado.regime)} />
              <Campo rotulo="HISTÓRICO" valor={dado.historico || "—"} fraco={!dado.historico} />
              <Campo rotulo="CONFERIDO" valor={dado.conferido ? "SIM" : "NÃO"} />
              {/* A marca de transferência é a razão de EDITAR não ser oferecido
                  nesta linha: as duas pernas são amarradas (RN-23). */}
              <Campo
                rotulo="TRANSFERÊNCIA"
                valor={dado.transferencia_id
                  ? "SIM — É UMA DAS DUAS PERNAS; EXCLUIR APAGA AS DUAS (RN-23)"
                  : "NÃO"}
                fraco={!dado.transferencia_id}
              />
              <Campo
                rotulo="LANÇADO POR"
                valor={dado.usuario?.full_name || dado.usuario?.email || "—"}
                fraco={!dado.usuario}
              />
              <Campo rotulo="LANÇADO EM" valor={dado.created_at ? formatarDataHoraBR(dado.created_at) : "—"} />
              {/* ⚠️ "ÚLTIMA ALTERAÇÃO", e não "editado em": marcar como
                  conferido também é um UPDATE, e o gatilho carimba igual. */}
              <Campo
                rotulo="ÚLTIMA ALTERAÇÃO"
                valor={dado.updated_at ? formatarDataHoraBR(dado.updated_at) : "—"}
              />
              <Campo rotulo="IDENTIFICADOR" valor={dado.id} miudo />
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

/** Uma linha "rótulo à esquerda, valor à direita" da ficha. */
function Campo({ rotulo, valor, cor, fraco, miudo }: {
  rotulo: string; valor: string; cor?: string; fraco?: boolean; miudo?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[11px] font-black uppercase tracking-widest text-slate-400 shrink-0">{rotulo}</dt>
      <dd className={`text-right uppercase font-bold break-words ${
        miudo ? "text-[10px] font-mono lowercase text-slate-400"
              : `text-xs ${cor ?? (fraco ? "text-slate-400" : "text-slate-800")}`
      }`}>
        {valor}
      </dd>
    </div>
  );
}
