"use client";

import { useRef } from "react";
import IconeFin from "../IconeFin";
import { EXTENSOES_ACEITAS } from "./lerArquivo";
import { useImportacao } from "./useImportacao";
import type { LinhaDaPrevia } from "@jairo/core";

/**
 * 📥 O MODAL DE IMPORTAÇÃO DE CADASTROS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/importar/ImportarCadastros.tsx
 *
 * Serve às DUAS telas de cadastro, trocando só a `variante` — a mesma simetria
 * do resto do módulo (especificação, seção 11).
 *
 * ⚠️ O TIPO É ESCOLHIDO UMA VEZ E VALE PARA O ARQUIVO INTEIRO, como o dono do
 * projeto pediu. É o desenho certo para o caso real: quem tem uma lista de 40
 * bancos num arquivo quer os 40 como BANCO. Misturar tipos no mesmo arquivo
 * exigiria uma segunda coluna — e o pedido foi explícito: **só a coluna A**.
 * Para importar tipos diferentes, são duas importações.
 *
 * ⚠️ A PRÉVIA NÃO É DECORAÇÃO: ela é a única chance de a pessoa ver o que o
 * computador entendeu ANTES de gravar. Separador errado, acento quebrado,
 * cabeçalho lido como conta — os três aparecem ali, e só ali.
 */
export default function ImportarCadastros({
  variante, tenantId, tiposDisponiveis, nomesJaCadastrados, onFechar, onImportou,
}: {
  variante: "movimento" | "identificadora";
  tenantId: string;
  tiposDisponiveis: string[];
  nomesJaCadastrados: string[];
  onFechar: () => void;
  onImportou: () => Promise<void> | void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const m = useImportacao({ variante, tenantId, tiposDisponiveis, nomesJaCadastrados, aoTerminar: onImportou });

  const ehMovimento = variante === "movimento";
  const rotuloTipo = ehMovimento ? "TIPO DA CONTA MOVIMENTO" : "TIPO DA CONTA IDENTIFICADORA DO MOVIMENTO";
  const podeImportar = m.previa.filter(m.importavel).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
         onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl"
           onClick={(e) => e.stopPropagation()}>

        {/* ---------------- CABEÇALHO ---------------- */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
              <IconeFin nome="importar" tamanho={20} traco={1.75} />
              IMPORTAR {ehMovimento ? "CONTAS MOVIMENTO" : "CONTAS IDENTIFICADORAS"}
            </h2>
            <p className="text-[11px] font-bold uppercase text-slate-400 mt-1">
              ARQUIVO .CSV OU .TSV · O SISTEMA LÊ APENAS A COLUNA A
            </p>
          </div>
          <button type="button" onClick={onFechar} aria-label="FECHAR"
                  className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100">
            <IconeFin nome="fechar" tamanho={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {m.erro && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3
                            text-xs font-bold uppercase text-red-800">
              <IconeFin nome="atencao" tamanho={15} />
              <span>{m.erro}</span>
            </div>
          )}

          {/* ============ ETAPA 1: ESCOLHER ============ */}
          {m.etapa === "escolher" && (
            <>
              <div>
                <label htmlFor="imp-tipo" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  {rotuloTipo}
                </label>
                <select id="imp-tipo" value={m.tipo} onChange={(e) => m.setTipo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 uppercase font-bold
                                   focus:border-blue-500 focus:outline-none">
                  {tiposDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="text-[11px] font-bold uppercase text-slate-400 mt-1.5">
                  TODOS OS REGISTROS DO ARQUIVO SERÃO GRAVADOS COM ESTE TIPO.
                </p>
              </div>

              <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-10 rounded-2xl border-2 border-dashed
                           border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 transition-all"
              >
                <IconeFin nome="importar" tamanho={30} traco={1.5} />
                <span className="text-sm font-black uppercase tracking-widest text-slate-700">
                  ESCOLHER O ARQUIVO
                </span>
                <span className="text-[11px] font-bold uppercase text-slate-400">
                  .CSV · .TSV · .TXT — ATÉ 2 MB
                </span>
              </button>

              <input
                ref={entrada}
                type="file"
                accept={EXTENSOES_ACEITAS}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // ⚠️ ZERAR O VALOR permite escolher O MESMO arquivo de novo
                  // depois de corrigi-lo: sem isto, o navegador entende que
                  // "nada mudou" e o `onChange` não dispara na segunda vez.
                  e.target.value = "";
                  if (f) void m.escolherArquivo(f);
                }}
              />

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] font-bold
                              uppercase text-slate-500 leading-relaxed">
                COMO DEVE SER O ARQUIVO: UMA LINHA POR REGISTRO, O NOME NA PRIMEIRA COLUNA.
                AS DEMAIS COLUNAS SÃO IGNORADAS. O SISTEMA RECONHECE SOZINHO SE O SEPARADOR
                É TABULAÇÃO, PONTO E VÍRGULA OU VÍRGULA.
              </div>
            </>
          )}

          {/* ============ ETAPA 2: CONFERIR ============ */}
          {(m.etapa === "conferir" || m.etapa === "gravando") && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Dado rotulo="ARQUIVO" valor={m.nomeDoArquivo} />
                <Dado rotulo="SEPARADOR" valor={m.separador} />
                <Dado rotulo="CODIFICAÇÃO" valor={m.codificacao} />
                <Dado rotulo="TIPO" valor={m.tipo} />
              </div>

              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-600">
                <input type="checkbox" checked={m.temCabecalho}
                       onChange={(e) => m.alternarCabecalho(e.target.checked)} className="w-4 h-4" />
                A PRIMEIRA LINHA É CABEÇALHO (NÃO IMPORTAR)
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {m.previa.length} LINHA(S) · {podeImportar} PODE(M) ENTRAR · {m.escolhidos.length} MARCADA(S)
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => m.marcarTodos(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200
                                     text-[10px] font-black uppercase tracking-widest text-slate-700">
                    <IconeFin nome="ativo" tamanho={13} />
                    MARCAR TODOS
                  </button>
                  <button type="button" onClick={() => m.marcarTodos(false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200
                                     text-[10px] font-black uppercase tracking-widest text-slate-700">
                    <IconeFin nome="inativo" tamanho={13} />
                    DESMARCAR TODOS
                  </button>
                </div>
              </div>

              {m.previa.length === 0 ? (
                <p className="text-sm font-bold uppercase text-slate-400 py-6 text-center">
                  NENHUM REGISTRO ENCONTRADO NA COLUNA A DESTE ARQUIVO.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {m.previa.map((l) => (
                    <LinhaPrevia
                      key={l.linha}
                      linha={l}
                      marcada={m.marcados.has(l.linha)}
                      podeEntrar={m.importavel(l)}
                      onAlternar={() => m.alternarLinha(l.linha)}
                    />
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ============ ETAPA 4: RELATÓRIO ============ */}
          {m.etapa === "relatorio" && m.relatorio && (
            <>
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                <IconeFin nome="ativo" tamanho={24} traco={1.75} />
                <div>
                  <p className="text-base font-black uppercase text-emerald-900">
                    {m.relatorio.criados} CADASTRO(S) CRIADO(S)
                  </p>
                  <p className="text-[11px] font-bold uppercase text-emerald-700">
                    TODOS COM O TIPO {m.tipo}
                  </p>
                </div>
              </div>

              {/* ⚠️ ESTE BLOCO É O RELATÓRIO DO BANCO, NÃO A PRÉVIA REPETIDA.
                  Entre conferir e gravar, outra pessoa pode ter cadastrado o
                  mesmo nome — e é aqui que isso aparece. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Dado rotulo="ENVIADOS" valor={String(m.relatorio.recebidos)} />
                <Dado rotulo="CRIADOS" valor={String(m.relatorio.criados)} />
                <Dado rotulo="JÁ EXISTIAM" valor={String(m.relatorio.ja_existiam)} />
                <Dado rotulo="REPETIDOS" valor={String(m.relatorio.repetidos_no_arquivo)} />
              </div>

              {m.relatorio.ja_existiam > 0 && (
                <Detalhe titulo="IGNORADOS PORQUE JÁ EXISTIAM" nomes={m.relatorio.nomes_ja_existiam} />
              )}
              {(m.relatorio.reservados ?? 0) > 0 && (
                <Detalhe
                  titulo="RECUSADOS: NOME RESERVADO PELO SISTEMA"
                  nomes={m.relatorio.nomes_reservados ?? []}
                  explicacao="ESTA CATEGORIA É CRIADA PELO PRÓPRIO SISTEMA NA PRIMEIRA TRANSFERÊNCIA. IMPORTÁ-LA QUEBRARIA A TRANSFERÊNCIA DEPOIS."
                />
              )}
              {m.relatorio.criados > 0 && (
                <Detalhe titulo="CRIADOS" nomes={m.relatorio.nomes_criados} />
              )}
            </>
          )}
        </div>

        {/* ---------------- RODAPÉ ---------------- */}
        <div className="flex flex-wrap gap-3 p-6 border-t border-slate-200">
          {m.etapa === "conferir" && (
            <>
              <button type="button" onClick={m.gravar} disabled={m.escolhidos.length === 0}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 rounded-xl
                                 bg-blue-600 text-white text-xs font-black uppercase tracking-widest
                                 disabled:opacity-40">
                <IconeFin nome="salvar" tamanho={16} />
                IMPORTAR {m.escolhidos.length} REGISTRO(S)
              </button>
              <button type="button" onClick={m.recomecar}
                      className="px-5 py-3 rounded-xl bg-white border border-slate-300 text-xs font-black
                                 uppercase tracking-widest text-slate-600">
                TROCAR ARQUIVO
              </button>
            </>
          )}

          {m.etapa === "gravando" && (
            <div className="flex-1 flex items-center justify-center gap-3 py-3 text-xs font-black
                            uppercase tracking-widest text-slate-500">
              <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              GRAVANDO…
            </div>
          )}

          {m.etapa === "relatorio" && (
            <>
              <button type="button" onClick={m.recomecar}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-300
                                 text-xs font-black uppercase tracking-widest text-slate-600">
                <IconeFin nome="importar" tamanho={15} />
                IMPORTAR OUTRO ARQUIVO
              </button>
              <button type="button" onClick={onFechar}
                      className="flex-1 min-w-[160px] py-3 rounded-xl bg-slate-800 text-white text-xs
                                 font-black uppercase tracking-widest">
                FECHAR
              </button>
            </>
          )}

          {m.etapa === "escolher" && (
            <button type="button" onClick={onFechar}
                    className="flex-1 py-3 rounded-xl bg-white border border-slate-300 text-xs font-black
                               uppercase tracking-widest text-slate-600">
              CANCELAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{rotulo}</p>
      <p className="text-xs font-black uppercase text-slate-800 truncate" title={valor}>{valor || "—"}</p>
    </div>
  );
}

function Detalhe({ titulo, nomes, explicacao }: { titulo: string; nomes: string[]; explicacao?: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{titulo}</p>
      {explicacao && (
        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 leading-relaxed">{explicacao}</p>
      )}
      <p className="text-xs font-bold uppercase text-slate-700 leading-relaxed">{nomes.join(" · ")}</p>
    </div>
  );
}

/** Uma linha da prévia, com o motivo quando ela não pode entrar. */
function LinhaPrevia({ linha, marcada, podeEntrar, onAlternar }: {
  linha: LinhaDaPrevia;
  marcada: boolean;
  podeEntrar: boolean;
  onAlternar: () => void;
}) {
  const motivo =
    linha.reservado ? "NOME RESERVADO PELO SISTEMA"
    : linha.jaExiste ? "JÁ CADASTRADO NESTA EMPRESA"
    : linha.repetidoNoArquivo ? "REPETIDO NESTE ARQUIVO"
    : null;

  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${podeEntrar ? "" : "bg-slate-50"}`}>
      <input
        type="checkbox"
        checked={marcada}
        disabled={!podeEntrar}
        onChange={onAlternar}
        className="w-4 h-4 shrink-0"
        aria-label={`IMPORTAR ${linha.nome}`}
      />
      <span className="text-[10px] font-black text-slate-300 w-8 shrink-0 text-right">{linha.linha}</span>
      <span className={`flex-1 text-sm font-bold uppercase truncate ${podeEntrar ? "text-slate-800" : "text-slate-400 line-through"}`}
            title={linha.nome}>
        {linha.nome}
      </span>
      {motivo && (
        <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-amber-700
                         bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
          {motivo}
        </span>
      )}
    </li>
  );
}
