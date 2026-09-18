"use client";

import {
  formatarBRL, faixaDeConsumo, larguraDaBarra, situacaoDaLinha,
  type LinhaDoDinheiro,
} from "@jairo/core";

/**
 * 📊 A BARRA DE CONSUMO — orçado contra realizado (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/orcamento/BarraDeConsumo.tsx
 *
 * O pedido era *"de modo que o usuário só no olhar saberá que do valor orçado
 * já foi consumido X"*. A barra é isso: a cor responde antes de a pessoa ler
 * qualquer número.
 *
 * ⚠️ ELA NÃO DECIDE NADA. A cor, a largura e a frase ao lado vêm de
 * `orcamentoRegras.ts`, no Core, com teste no `npm test`. É lá que está a regra
 * que mais erra em silêncio: **nas RECEITAS o sentido se inverte** — bater 100%
 * é bom, e pintar de vermelho uma meta cumprida seria dizer o contrário do que
 * aconteceu.
 *
 * 🎁 A MARCA DO RITMO DO MÊS (bônus B4) é o risquinho vertical. Consumir 78% no
 * dia 18 (quando 60% do mês passou) é diferente de consumir 78% no dia 30 — e a
 * barra sozinha não conta isso.
 *
 * ⚠️ NO MODO PERCENTUAL não há valores para mostrar, e o componente não tenta:
 * `orcado_centavos` e `realizado_centavos` chegam NULOS **do banco**, e a frase
 * ao lado fala só de percentual. Ver `fin_dinheiro_do_periodo` no schema.
 */
export default function BarraDeConsumo({ linha, ritmo }: {
  linha: LinhaDoDinheiro;
  /** Quanto do mês já passou, de 0 a 100. Vem de `ritmoDoMes()`, no Core. */
  ritmo: number;
}) {
  const faixa = faixaDeConsumo(linha.consumo_percentual, linha.tipo);
  const largura = larguraDaBarra(linha.consumo_percentual);
  const situacao = situacaoDaLinha(linha, (c) => formatarBRL(c));
  const veValores = linha.orcado_centavos !== null || linha.realizado_centavos !== null;

  const cor =
    faixa === "VERDE" ? "bg-emerald-400"
    : faixa === "AMBAR" ? "bg-amber-400"
    : "bg-red-400";

  const corDoTexto =
    faixa === "VERDE" ? "text-emerald-700"
    : faixa === "AMBAR" ? "text-amber-700"
    : "text-red-700";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-black uppercase tracking-tight text-slate-800">
          {linha.nome}
        </span>

        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 font-mono">
          {veValores ? (
            <>
              {linha.orcado_centavos !== null && <>ORÇADO {formatarBRL(linha.orcado_centavos)} · </>}
              REALIZADO {formatarBRL(linha.realizado_centavos ?? 0)}
            </>
          ) : (
            "VALORES OCULTOS — VOCÊ VÊ SOMENTE O PERCENTUAL"
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 h-4 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
          <div className={`h-full ${cor}`} style={{ width: `${largura}%` }} />

          {/* 🎁 A marca do ritmo do mês. Só faz sentido onde há orçamento. */}
          {linha.bloco !== "FORA" && ritmo > 0 && ritmo < 100 && (
            <span
              className="absolute top-0 bottom-0 w-px bg-slate-500/60"
              style={{ left: `${ritmo}%` }}
              title={`${ritmo}% DO MÊS JÁ PASSOU`}
            />
          )}
        </div>

        <span className={`w-12 text-right text-xs font-black font-mono ${corDoTexto}`}>
          {linha.consumo_percentual === null ? "—" : `${linha.consumo_percentual}%`}
        </span>
      </div>

      <p className={`text-[11px] font-black uppercase tracking-widest ${
        situacao.destaque ? corDoTexto : "text-slate-400"
      }`}>
        {situacao.texto}
      </p>
    </div>
  );
}
