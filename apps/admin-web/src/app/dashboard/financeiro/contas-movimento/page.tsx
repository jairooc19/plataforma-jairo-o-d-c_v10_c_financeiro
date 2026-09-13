"use client";

import CadastroDeContas from "@/components/financeiro/cadastro/CadastroDeContas";

/**
 * 🏦 TELA: CADASTRO DE CONTAS MOVIMENTO (PJODC v10)
 * Onde o dinheiro está — caixa, banco e outras.
 *
 * A tela inteira é o componente compartilhado: ela e a de contas
 * identificadoras são gêmeas de propósito (especificação, seção 11).
 */
export default function ContasMovimentoPage() {
  return <CadastroDeContas variante="movimento" />;
}
