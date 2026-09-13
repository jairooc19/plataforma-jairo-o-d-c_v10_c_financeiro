"use client";

import { useEffect, useState } from "react";
import { CHAVE_IMPRESSAO, type ConteudoParaImpressao } from "@/components/financeiro/prepararImpressao";

/**
 * 🖨️ A GUIA DE IMPRESSÃO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/imprimir/page.tsx
 *
 * Abre em guia nova, com o botão fixo no canto superior direito e as duas
 * opções que o projeto usa desde o primeiro estudo: CORES (A4) e PRETO &
 * BRANCO (A4).
 *
 * ⚠️ O MODO P&B É UMA CLASSE NO `<body>`, e não `@media print` forçando cores.
 * O motivo: deixar o `@media print` cuidar só de layout (margens, quebras de
 * página) preserva as cores exatas no modo colorido. Quem escolhe é o usuário,
 * antes de imprimir — não o CSS, no momento da impressão.
 *
 * ⚠️ A NUMERAÇÃO DE PÁGINAS NÃO É DESENHADA AQUI, e não é esquecimento. O CSS
 * só sabe o número da página dentro das caixas de margem do `@page`
 * (`@bottom-right { content: counter(page) }`), e NENHUM navegador de mercado
 * as implementa — Chrome, Edge e Firefox ignoram o bloco inteiro. Quem numera é
 * o próprio navegador, pela opção "Cabeçalhos e rodapés" do diálogo de
 * impressão, que também carimba a data e o endereço. Escrever "Página 1" fixo
 * no rodapé seria pior que não numerar: mentiria a partir da segunda folha.
 *
 * ⚠️ E O `setTimeout` DE 100ms NÃO É SUPERSTIÇÃO: `window.print()` congela a
 * página no estado em que ela está. Sem a pausa, o navegador pode abrir o
 * diálogo antes de ter repintado com a classe nova — e sai colorido quando se
 * pediu preto e branco.
 */
export default function ImprimirPage() {
  const [conteudo, setConteudo] = useState<ConteudoParaImpressao | null>(null);
  const [emitidoEm, setEmitidoEm] = useState<string>("");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const ler = async () => {
      await Promise.resolve();   // tira o setState do tique do efeito
      try {
        const bruto = localStorage.getItem(CHAVE_IMPRESSAO);
        if (!bruto) return;
        const dados = JSON.parse(bruto) as ConteudoParaImpressao & { emitidoEm: string };
        setConteudo(dados);
        setEmitidoEm(new Date(dados.emitidoEm).toLocaleString("pt-BR"));
        localStorage.removeItem(CHAVE_IMPRESSAO);   // some depois de lido
      } catch {
        setConteudo(null);
      }
    };
    ler();
  }, []);

  const imprimirCores = () => {
    document.body.classList.remove("print-bw");
    setMenuAberto(false);
    setTimeout(() => window.print(), 100);
  };

  const imprimirPB = () => {
    document.body.classList.add("print-bw");
    setMenuAberto(false);
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("print-bw"), 100);
    }, 100);
  };

  if (!conteudo) {
    return (
      <div className="p-12 text-center">
        <p className="font-black uppercase text-slate-500 text-sm">
          NADA PARA IMPRIMIR. VOLTE À TELA, FAÇA A PESQUISA E CLIQUE EM IMPRIMIR.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0.8cm 0.8cm 1.5cm; }
        @media print {
          .print-container { display: none !important; }
          body { margin: 0; padding: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          * { box-shadow: none !important; }
          /* O rodapé fica preso ao pé de TODA folha — o Chrome repete
             elementos fixos a cada página impressa. */
          .rodape-fixo { position: fixed; bottom: 0; left: 0; right: 0; }
        }
        body.print-bw, body.print-bw * {
          color: #000 !important; background-color: #fff !important;
          border-color: #000 !important;
        }
        body.print-bw thead th { background-color: #333 !important; color: #fff !important; }
        body.print-bw tbody tr:nth-child(even) td { background-color: #f4f4f4 !important; }
        *, *::before, *::after { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="print-container fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuAberto((v) => !v); }}
          className="px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-black uppercase tracking-widest shadow-lg"
        >
          🖨️ IMPRIMIR ▾
        </button>
        {menuAberto && (
          <>
            <div className="fixed inset-0" onClick={() => setMenuAberto(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5"
                 onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={imprimirCores}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase text-slate-700 hover:bg-blue-50">
                CORES (A4)
              </button>
              <button type="button" onClick={imprimirPB}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase text-slate-700 hover:bg-blue-50">
                PRETO &amp; BRANCO (A4)
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-8 max-w-[1000px] mx-auto text-[11px] text-black">
        <header className="border-b-2 border-blue-800 pb-3 mb-4">
          {conteudo.empresa && (
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">{conteudo.empresa}</p>
          )}
          <h1 className="text-lg font-black uppercase tracking-tight">{conteudo.titulo}</h1>
          {conteudo.filtros.length > 0 && (
            <p className="text-[10px] font-bold uppercase text-slate-600 mt-1">
              FILTROS: {conteudo.filtros.join(" · ")}
            </p>
          )}
          <p className="text-[10px] font-bold uppercase text-slate-500 mt-1">EMITIDO EM {emitidoEm}</p>
        </header>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              {conteudo.colunas.map((c) => (
                <th key={c} className="bg-blue-800 text-white px-2 py-1.5 text-left font-black uppercase text-[10px] border border-blue-800">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conteudo.linhas.map((linha, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                {linha.map((celula, j) => (
                  <td key={j}
                      className={`px-2 py-1 border border-slate-300 ${
                        conteudo.colunasNumericas?.includes(j) ? "text-right font-mono" : ""
                      }`}>
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="rodape-fixo mt-4 pt-2 border-t border-slate-300 text-[9px] font-bold uppercase text-slate-500 bg-white">
          {conteudo.rodape ?? `${conteudo.linhas.length} REGISTRO(S)`}
          {conteudo.empresa ? ` · ${conteudo.empresa}` : ""} · PLATAFORMA JAIRO O D C
        </p>
      </div>
    </>
  );
}
