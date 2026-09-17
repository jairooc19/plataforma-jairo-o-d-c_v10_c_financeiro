"use client";

import type { ContaMovimento } from "@jairo/core";
import IconeFin from "../IconeFin";
import AtalhosDeMes from "../AtalhosDeMes";
import { useExclusaoPorPeriodo } from "./useExclusaoPorPeriodo";

/**
 * 🗑️ EXCLUIR LANÇAMENTOS POR PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/ExclusaoPorPeriodo.tsx
 *
 * Pedido do dono do projeto em 17/09/2026.
 *
 * ⚠️ É A OPERAÇÃO MAIS DESTRUTIVA DO MÓDULO, e a tela foi desenhada em volta
 * disso. São DOIS passos obrigatórios, nunca um:
 *
 *   1. CONFERIR  → o banco diz quantos sairiam, sem apagar nada
 *   2. EXCLUIR   → só destrava depois de a pessoa DIGITAR o número conferido
 *
 * ⚠️ POR QUE DIGITAR O NÚMERO, E NÃO SÓ CLICAR EM "OK". Uma janela de "tem
 * certeza?" é clicada no automático — todos fazemos isso. Digitar 137 obriga a
 * duas coisas: LER o número e CONCORDAR com ele. Se apareceu 1.500 onde se
 * esperava 137, a digitação é o instante em que a pessoa percebe.
 *
 * ⚠️ A TELA NÃO CONTA NADA POR CONTA PRÓPRIA. O número vem da mesma função do
 * banco que apaga, percorrendo o mesmo conjunto. Se a tela contasse sozinha, um
 * dia mostraria 137 e o banco apagaria 141 — e o número da confirmação viraria
 * mentira. É a mesma razão pela qual o saldo do extrato é calculado no banco.
 *
 * ⚠️ E ELA NÃO AUTORIZA NADA: quem recusa é a `fin_excluir_lancamentos_por_periodo`,
 * que confere permissão (`lc_excluir_lote`), período fechado (RN-24) e a
 * integridade das transferências (RN-23) por dentro.
 */
export default function ExclusaoPorPeriodo({
  tenantId, contas, aoConcluir,
}: {
  tenantId: string | null;
  contas: ContaMovimento[];
  aoConcluir: () => void;
}) {
  const x = useExclusaoPorPeriodo(tenantId, aoConcluir);

  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-red-500 focus:outline-none";
  const rot = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";

  return (
    <section className="bg-white rounded-3xl border border-red-200 p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-red-700 mb-2">
        <IconeFin nome="excluir" tamanho={16} />
        EXCLUIR LANÇAMENTOS POR PERÍODO
      </h2>
      <p className="text-[11px] font-bold uppercase text-slate-500 mb-5">
        APAGA TODOS OS LANÇAMENTOS DE UM PERÍODO. NÃO FUNCIONA EM PERÍODO FECHADO.
        O QUE SAIR FICA NA LIXEIRA, ABAIXO.
      </p>

      {x.erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800 mb-4">
          {x.erro}
        </div>
      )}
      {x.feito && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800 mb-4">
          {x.feito}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label htmlFor="x-conta" className={rot}>CONTA</label>
          <select id="x-conta" value={x.contaId} onChange={(e) => x.setContaId(e.target.value)}
                  className={`${campo} uppercase font-bold`}>
            <option value="">TODAS AS CONTAS</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="x-de" className={rot}>DE</label>
          <input id="x-de" type="date" value={x.de} onChange={(e) => x.setDe(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="x-ate" className={rot}>ATÉ</label>
          <input id="x-ate" type="date" value={x.ate} onChange={(e) => x.setAte(e.target.value)} className={campo} />
        </div>
      </div>

      {/* Os mesmos atalhos da PESQUISAR e da CONFERÊNCIA — o mesmo componente. */}
      <div className="mt-3">
        <AtalhosDeMes id="x-atalhos" de={x.de} ate={x.ate} aoEscolher={x.setPeriodo} />
      </div>

      <button type="button" onClick={x.conferir}
              disabled={x.ocupado || !x.de || !x.ate}
              className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
        <IconeFin nome="pesquisar" tamanho={15} />
        {x.ocupado ? "CONFERINDO…" : "CONFERIR O QUE SERÁ EXCLUÍDO"}
      </button>

      {/* ------- O RELATÓRIO DA CONFERÊNCIA ------- */}
      {x.simulacao && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <ul className="space-y-1.5">
            {x.frases.map((f) => (
              <li key={f} className="text-xs font-bold uppercase text-amber-900">• {f}</li>
            ))}
          </ul>

          {x.simulacao.relatorio.lancamentos > 0 && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="x-confirma" className={rot}>
                  PARA CONFIRMAR, DIGITE {x.simulacao.relatorio.lancamentos}
                </label>
                <input id="x-confirma" type="text" inputMode="numeric"
                       value={x.confirmacao}
                       onChange={(e) => x.setConfirmacao(e.target.value)}
                       className={`${campo} w-40 font-mono`} placeholder="—" />
              </div>
              <button type="button" onClick={x.excluir}
                      disabled={!x.veredicto.podeExcluir || x.ocupado}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-30">
                <IconeFin nome="excluir" tamanho={15} />
                EXCLUIR DEFINITIVAMENTE
              </button>
            </div>
          )}
        </div>
      )}

      {/* O motivo de o botão estar desligado — nunca um botão morto e mudo. */}
      {x.simulacao && x.veredicto.aviso && (
        <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
          {x.veredicto.aviso}
        </p>
      )}
    </section>
  );
}
