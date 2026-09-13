import { ProvedorFinanceiro } from "@/components/financeiro/ContextoFinanceiro";
import MolduraFinanceiro from "@/components/financeiro/MolduraFinanceiro";

/**
 * 🧩 A CASCA DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/layout.tsx
 *
 * Duas linhas, de propósito. O provedor busca UMA vez quem está usando o módulo
 * e em qual empresa; a moldura desenha a faixa do topo, o menu lateral e o
 * rodapé. Cada um no seu arquivo — a regra de ouro do projeto.
 *
 * ⚠️ A ORDEM IMPORTA: a moldura CONSOME o contexto (para esconder do menu o que
 * o usuário não pode abrir), então ela tem de estar DENTRO do provedor. Invertê-los
 * faria o menu enxergar o contexto vazio e esconder tudo, sem erro nenhum na tela.
 */
export default function LayoutFinanceiro({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorFinanceiro>
      <MolduraFinanceiro>{children}</MolduraFinanceiro>
    </ProvedorFinanceiro>
  );
}
