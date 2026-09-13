"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatarBRL, paraCentavos } from "@jairo/core";

/**
 * 💵 CAMPO DE VALOR EM REAIS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/CampoDinheiro.tsx
 *
 * O usuário digita "1234,56" e o componente devolve 123456 — CENTAVOS INTEIROS,
 * que é a única forma que o resto do sistema aceita. A conversão usa o
 * `lib/dinheiro.ts` do Core, o mesmo que o banco espera.
 *
 * ⚠️ O `isTypingRef` NÃO É FRESCURA. Sem ele, o efeito que formata o valor
 * dispara a cada tecla (porque o pai atualiza o estado ao receber o novo valor)
 * e o cursor salta para o fim do campo. É a lição nº 7 do `CLAUDE.md`.
 */
export default function CampoDinheiro({
  valorCentavos,
  onChange,
  id,
  disabled,
  permitirNegativo = false,
}: {
  valorCentavos: number;
  onChange: (centavos: number) => void;
  id?: string;
  disabled?: boolean;
  permitirNegativo?: boolean;
}) {
  const [texto, setTexto] = useState(() => formatarBRL(valorCentavos, { semSimbolo: true }));
  const montadoRef = useRef(false);
  const digitandoRef = useRef(false);

  useEffect(() => {
    if (!montadoRef.current) { montadoRef.current = true; return; }
    if (digitandoRef.current) { digitandoRef.current = false; return; }
    setTexto(formatarBRL(valorCentavos, { semSimbolo: true }));
  }, [valorCentavos]);

  const aoDigitar = (e: React.ChangeEvent<HTMLInputElement>) => {
    digitandoRef.current = true;
    const bruto = e.target.value;
    setTexto(bruto);
    try {
      const negativo = permitirNegativo && bruto.trim().startsWith("-");
      const centavos = paraCentavos(bruto.replace("-", "").trim() || "0");
      onChange(negativo ? -centavos : centavos);
    } catch {
      // Texto ainda incompleto ("1.", "-"): mantém o último valor válido.
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={aoDigitar}
        onBlur={() => setTexto(formatarBRL(valorCentavos, { semSimbolo: true }))}
        disabled={disabled}
        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-right font-mono
                   focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
      />
    </div>
  );
}
