"use client";

import {
  MESES_POR_EXTENSO, competenciaDoMes, deslocarCompetencia, competenciaAtual,
  type DataISO,
} from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * 📅 O SELETOR DE COMPETÊNCIA — "MÊS – ANO" (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/orcamento/SeletorDeCompetencia.tsx
 *
 * ⚠️ DOIS CAMPOS, E NÃO UM `input type="month"`. Aquele campo existe, mas é
 * desenhado de um jeito diferente em cada navegador, não tem tradução garantida
 * e no Firefox por muito tempo nem existiu. Dois campos são previsíveis e
 * combinam com o resto do módulo.
 *
 * ⚠️ E ELE NÃO CALCULA DATA NENHUMA. Quem converte "setembro de 2026" em
 * `2026-09-01`, e quem anda de mês em mês, é `lib/datas.ts`, no Core, onde há
 * teste. É a mesma regra dos atalhos de mês: cálculo de data não mora em
 * componente de tela.
 *
 * ⚠️ O ANO É UM CAMPO DE TEXTO NUMÉRICO, E NÃO UMA LISTA. Uma lista precisaria
 * de um começo e de um fim inventados por mim — e o dia em que alguém quisesse
 * orçar 2031 descobriria que o sistema decidiu que aquilo não existe.
 */
export default function SeletorDeCompetencia({
  competencia, aoEscolher, id = "competencia", rotulo = "COMPETÊNCIA", desabilitado,
}: {
  /** "AAAA-MM-01". */
  competencia: DataISO;
  aoEscolher: (competencia: DataISO) => void;
  id?: string;
  rotulo?: string;
  desabilitado?: boolean;
}) {
  const [anoTexto, mesTexto] = competencia.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);

  const campo = "px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400";
  const botao =
    "flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white " +
    "text-[11px] font-black uppercase tracking-widest text-slate-600 " +
    "hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40";

  /** Ano fora da faixa que o banco aceita não chega a ser enviado. */
  const trocarAno = (texto: string) => {
    const n = Number(texto);
    if (!Number.isInteger(n) || n < 1900 || n > 2999) return;
    aoEscolher(competenciaDoMes(n, mes));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
        {rotulo}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <select
          id={id}
          value={mes}
          disabled={desabilitado}
          onChange={(e) => aoEscolher(competenciaDoMes(ano, Number(e.target.value)))}
          className={`${campo} uppercase font-bold`}
        >
          {MESES_POR_EXTENSO.map((nome, i) => (
            <option key={nome} value={i + 1}>{nome}</option>
          ))}
        </select>

        <input
          type="number"
          aria-label="ANO DA COMPETÊNCIA"
          value={anoTexto}
          disabled={desabilitado}
          min={1900}
          max={2999}
          onChange={(e) => trocarAno(e.target.value)}
          className={`${campo} w-24 font-bold`}
        />

        {!desabilitado && (
          <>
            <button type="button" className={botao} title="MÊS ANTERIOR"
                    onClick={() => aoEscolher(deslocarCompetencia(competencia, -1))}>
              <IconeFin nome="mesAnterior" tamanho={14} />
              ANTERIOR
            </button>
            <button type="button" className={botao} title="VOLTAR PARA O MÊS ATUAL"
                    onClick={() => aoEscolher(competenciaAtual())}>
              <IconeFin nome="calendario" tamanho={14} />
              MÊS ATUAL
            </button>
            <button type="button" className={botao} title="MÊS SEGUINTE"
                    onClick={() => aoEscolher(deslocarCompetencia(competencia, 1))}>
              SEGUINTE
              <IconeFin nome="mesSeguinte" tamanho={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
