"use client";

import IconeFin from "../IconeFin";

/**
 * 📅 A BARRA DO ANO — ◄ 2026 ► (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/dashboard/BarraDoAno.tsx
 *
 * ⚠️ NOS MOLDES DO `AtalhosDeMes`, E PELO MESMO MOTIVO: o dono do projeto já
 * usa "MÊS ANTERIOR / MÊS ATUAL / MÊS SEGUINTE" na CONFERÊNCIA e na PESQUISAR.
 * Um seletor de ano com outro formato faria a mesma pessoa aprender dois gestos
 * para a mesma ideia.
 *
 * ⚠️ E ELE NÃO CALCULA DATA NENHUMA — só soma 1 ao número do ano. Quem converte
 * "2026" em "01/01/2026 a 31/12/2026" é `anoInteiro()`, no Core, onde há teste.
 * A regra do projeto é essa: cálculo de data não mora em componente de tela.
 *
 * ⚠️ O NOME DA EMPRESA E A DATA FICAM AQUI, NA TELA, e não só no papel
 * (18/09/2026). Quem tira uma foto da tela para mandar a alguém estava mandando
 * uma tabela sem dono e sem data.
 */
export default function BarraDoAno({
  titulo, ano, aoTrocarAno, empresa, acoes,
}: {
  titulo: string;
  ano: number;
  aoTrocarAno: (ano: number) => void;
  empresa: string;
  /** Os botões de IMPRIMIR e EXPORTAR, que cada tela monta com os dados dela. */
  acoes?: React.ReactNode;
}) {
  const botao =
    "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white " +
    "text-[11px] font-black uppercase tracking-widest text-slate-600 " +
    "hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800">
          <IconeFin nome="dashboards" tamanho={26} traco={1.75} />
          {titulo}
        </h1>
        {empresa && (
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
            {empresa} · EXERCÍCIO DE {ano}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={botao} title="VER O ANO ANTERIOR."
                onClick={() => aoTrocarAno(ano - 1)}>
          <IconeFin nome="mesAnterior" tamanho={14} />
          {ano - 1}
        </button>

        <span className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black tracking-widest">
          {ano}
        </span>

        <button type="button" className={botao} title="VER O ANO SEGUINTE."
                onClick={() => aoTrocarAno(ano + 1)}>
          {ano + 1}
          <IconeFin nome="mesSeguinte" tamanho={14} />
        </button>

        {acoes}
      </div>
    </div>
  );
}
