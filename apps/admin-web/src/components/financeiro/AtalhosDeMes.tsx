"use client";

import { mesAnterior, mesInteiro, mesSeguinte, rotuloDoMes, type DataISO } from "@jairo/core";
import IconeFin from "./IconeFin";

/**
 * 📅 OS ATALHOS DE MÊS — "MÊS ANTERIOR", "MÊS ATUAL" e "MÊS SEGUINTE" (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/AtalhosDeMes.tsx
 *
 * Pedido do dono do projeto em 14/09/2026: "ADICIONAR BOTÃO MÊS ATUAL, AO
 * CLICAR PREENCHE PERÍODO COM MÊS ATUAL, ADICIONAR BOTÃO MÊS ANTERIOR … SE
 * REPETIR CLIQUE VAI RETORNANDO MÊS A MÊS."
 *
 * ⚠️ ELE NASCEU COMPONENTE, E NÃO CÓDIGO SOLTO DENTRO DA CONFERÊNCIA. A tela
 * PESQUISAR tem exatamente os mesmos dois campos de data e o mesmo atrito.
 * Escrito aqui, colocá-lo lá custou uma linha; escrito lá dentro, custaria uma
 * segunda cópia — e a segunda cópia é sempre a que esquece um detalhe.
 *
 * ⚠️ ELE NÃO CALCULA DATA NENHUMA. Quem calcula é `lib/datas.ts`, no Core, onde
 * mora a armadilha do `setMonth` (31 de março menos um mês devolvendo 3 de
 * março) e onde os testes do `npm test` a cobrem. Se o cálculo morasse na tela,
 * não haveria como testá-lo sem abrir um navegador.
 *
 * ⚠️ O "MÊS ANTERIOR" PARTE DO QUE ESTÁ NA TELA, NÃO DE HOJE — é isso que faz o
 * clique repetido andar mês a mês. Partindo sempre de hoje, o segundo clique
 * devolveria o mesmo mês do primeiro, para sempre.
 *
 * ⚠️ COM PERÍODO PARCIAL, O BOTÃO ENTREGA O MÊS INTEIRO ANTERIOR (decisão do
 * dono do projeto, 14/09/2026). Estando 10/09 a 20/09 na tela, MÊS ANTERIOR
 * devolve 01/08 a 31/08 — e não 10/08 a 20/08. O motivo é concreto: deslocar os
 * mesmos dias exigiria inventar uma resposta para "31 de fevereiro", e regra de
 * data inventada é defeito que aparece uma vez por ano.
 */
export default function AtalhosDeMes({
  de,
  ate,
  aoEscolher,
  id = "atalhos-de-mes",
}: {
  /** A data inicial que está nos campos hoje ("" quando em branco). */
  de: string;
  /** A data final que está nos campos hoje ("" quando em branco). */
  ate: string;
  /** Recebe o mês inteiro escolhido e preenche os dois campos de uma vez. */
  aoEscolher: (periodo: { de: DataISO; ate: DataISO }) => void;
  id?: string;
}) {
  /**
   * De onde o cálculo parte.
   *
   * ⚠️ A DATA INICIAL TEM PREFERÊNCIA, MAS A FINAL É A REDE. Quem digita a
   * inicial e é interrompido antes da final deixa o campo pela metade; sem essa
   * segunda tentativa, o botão partiria de hoje e daria um salto que a pessoa
   * não pediu. Sem nenhuma das duas, aí sim vale hoje — que é o caso "período
   * em branco" do pedido.
   */
  const referencia: DataISO | undefined = de || ate || undefined;

  /** O rótulo só aparece quando há de fato um mês carregado. */
  const rotulo = de ? rotuloDoMes(de) : null;

  const botao =
    "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white " +
    "text-[11px] font-black uppercase tracking-widest text-slate-600 " +
    "hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className="flex flex-wrap items-center gap-2" id={id}>
      <button
        type="button"
        onClick={() => aoEscolher(mesAnterior(referencia))}
        title="VER O MÊS ANTERIOR. CLIQUE DE NOVO PARA CONTINUAR VOLTANDO."
        className={botao}
      >
        <IconeFin nome="mesAnterior" tamanho={14} />
        MÊS ANTERIOR
      </button>

      <button
        type="button"
        onClick={() => aoEscolher(mesInteiro())}
        title="PREENCHER O PERÍODO COM O MÊS ATUAL, DO DIA 1 AO ÚLTIMO DIA."
        className={botao}
      >
        <IconeFin nome="calendario" tamanho={14} />
        MÊS ATUAL
      </button>

      {/* ⚠️ O "MÊS SEGUINTE" NÃO ESTAVA NO PEDIDO, e foi autorizado em
          14/09/2026 (bônus B4). Sem ele, quem clica cinco vezes em MÊS ANTERIOR
          e percebe que foi longe demais não tem como voltar UM passo — só
          saltar para o mês atual e recomeçar a descida inteira. */}
      <button
        type="button"
        onClick={() => aoEscolher(mesSeguinte(referencia))}
        title="AVANÇAR UM MÊS."
        className={botao}
      >
        MÊS SEGUINTE
        <IconeFin nome="mesSeguinte" tamanho={14} />
      </button>

      {/* O mês carregado, por extenso: depois do quarto clique, ler
          "01/05/2026 a 31/05/2026" exige um instante de tradução que este
          rótulo poupa (bônus B5). */}
      {rotulo && (
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">
          {rotulo}
        </span>
      )}
    </div>
  );
}
