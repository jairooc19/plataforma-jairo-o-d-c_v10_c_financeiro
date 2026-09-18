"use client";

import { useState } from "react";
import {
  ROTULO_DA_PERMISSAO, PERMISSOES_QUE_REVELAM_VALOR,
  type ContaIdentificadora, type MembroDoModulo, type PermissaoFinanceiro,
} from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * 🔑 O ACESSO AO DINHEIRO DO PERÍODO, POR DEPENDENTE (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/orcamento/AcessoAoDinheiro.tsx
 *
 * As duas exigências do dono do projeto, em 18/09/2026:
 *   1. liberar contas identificadoras ESPECÍFICAS (uma, algumas ou todas);
 *   2. liberar a visão em SÓ PERCENTUAL, sem os valores.
 *
 * ===========================================================================
 * ⚠️ O AVISO DE VAZAMENTO É A PARTE MAIS IMPORTANTE DESTE COMPONENTE
 * ===========================================================================
 * O modo percentual impede o valor de SAIR DO BANCO naquela tela — isso é de
 * verdade, e está travado no teste 46. Mas ele **não é um cofre**: quem tiver
 * `extrato_ver`, `lc_ver_todos`, `imprimir`, `orc_ver` ou `cm_ver` chega aos
 * mesmos números por outra tela, que ele já tem hoje.
 *
 * Sem este aviso, o Proprietário marcaria a caixa e iria embora achando que
 * escondeu os valores. **Avisar, e não bloquear**: pode haver caso legítimo em
 * que o percentual é só conforto, e decidir isso por ele seria errado. Mas
 * deixá-lo decidir sem saber seria pior.
 *
 * ⚠️ AUSENTE E `[]` SÃO DIFERENTES NA LISTA DE CONTAS: sem escolha nenhuma vale
 * TODAS; desmarcar tudo vale NENHUMA. É a mesma distinção travada no banco
 * (teste 47), e ela aparece na tela como duas frases diferentes.
 */
export default function AcessoAoDinheiro({
  membro, categorias, aoGravar, aoRetirarPermissoes,
}: {
  membro: MembroDoModulo;
  categorias: ContaIdentificadora[];
  aoGravar: (params: { dinheiroContas?: string[] | null; dinheiroPercentual?: boolean }) => Promise<void>;
  /** Desliga de uma vez as permissões que revelam o valor por outra tela. */
  aoRetirarPermissoes: (permissoes: PermissaoFinanceiro[]) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [gravando, setGravando] = useState(false);

  const liberadas = membro.dinheiro_contas;
  const todas = liberadas === undefined;
  const nenhuma = Array.isArray(liberadas) && liberadas.length === 0;

  /** 🎁 BÔNUS B11 — contas liberadas que já não existem no cadastro. */
  const existentes = new Set(categorias.map((c) => c.id));
  const orfas = (liberadas ?? []).filter((id) => !existentes.has(id));

  /** As permissões deste membro que revelam o valor por outro caminho. */
  const vazam = PERMISSOES_QUE_REVELAM_VALOR.filter((p) => membro.permissoes.includes(p));

  const gravar = async (params: Parameters<typeof aoGravar>[0]) => {
    setGravando(true);
    try { await aoGravar(params); } finally { setGravando(false); }
  };

  const alternarConta = (id: string) => {
    const atual = liberadas ?? categorias.map((c) => c.id);
    const nova = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
    gravar({ dinheiroContas: nova });
  };

  if (!membro.permissoes.includes("dp_ver")) {
    return (
      <p className="text-[11px] font-bold uppercase text-slate-400 mt-3">
        LIGUE &quot;VER O DINHEIRO DO PERÍODO&quot; ACIMA PARA CONFIGURAR O QUE ESTE DEPENDENTE ENXERGA LÁ.
      </p>
    );
  }

  return (
    <div className="mt-4 border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
      <button type="button" onClick={() => setAberto((v) => !v)}
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-600">
        <IconeFin nome={aberto ? "fecharNivel" : "abrirNivel"} tamanho={14} />
        ACESSO AO DINHEIRO DO PERÍODO
        <span className="font-bold text-slate-400">
          · {todas ? "TODAS AS CONTAS" : nenhuma ? "NENHUMA CONTA" : `${liberadas!.length} CONTA(S)`}
          {membro.dinheiro_percentual ? " · SÓ PERCENTUAL" : " · COM VALORES"}
        </span>
      </button>

      {aberto && (
        <div className="mt-4 space-y-4">
          {/* -------- 1. O MODO -------- */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
              O QUE ELE VÊ NA BARRA
            </p>
            <div className="flex flex-wrap gap-2">
              <Opcao ativo={!membro.dinheiro_percentual} desabilitado={gravando}
                     aoClicar={() => gravar({ dinheiroPercentual: false })}
                     titulo="VALORES E PERCENTUAL"
                     dica="ORÇADO, REALIZADO, SALDO E O %" />
              <Opcao ativo={membro.dinheiro_percentual} desabilitado={gravando}
                     aoClicar={() => gravar({ dinheiroPercentual: true })}
                     titulo="SOMENTE O PERCENTUAL"
                     dica="OS VALORES NÃO SÃO ENVIADOS À TELA DELE" />
            </div>
          </div>

          {/* -------- ⚠️ O AVISO DE VAZAMENTO -------- */}
          {membro.dinheiro_percentual && vazam.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-800 mb-2">
                <IconeFin nome="atencao" tamanho={14} />
                O MODO PERCENTUAL NÃO ESTÁ ESCONDENDO OS VALORES DESTE DEPENDENTE
              </p>
              <p className="text-[11px] font-bold uppercase text-amber-900 leading-relaxed">
                NA TELA DO DINHEIRO DO PERÍODO OS VALORES REALMENTE NÃO SÃO ENVIADOS. MAS ELE
                CHEGA AOS MESMOS NÚMEROS POR OUTRAS TELAS, COM AS PERMISSÕES QUE TEM HOJE:
              </p>
              <ul className="mt-2 mb-3 space-y-1">
                {vazam.map((p) => (
                  <li key={p} className="text-[11px] font-bold uppercase text-amber-900">
                    · {ROTULO_DA_PERMISSAO[p]}
                  </li>
                ))}
              </ul>
              <button type="button" disabled={gravando}
                      onClick={() => {
                        const texto =
                          `RETIRAR ${vazam.length} PERMISSÃO(ÕES) DESTE DEPENDENTE?\n\n` +
                          vazam.map((p) => `• ${ROTULO_DA_PERMISSAO[p]}`).join("\n") +
                          `\n\nSÓ ASSIM O MODO PERCENTUAL PASSA A ESCONDER OS VALORES DE VERDADE.`;
                        if (!window.confirm(texto)) return;
                        void aoRetirarPermissoes(vazam);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
                RETIRAR ESSAS PERMISSÕES AGORA
              </button>
            </div>
          )}

          {/* -------- 2. AS CONTAS -------- */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
              QUAIS CONTAS ELE ENXERGA
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <Opcao ativo={todas} desabilitado={gravando}
                     aoClicar={() => gravar({ dinheiroContas: null })}
                     titulo="TODAS" dica="INCLUSIVE AS QUE FOREM CRIADAS DEPOIS" />
              <Opcao ativo={nenhuma} desabilitado={gravando}
                     aoClicar={() => gravar({ dinheiroContas: [] })}
                     titulo="NENHUMA" dica="A TELA FICA VAZIA PARA ELE" />
            </div>

            {/* ⚠️ A frase muda conforme o estado, porque TODAS e NENHUMA são
                estados diferentes de "lista vazia na tela". */}
            <p className="text-[11px] font-bold uppercase text-slate-400 mb-3">
              {todas
                ? "NENHUMA ESCOLHA FEITA — ELE VÊ TODAS AS CONTAS DO ORÇAMENTO."
                : nenhuma
                  ? "TODAS DESMARCADAS — ELE NÃO VÊ CONTA NENHUMA."
                  : `${liberadas!.length} CONTA(S) LIBERADA(S). MARQUE OU DESMARQUE ABAIXO.`}
            </p>

            {orfas.length > 0 && (
              <p className="text-[11px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                {orfas.length} CONTA(S) LIBERADA(S) JÁ NÃO EXISTE(M) NO CADASTRO.
                <button type="button" disabled={gravando}
                        onClick={() => gravar({ dinheiroContas: (liberadas ?? []).filter((id) => existentes.has(id)) })}
                        className="ml-2 underline">
                  LIMPAR
                </button>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
              {categorias.map((c) => {
                const marcada = todas || (liberadas ?? []).includes(c.id);
                return (
                  <label key={c.id}
                         className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-600">
                    <input type="checkbox" checked={marcada} disabled={gravando}
                           onChange={() => alternarConta(c.id)} className="w-4 h-4" />
                    {c.nome}
                    <span className="text-slate-300">· {c.tipo}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Opcao({ ativo, titulo, dica, aoClicar, desabilitado }: {
  ativo: boolean; titulo: string; dica: string; aoClicar: () => void; desabilitado?: boolean;
}) {
  return (
    <button type="button" onClick={aoClicar} disabled={desabilitado}
            className={`text-left px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest disabled:opacity-40 ${
              ativo ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300"}`}>
      {titulo}
      <span className={`block font-bold mt-0.5 ${ativo ? "text-blue-100" : "text-slate-400"}`}>{dica}</span>
    </button>
  );
}
