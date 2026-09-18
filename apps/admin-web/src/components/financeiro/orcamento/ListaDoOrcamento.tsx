"use client";

import { formatarBRL, agruparEmBlocos, type LinhaDoOrcamento } from "@jairo/core";
import MenuDeLinha, { type AcaoDeLinha } from "../MenuDeLinha";

/**
 * 📋 A CONFERÊNCIA DOS REGISTROS EXISTENTES (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/orcamento/ListaDoOrcamento.tsx
 *
 * ⚠️ ELA NÃO SOMA NADA E NÃO ORDENA NADA. As linhas, os totais por tipo e a
 * ordem RECEITA → DESPESA → OUTRAS vêm prontos de `fin_listar_orcamento`. É o
 * que garante que a tela, o papel impresso e o .TSV mostrem o mesmo número.
 *
 * ⚠️ O MENU DE OPÇÕES SÓ APARECE NAS LINHAS DE CONTA. "TOTAL RECEITAS" é uma
 * soma, não um registro: não existe o que editar nem o que excluir ali, e um
 * menu naquela linha prometeria uma ação impossível — a mesma regra do extrato.
 *
 * ⚠️ E A LINHA NÃO É CLICÁVEL. Ao contrário do extrato, aqui a linha já carrega
 * um botão de ação (o menu), e não há "ficha" para abrir: o registro inteiro já
 * está visível. Linha clicável sem destino é clique que não faz nada.
 */
export default function ListaDoOrcamento({
  linhas, carregando, podeEditar, podeExcluir, aoEditar, aoExcluir,
}: {
  linhas: LinhaDoOrcamento[];
  carregando: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  aoEditar: (linha: LinhaDoOrcamento) => void;
  aoExcluir: (linha: LinhaDoOrcamento) => void;
}) {
  if (carregando) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const contas = linhas.filter((l) => l.linha_tipo === "CONTA");
  if (contas.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          NENHUM ORÇAMENTO NESTA COMPETÊNCIA AINDA.
        </p>
      </div>
    );
  }

  const blocos = agruparEmBlocos(linhas);
  const temMenu = podeEditar || podeExcluir;

  const acoes = (linha: LinhaDoOrcamento): AcaoDeLinha[] => {
    const lista: AcaoDeLinha[] = [];
    if (podeEditar) lista.push({ rotulo: "EDITAR", icone: "editar", aoClicar: () => aoEditar(linha) });
    if (podeExcluir) lista.push({ rotulo: "EXCLUIR", icone: "excluir", destrutiva: true, aoClicar: () => aoExcluir(linha) });
    return lista;
  };

  return (
    <div className="space-y-6">
      {blocos.map((bloco) => (
        <div key={bloco.chave}>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            {bloco.rotulo}
          </h3>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  CONTA IDENTIFICADORA
                </th>
                <th className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  OBSERVAÇÃO
                </th>
                <th className="px-2 py-2 text-right font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">
                  VALOR ORÇADO
                </th>
                {temMenu && (
                  <th className="px-2 py-2 text-right font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                    OPÇÕES
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((l) => (
                <tr key={l.orcamento_id} className="hover:bg-blue-50/30">
                  <td className="px-2 py-2 uppercase font-bold text-slate-700 border-b border-slate-100">
                    {l.nome}
                    {/* A conta desativada continua no orçamento dos meses em que
                        foi usada — escondê-la faria o total encolher em silêncio. */}
                    {l.is_active === false && (
                      <span className="ml-2 text-[9px] font-black tracking-widest text-amber-700
                                       bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        INATIVA
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 uppercase text-slate-400 border-b border-slate-100 max-w-[260px] truncate"
                      title={l.observacao ?? ""}>
                    {l.observacao ?? ""}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-800 border-b border-slate-100 whitespace-nowrap">
                    {formatarBRL(l.valor_centavos, { semSimbolo: true })}
                  </td>
                  {temMenu && (
                    <td className="px-2 py-2 text-right border-b border-slate-100 whitespace-nowrap">
                      <MenuDeLinha acoes={acoes(l)} />
                    </td>
                  )}
                </tr>
              ))}

              {bloco.total && (
                <tr className="bg-slate-50 font-black">
                  <td className="px-2 py-2 uppercase text-slate-800 border-b border-slate-100" colSpan={2}>
                    TOTAL {bloco.rotulo}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-800 border-b border-slate-100 whitespace-nowrap">
                    {formatarBRL(bloco.total.valor_centavos, { semSimbolo: true })}
                  </td>
                  {temMenu && <td className="border-b border-slate-100" />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
