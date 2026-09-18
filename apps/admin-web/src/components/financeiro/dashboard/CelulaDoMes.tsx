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
 * 0️⃣ MÊS PARADO = A COLUNA INTEIRA MOSTRA 0,00 (18/09/2026, 3ª rodada).
 *    Pedido do dono do projeto: *"se em um determinado mês não existir NENHUM
 *    lançamento, todas as contas são apresentadas com saldo zero; se existir um
 *    ou mais lançamentos em QUALQUER das contas, apresentar os saldos finais
 *    para TODAS as contas, mesmo as que não tiveram lançamento naquele mês"*.
 *
 *    ⚠️ QUEM DECIDE É A COLUNA, NÃO A LINHA — e foi isso que a 3ª rodada
 *    corrigiu. Na 2ª, a célula sumia CONTA A CONTA: num mês em que só o CAIXA
 *    se mexeu, o BANCO ficava em branco mas o dinheiro dele continuava dentro
 *    da linha de TOTAL, e **a soma do que se via deixava de bater com o
 *    total**. Com a decisão na coluna, os dois casos fecham: mês com movimento
 *    mostra tudo e soma certo; mês parado mostra zeros, e 0+0+0 = 0.
 *
 *    ⚠️ O SALDO CONTINUA ACUMULANDO POR DENTRO. O 0,00 de um mês parado é o que
 *    a célula MOSTRA, não o que a conta TEM: se março fechou em 2.600,00 e
 *    abril inteiro ficou parado, maio (se tiver movimento) continua partindo de
 *    2.600,00. A conta não reinicia. A dica do mouse diz o saldo verdadeiro.
 *
 *    ⚠️ CÉLULA DE MÊS PARADO NÃO É CLICÁVEL. Abrir uma conferência de um mês
 *    sem lançamento nenhum mostraria o saldo inicial e mais nada — prometer um
 *    clique e entregar isso é pior do que não oferecer o clique.
 *
 * ⚠️ ELA NÃO FORMATA DINHEIRO POR CONTA PRÓPRIA. `formatarBRL` é do Core, onde
 * mora a regra dos centavos inteiros — a mesma que o extrato e a impressão usam.
 */
export default function CelulaDoMes({
  celula, aoClicar, ehTotal, mostrarCadeado, ocultarSemLancamento = false,
}: {
  celula: CelulaDoDashboard;
  /** Ausente = a célula não é clicável (quem não pode ver a conferência). */
  aoClicar?: () => void;
  ehTotal: boolean;
  /** Só o dashboard dos saldos tem fechamento de período. */
  mostrarCadeado: boolean;
  /** Só o dashboard dos saldos: mês sem lançamento fica em branco. */
  ocultarSemLancamento?: boolean;
}) {
  const negativo = celula.valorCentavos < 0;
  /** O MÊS inteiro ficou parado — em todas as contas do dashboard. */
  const mesParado = ocultarSemLancamento && !celula.mesTeveLancamento;
  const abrir = mesParado ? undefined : aoClicar;

  const dica = mesParado
    ? `NENHUM LANÇAMENTO NESTE MÊS, EM CONTA NENHUMA · O SALDO REAL DA CONTA CONTINUA ${
        formatarBRL(celula.valorCentavos)}`
    : [
        `ENTRADAS ${formatarBRL(celula.entradasCentavos)}`,
        `SAÍDAS ${formatarBRL(celula.saidasCentavos)}`,
        // A conta parada num mês em que as OUTRAS se mexeram: o saldo dela
        // aparece (é o que o pedido manda), e a dica explica de onde ele vem.
        !celula.temLancamento ? "ESTA CONTA NÃO TEVE LANÇAMENTO NESTE MÊS" : null,
        celula.fechado ? "PERÍODO FECHADO" : null,
        celula.futuro ? "MÊS AINDA NÃO ENCERRADO — VALOR PREVISTO" : null,
        abrir ? "CLIQUE PARA CONFERIR ESTE MÊS" : null,
      ].filter(Boolean).join(" · ");

  return (
    <td
      onClick={abrir}
      onKeyDown={abrir ? (e) => { if (e.key === "Enter") abrir(); } : undefined}
      tabIndex={abrir ? 0 : undefined}
      title={dica}
      className={[
        "px-2 py-2 text-right font-mono whitespace-nowrap border-b border-slate-100",
        celula.futuro ? "bg-slate-50/80" : "",
        ehTotal ? "font-black" : "",
        mesParado ? "text-slate-300" : negativo ? "text-red-700" : "text-slate-800",
        abrir ? "cursor-pointer hover:bg-blue-50" : "",
      ].join(" ")}
    >
      {mesParado ? (
        /* ⚠️ ZERO APAGADO, E NÃO CÉLULA VAZIA. O pedido foi "apresentadas com
           saldo zero, 0,00"; e uma coluna inteira de zeros — total incluído —
           se lê de relance como "neste mês não houve movimento", enquanto uma
           coluna vazia parece tabela quebrada. */
        <span className="select-none">{formatarBRL(0, { semSimbolo: true })}</span>
      ) : (
        <span className="inline-flex items-center justify-end gap-1">
          {mostrarCadeado && celula.fechado && (
            <IconeFin nome="fechado" tamanho={11} className="text-slate-400 shrink-0" />
          )}
          {formatarBRL(celula.valorCentavos, { semSimbolo: true })}
        </span>
      )}
    </td>
  );
}
