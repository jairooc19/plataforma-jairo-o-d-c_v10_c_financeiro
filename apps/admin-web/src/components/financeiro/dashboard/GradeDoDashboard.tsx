"use client";

import { formatarBRL, MESES_CURTOS, type BlocoDaGrade, type LinhaDaGrade } from "@jairo/core";
import CelulaDoMes from "./CelulaDoMes";

/**
 * 📊 A GRADE DE 12 MESES — usada pelos DOIS dashboards (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/dashboard/GradeDoDashboard.tsx
 *
 * ⚠️ ELA NÃO SOMA NADA E NÃO ORDENA NADA. As linhas, os totais e a ordem vêm
 * prontos do Core, que os recebeu do banco. O que este arquivo faz é desenhar —
 * e é por isso que o mesmo componente serve às duas telas, que mostram coisas
 * diferentes com a mesma forma.
 *
 * ⚠️ A PRIMEIRA COLUNA É CONGELADA (`sticky left-0`). Com 13 ou 14 colunas, ao
 * rolar para ver dezembro o nome da conta sairia da tela — e a pessoa perderia
 * de quem é a linha justamente quando está comparando números. É o defeito
 * clássico de tabela larga, e o conserto é uma classe de CSS.
 *
 * ⚠️ O NOME DA CONTA E A CÉLULA LEVAM A LUGARES DIFERENTES, de propósito: o
 * nome abre a conferência do ANO INTEIRO; a célula, a do MÊS daquela coluna. É
 * o que o dono do projeto pediu, e é o que faz o dashboard ser um índice do
 * extrato, e não um quadro morto.
 */
export default function GradeDoDashboard({
  blocos, comTotalDoAno, aoClicarNaConta, aoClicarNaCelula, mostrarCadeado = false,
}: {
  blocos: BlocoDaGrade[];
  comTotalDoAno: boolean;
  /** Ausente = nada é clicável (quem não tem `extrato_ver` não chega aqui). */
  aoClicarNaConta?: (linha: LinhaDaGrade, bloco: BlocoDaGrade) => void;
  aoClicarNaCelula?: (linha: LinhaDaGrade, bloco: BlocoDaGrade, mes: number) => void;
  mostrarCadeado?: boolean;
}) {
  return (
    <div className="space-y-8">
      {blocos.map((bloco) => (
        <section key={bloco.chave} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
            {bloco.rotulo}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="sticky left-0 z-10 bg-white px-2 py-2 font-black uppercase tracking-widest
                                 text-slate-400 border-b border-slate-200 whitespace-nowrap min-w-[190px]">
                    CONTA
                  </th>
                  {MESES_CURTOS.map((m) => (
                    <th key={m} className="px-2 py-2 text-right font-black uppercase tracking-widest
                                           text-slate-400 border-b border-slate-200 whitespace-nowrap">
                      {m}
                    </th>
                  ))}
                  {comTotalDoAno && (
                    <th className="px-2 py-2 text-right font-black uppercase tracking-widest
                                   text-slate-500 border-b border-slate-200 whitespace-nowrap">
                      TOTAL DO ANO
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {bloco.linhas.map((linha) => {
                  const abrirConta = aoClicarNaConta ? () => aoClicarNaConta(linha, bloco) : undefined;
                  return (
                    <tr key={linha.chave} className={linha.ehTotal ? "bg-slate-50" : "hover:bg-blue-50/30"}>
                      {/* O NOME — congelado à esquerda e clicável. */}
                      <th
                        scope="row"
                        onClick={abrirConta}
                        onKeyDown={abrirConta ? (e) => { if (e.key === "Enter") abrirConta(); } : undefined}
                        tabIndex={abrirConta ? 0 : undefined}
                        title={abrirConta
                          ? "VER A CONFERÊNCIA DESTA CONTA NO ANO INTEIRO"
                          : undefined}
                        className={[
                          "sticky left-0 z-10 px-2 py-2 text-left uppercase whitespace-nowrap",
                          "border-b border-slate-100 font-bold",
                          linha.ehTotal ? "bg-slate-50 font-black text-slate-800" : "bg-white text-slate-700",
                          abrirConta ? "cursor-pointer hover:text-blue-700" : "",
                        ].join(" ")}
                      >
                        {linha.nome}
                        {/* ⚠️ A conta DESATIVADA continua no relatório: escondê-la
                            faria o total encolher em silêncio. A marca diz por
                            que ela está aqui sem aparecer nas listas de lançar. */}
                        {linha.inativa && (
                          <span className="ml-2 text-[9px] font-black tracking-widest text-amber-700
                                           bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            INATIVA
                          </span>
                        )}
                      </th>

                      {linha.celulas.map((c) => (
                        <CelulaDoMes
                          key={c.mes}
                          celula={c}
                          ehTotal={linha.ehTotal}
                          mostrarCadeado={mostrarCadeado}
                          aoClicar={aoClicarNaCelula ? () => aoClicarNaCelula(linha, bloco, c.mes) : undefined}
                        />
                      ))}

                      {comTotalDoAno && (
                        <td className={`px-2 py-2 text-right font-mono whitespace-nowrap border-b border-slate-100
                                        border-l border-slate-200 ${linha.ehTotal ? "font-black" : "font-bold"} ${
                          (linha.totalDoAnoCentavos ?? 0) < 0 ? "text-red-700" : "text-slate-800"
                        }`}>
                          {linha.totalDoAnoCentavos === null
                            ? ""
                            : formatarBRL(linha.totalDoAnoCentavos, { semSimbolo: true })}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
