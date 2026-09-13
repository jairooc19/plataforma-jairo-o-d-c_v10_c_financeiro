"use client";

import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import ModalNovoCadastro from "@/components/financeiro/ModalNovoCadastro";
import IconeFin from "@/components/financeiro/IconeFin";
import { useNovoLancamento } from "@/components/financeiro/lancamento/useNovoLancamento";
import FormularioDeLancamento from "@/components/financeiro/lancamento/FormularioDeLancamento";
import PainelDeConferencia from "@/components/financeiro/lancamento/PainelDeConferencia";

/**
 * ✍️ TELA: NOVO LANÇAMENTO + CONFERÊNCIA DA CONTA (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/lancamentos/novo/page.tsx
 *
 * A tela central do módulo (especificação, seções 12 e 13): o formulário à
 * esquerda, o extrato da conta à direita — para lançar conferindo contra o
 * extrato do banco, que é o propósito de tudo isto.
 *
 * ⚠️ ESTE ARQUIVO ERA DE 354 LINHAS e virou um orquestrador. A regra de ouro do
 * projeto manda fatiar acima de ~150; ao acrescentar o botão IMPRIMIR e a porta
 * da TRANSFERÊNCIA em 13/09/2026, ele passaria de 400. O estado foi para
 * `useNovoLancamento.ts` e as duas colunas viraram componentes próprios.
 */
export default function NovoLancamentoPage() {
  const { carregando, erro: erroContexto, pode } = useEmpresaAtiva();
  const m = useNovoLancamento();

  if (carregando) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (erroContexto) return <Recado texto={erroContexto} />;

  if (!pode("lc_criar")) {
    return <Recado texto="VOCÊ NÃO TEM PERMISSÃO PARA CRIAR LANÇAMENTOS. FALE COM O PROPRIETÁRIO DA EMPRESA." />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <FormularioDeLancamento m={m} />
      <PainelDeConferencia m={m} />

      {m.modal && (
        <ModalNovoCadastro
          variante={m.modal}
          tenantId={m.ctx.tenantId!}
          onFechar={() => m.setModal(null)}
          onGravado={m.aoGravarCadastro}
        />
      )}
    </div>
  );
}

function Recado({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-6
                    font-black uppercase text-amber-900 text-sm">
      <IconeFin nome="atencao" tamanho={20} traco={1.75} />
      <span>{texto}</span>
    </div>
  );
}
