"use client";

import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MENSAGEM_BLOQUEIO, ROTAS_SEM_BLOQUEIO } from "@/lib/mobileBlock";

/**
 * 📱 BLOQUEIO DE TELAS PEQUENAS — CAMADA VISUAL (PJODC v10)
 * Local: apps/admin-web/src/components/MobileBlocker.tsx
 *
 * Cobertura por LARGURA de tela, montado no layout raiz: vale para toda rota,
 * inclusive as que o middleware deixa passar (guarita, cadastro, callbacks).
 *
 * 🚫 NÃO RENDERIZA NADA NAS ROTAS DE `ROTAS_SEM_BLOQUEIO`. São duas, por razões
 * diferentes: `/mobile-blocked` JÁ É a mensagem de bloqueio (sem esta guarda o
 * celular veria o aviso duas vezes, e o botão "Ir para Home" ficaria enterrado);
 * e `/privacidade` é o documento público do app MÓVEL, que o revisor da Play
 * Store abre no celular — a cortina ali significaria reprovação.
 *
 * O overlay é `fixed inset-0` com `z-[100]`: o cabeçalho do layout raiz é
 * `z-50`, então precisa ficar acima dele para que o bloqueio seja de fato
 * intransponível — e não uma cortina com um menu clicável por cima.
 */
export function MobileBlocker() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  if (!isMobile || ROTAS_SEM_BLOQUEIO.includes(pathname)) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bloqueio-mobile-titulo"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-lg">
        <h2 id="bloqueio-mobile-titulo" className="mb-4 text-2xl font-bold text-gray-800">
          📱 Acesso Não Permitido
        </h2>
        <p className="mb-6 text-gray-600">{MENSAGEM_BLOQUEIO}</p>
        <p className="mb-6 font-semibold text-gray-600">
          Para usar em celular, baixe o <strong>app mobile</strong>.
        </p>
        <div className="mb-2 border-l-4 border-blue-500 bg-blue-50 p-4 text-left">
          <p className="text-sm text-gray-700"><strong>Opções:</strong></p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            <li>✓ Use em desktop/laptop</li>
            <li>✓ Baixe o app mobile (iOS/Android)</li>
            <li>✓ Use tablet em modo paisagem</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
