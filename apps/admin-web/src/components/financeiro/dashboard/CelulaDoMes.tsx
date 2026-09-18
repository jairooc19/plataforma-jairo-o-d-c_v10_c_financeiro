"use client";

import { formatarBRL, type CelulaDoDashboard } from "@jairo/core";
import IconeFin from "../IconeFin";

/**
 * 🔢 UMA CÉLULA DO DASHBOARD — um mês de uma linha (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/dashboard/CelulaDoMes.tsx
 *
 * Ela carrega quatro sinais, e cada um existe por um motivo concreto:
 *
 * 🔴 VERMELHO = SALDO NEGATIVO. Conta de caixa negativa é impossível na vida
 *    real: significa lançamento faltando ou errado. Em doze colunas de números
 *    pretos, um negativo passa despercebido.
 *
 * 🔒 CADEADO = MÊS FECHADO (RN-24). O dado já existe em `fin_fechamentos` e vem
 *    junto na mesma consulta. Ele responde de relance a pergunta de quem abre
 *    um dashboard de saldos: "até onde eu já conferi?".
 *
 * ⬜ FUNDO ACINZENTADO = MÊS FUTURO. O sistema aceita lançamento com data à
 *    frente (o formulário só avisa acima de 90 dias). Um saldo de novembro
 *    visto em setembro é PREVISÃO, não fato — e sem marcação os dois se parecem.
 *
 * 💬 A DICA AO PASSAR O MOUSE mostra o que entrou e o que saiu naquele mês.
 *    Responde "o que aconteceu aqui?" sem sair da tela, e não custa nenhuma ida
 *    a mais ao banco: os dois números já vêm na mesma consulta.
 *
 * ⚠️ ELA NÃO FORMATA DINHEIRO POR CONTA PRÓPRIA. `formatarBRL` é do Core, onde
 * mora a regra dos centavos inteiros — a mesma que o extrato e a impressão usam.
 */
export default function CelulaDoMes({
  celula, aoClicar, ehTotal, mostrarCadeado,
}: {
  celula: CelulaDoDashboard;
  /** Ausente = a célula não é clicável (quem não pode ver a conferência). */
  aoClicar?: () => void;
  ehTotal: boolean;
  /** Só o dashboard dos saldos tem fechamento de período. */
  mostrarCadeado: boolean;
}) {
  const negativo = celula.valorCentavos < 0;

  const dica = [
    `ENTRADAS ${formatarBRL(celula.entradasCentavos)}`,
    `SAÍDAS ${formatarBRL(celula.saidasCentavos)}`,
    celula.fechado ? "PERÍODO FECHADO" : null,
    celula.futuro ? "MÊS AINDA NÃO ENCERRADO — VALOR PREVISTO" : null,
    aoClicar ? "CLIQUE PARA CONFERIR ESTE MÊS" : null,
  ].filter(Boolean).join(" · ");

  return (
    <td
      onClick={aoClicar}
      onKeyDown={aoClicar ? (e) => { if (e.key === "Enter") aoClicar(); } : undefined}
      tabIndex={aoClicar ? 0 : undefined}
      title={dica}
      className={[
        "px-2 py-2 text-right font-mono whitespace-nowrap border-b border-slate-100",
        celula.futuro ? "bg-slate-50/80" : "",
        ehTotal ? "font-black" : "",
        negativo ? "text-red-700" : "text-slate-800",
        aoClicar ? "cursor-pointer hover:bg-blue-50" : "",
      ].join(" ")}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {mostrarCadeado && celula.fechado && (
          <IconeFin nome="fechado" tamanho={11} className="text-slate-400 shrink-0" />
        )}
        {formatarBRL(celula.valorCentavos, { semSimbolo: true })}
      </span>
    </td>
  );
}
