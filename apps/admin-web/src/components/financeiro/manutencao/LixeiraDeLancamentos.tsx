"use client";

import { useCallback, useEffect, useState } from "react";
import {
  manutencaoFinanceiroService, formatarBRL, formatarDataBR, formatarDataHoraBR,
  type LancamentoExcluido,
} from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * ♻️ A LIXEIRA — LANÇAMENTOS EXCLUÍDOS, E COMO TRAZÊ-LOS DE VOLTA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/manutencao/LixeiraDeLancamentos.tsx
 *
 * ===========================================================================
 * ⚠️ ISTO NÃO EXIGIU NENHUMA TABELA NOVA — O DADO JÁ ESTAVA LÁ
 * ===========================================================================
 * O gatilho `audit_fin_lanc` é `AFTER UPDATE OR DELETE ... FOR EACH ROW`, e a
 * `registrar_auditoria()` grava `dados_antes = to_jsonb(OLD)`: o registro
 * INTEIRO, campo por campo, antes de ele morrer. Isso sempre existiu; o que
 * faltava era a janela.
 *
 * É o que transforma a exclusão em lote de "operação irreversível" em
 * "operação reversível" — e foi por isso que ela pôde ser construída.
 *
 * ⚠️ RESTAURAR NÃO É "DESFAZER" CEGO. O lançamento volta a passar pelas mesmas
 * trancas de quando nasceu: não entra em período fechado (nem que o fechamento
 * tenha vindo DEPOIS da exclusão), e não volta se a conta ou a categoria dele
 * tiverem sido apagadas. Quem recusa é o banco.
 *
 * ⚠️ RESTAURAR UMA PERNA DE TRANSFERÊNCIA TRAZ AS DUAS (RN-23). Meia
 * transferência restaurada inventa dinheiro tanto quanto meia apagada — por
 * isso a confirmação avisa antes.
 */
export default function LixeiraDeLancamentos({
  tenantId, recarregarAo,
}: {
  tenantId: string | null;
  /** Muda de valor quando algo foi excluído lá em cima — força a releitura. */
  recarregarAo: number;
}) {
  const [itens, setItens] = useState<LancamentoExcluido[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /** Quais linhas da lixeira estão marcadas para a limpeza definitiva. */
  const [marcados, setMarcados] = useState<Set<number>>(new Set());

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true); setErro(null);
    try {
      setItens(await manutencaoFinanceiroService.listarExcluidos(tenantId, { limite: 200 }));
      // ⚠️ A SELEÇÃO ZERA A CADA RELEITURA, e isso é deliberado. Os `audit_id`
      // marcados podem ter deixado de existir (uma limpeza, outra aba), e uma
      // marca apontando para linha que já saiu faria o botão prometer um número
      // que o banco não vai encontrar.
      setMarcados(new Set());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO LER A LIXEIRA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId]);

  // ⚠️ A função `async` fica DENTRO do efeito e o estado só muda depois do
  // `await` — a regra `react-hooks/set-state-in-effect` recusa efeito que
  // chame setState no mesmo tique, e ela está certa.
  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar, recarregarAo]);

  const restaurar = async (item: LancamentoExcluido) => {
    if (!tenantId) return;
    const texto =
      `RESTAURAR ESTE LANÇAMENTO?\n\n` +
      `DATA: ${formatarDataBR(item.data_movimento)}\n` +
      `CONTA: ${item.conta}\n` +
      `IDENTIFICADORA: ${item.identificadora}\n` +
      `VALOR: ${formatarBRL(item.valor_centavos)}\n\n` +
      (item.transferencia_id
        ? "ESTE LANÇAMENTO FAZ PARTE DE UMA TRANSFERÊNCIA. RESTAURAR VAI TRAZER AS DUAS PERNAS DE VOLTA.\n\n"
        : "") +
      "ELE VOLTARÁ PARA O EXTRATO, NA MESMA DATA E NA MESMA ORDEM.";
    if (!window.confirm(texto)) return;

    setErro(null); setAviso(null);
    try {
      const r = await manutencaoFinanceiroService.restaurar(tenantId, item.audit_id);
      setAviso(
        r.restaurados === 0
          ? "ESTE LANÇAMENTO JÁ ESTAVA DE VOLTA. NADA MUDOU."
          : `${r.restaurados} LANÇAMENTO(S) RESTAURADO(S).`,
      );
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO RESTAURAR.");
    }
  };

  const alternar = (auditId: number) => {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(auditId)) novo.delete(auditId); else novo.add(auditId);
      return novo;
    });
  };

  /**
   * ⚠️ A LIMPEZA DEFINITIVA — O ÚNICO PONTO DO MÓDULO ONDE INFORMAÇÃO SOME DE VEZ.
   *
   * Pedido do dono do projeto em 17/09/2026 (2ª rodada). Tudo o mais no módulo
   * apaga DADO, e o dado apagado deixa rastro na trilha de auditoria — é dele
   * que esta lixeira vive. Isto apaga **o rastro**: depois, não há como
   * restaurar o lançamento nem como saber que ele existiu.
   *
   * ⚠️ POR ISSO ELA SIMULA ANTES, SEMPRE. O banco devolve `restauraveis`: quantos
   * daqueles lançamentos ainda poderiam voltar. É esse número que a confirmação
   * mostra — "3 linhas, das quais 3 ainda dariam para restaurar" pesa muito mais
   * do que "limpar a lixeira?".
   *
   * @param tudo `true` = a lixeira INTEIRA da empresa (não só os 30 dias que a
   *             lista mostra). A confirmação diz isso em voz alta, porque é
   *             justamente a diferença que enganaria.
   */
  const limpar = async (tudo: boolean) => {
    if (!tenantId) return;
    const ids = tudo ? null : Array.from(marcados);
    if (!tudo && ids!.length === 0) return;

    setErro(null); setAviso(null);
    try {
      const previa = await manutencaoFinanceiroService.limparLixeira({
        tenantId, auditIds: ids, simular: true,
      });

      if (previa.linhas === 0) {
        setAviso("NÃO HÁ NADA PARA LIMPAR.");
        return;
      }

      const texto =
        (tudo
          ? `LIMPAR A LIXEIRA INTEIRA DESTA EMPRESA?\n\n⚠️ ISTO ALCANÇA TODAS AS EXCLUSÕES JÁ REGISTRADAS — INCLUSIVE AS MAIS ANTIGAS QUE OS 30 DIAS MOSTRADOS NA LISTA.\n\n`
          : `EXCLUIR DEFINITIVAMENTE ${previa.linhas} REGISTRO(S) DA LIXEIRA?\n\n`) +
        `${previa.linhas} REGISTRO(S) DE EXCLUSÃO SERÃO APAGADOS.\n` +
        `${previa.restauraveis} DELES AINDA PODERIA(M) SER RESTAURADO(S) — E DEIXARÁ(ÃO) DE PODER.\n\n` +
        `⚠️ ESTA É A ÚNICA OPERAÇÃO DO SISTEMA QUE NÃO TEM VOLTA:\n` +
        `DEPOIS DELA, NÃO HÁ COMO RECUPERAR ESSES LANÇAMENTOS NEM SABER QUE EXISTIRAM.`;

      if (!window.confirm(texto)) return;

      const r = await manutencaoFinanceiroService.limparLixeira({
        tenantId, auditIds: ids, simular: false,
      });
      setAviso(`${r.apagados} REGISTRO(S) APAGADO(S) DEFINITIVAMENTE DA LIXEIRA.`);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO LIMPAR A LIXEIRA.");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 mb-2">
        <IconeFin nome="aberto" tamanho={16} />
        LIXEIRA — LANÇAMENTOS EXCLUÍDOS
      </h2>
      <p className="text-[11px] font-bold uppercase text-slate-400 mb-5">
        OS ÚLTIMOS 30 DIAS. RESTAURAR DEVOLVE O LANÇAMENTO AO EXTRATO, NA MESMA DATA E ORDEM.
      </p>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800 mb-4">{erro}</div>}
      {aviso && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800 mb-4">{aviso}</div>}

      {carregando ? (
        <p className="text-sm text-slate-400 font-bold uppercase">CARREGANDO…</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-400 font-bold uppercase">NENHUMA EXCLUSÃO NOS ÚLTIMOS 30 DIAS.</p>
      ) : (
        <>
        {/* ---------- A LIMPEZA DEFINITIVA ---------- */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button type="button" onClick={() => limpar(false)} disabled={marcados.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-[10px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-35">
            <IconeFin nome="excluir" tamanho={13} />
            EXCLUIR DEFINITIVAMENTE OS MARCADOS
          </button>
          <button type="button" onClick={() => limpar(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">
            <IconeFin nome="excluir" tamanho={13} />
            LIMPAR TODA A LIXEIRA
          </button>
          <span className="ml-auto text-[11px] font-black uppercase tracking-widest text-slate-500">
            {marcados.size} DE {itens.length} MARCADO(S)
          </span>
        </div>
        <p className="text-[11px] font-bold uppercase text-red-700 mb-4">
          ⚠️ LIMPAR NÃO É O MESMO QUE EXCLUIR: É A ÚNICA AÇÃO DO SISTEMA SEM VOLTA. DEPOIS
          DELA NÃO HÁ COMO RESTAURAR O LANÇAMENTO NEM SABER QUE ELE EXISTIU.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                {["","EXCLUÍDO EM","QUEM","DATA","CONTA","IDENTIFICADORA","VALOR","HISTÓRICO",""].map((c, n) => (
                  <th key={c || `v${n}`} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.audit_id} className={i.ja_restaurado ? "opacity-45" : "hover:bg-blue-50/40"}>
                  {/*
                    ⚠️ AQUI A LINHA **NÃO** É CLICÁVEL, ao contrário da lista de
                    exclusão. Nesta tabela a linha já tem uma ação própria e
                    muito diferente (RESTAURAR), e uma linha que faz duas coisas
                    opostas — trazer de volta e marcar para apagar de vez — é a
                    receita do clique errado. Aqui a caixa é a caixa.
                  */}
                  <td className="px-2 py-2 border-b border-slate-100">
                    <input type="checkbox" checked={marcados.has(i.audit_id)}
                           onChange={() => alternar(i.audit_id)}
                           aria-label={`MARCAR PARA EXCLUIR DEFINITIVAMENTE A EXCLUSÃO DE ${formatarDataBR(i.data_movimento)}`}
                           className="w-4 h-4" />
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataHoraBR(i.excluido_em)}</td>
                  <td className="px-2 py-2 border-b border-slate-100 text-slate-500">{i.excluido_por}</td>
                  <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataBR(i.data_movimento)}</td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">
                    {i.conta}
                    {i.transferencia_id && <span className="ml-1 text-[9px] font-black text-blue-600">TRANSF</span>}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">{i.identificadora}</td>
                  <td className={`px-2 py-2 border-b border-slate-100 text-right font-mono ${i.tipo_movimento === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                    {formatarBRL(i.valor_centavos, { semSimbolo: true })}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase text-slate-500 max-w-[180px] truncate">{i.historico ?? ""}</td>
                  <td className="px-2 py-2 border-b border-slate-100 text-right whitespace-nowrap">
                    {i.ja_restaurado ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">JÁ RESTAURADO</span>
                    ) : (
                      <button type="button" onClick={() => restaurar(i)}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                        <IconeFin nome="aberto" tamanho={13} />
                        RESTAURAR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
