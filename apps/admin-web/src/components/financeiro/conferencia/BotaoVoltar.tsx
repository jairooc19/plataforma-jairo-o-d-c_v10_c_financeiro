"use client";

import { useRouter, useSearchParams } from "next/navigation";
import IconeFin from "../IconeFin";

/**
 * ◄ O BOTÃO VOLTAR DAS CONFERÊNCIAS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/conferencia/BotaoVoltar.tsx
 *
 * Pedido do dono do projeto em 18/09/2026, depois de usar os dashboards: "ao
 * clicar e abrir a conferência, seria possível ter função para retornar para a
 * tela que estava antes? Atualmente preciso iniciar todo o caminho do zero".
 *
 * ===========================================================================
 * ⚠️ POR QUE NÃO BASTA `router.back()`
 * ===========================================================================
 * O `back()` traz a PÁGINA de volta, mas o dashboard é remontado do zero — e o
 * ANO e a caixa de ocultar transferências eram estado de componente. Quem
 * tivesse navegado até 2023 voltaria para o ano corrente, que é quase o mesmo
 * atrito que ele reclamou.
 *
 * Por isso o clique no dashboard carrega `?voltar=<endereço completo>`, com o
 * ano dentro. O botão apenas reabre esse endereço, e a tela volta **igual**.
 *
 * ⚠️ MAS O `back()` CONTINUA SENDO A REDE DE SEGURANÇA. Sem `?voltar=` — alguém
 * que colou o endereço da conferência, ou que chegou por um favorito — o botão
 * usa o histórico; e se nem histórico houver, ele simplesmente não aparece, em
 * vez de existir sem fazer nada.
 *
 * ⚠️ O ENDEREÇO DE VOLTA É VALIDADO ANTES DE SER USADO. Ele vem da URL, que
 * qualquer um pode escrever: sem a checagem, um link montado à mão poderia
 * empurrar a pessoa para fora do sistema com um clique que parece inofensivo.
 * Só endereço interno, começando por uma barra e sem uma segunda barra logo
 * depois (que é como se escreve `//site.externo`).
 */
export default function BotaoVoltar({ rotulo = "VOLTAR" }: { rotulo?: string }) {
  const router = useRouter();
  const parametros = useSearchParams();

  const bruto = parametros?.get("voltar") ?? null;
  const destino = bruto && bruto.startsWith("/") && !bruto.startsWith("//") ? bruto : null;

  const voltar = () => {
    if (destino) router.push(destino);
    else router.back();
  };

  return (
    <button
      type="button"
      onClick={voltar}
      title={destino
        ? "VOLTAR PARA O DASHBOARD, NO MESMO ANO EM QUE VOCÊ ESTAVA"
        : "VOLTAR PARA A TELA ANTERIOR"}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300
                 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 shrink-0"
    >
      <IconeFin nome="voltar" tamanho={15} />
      {rotulo}
    </button>
  );
}
