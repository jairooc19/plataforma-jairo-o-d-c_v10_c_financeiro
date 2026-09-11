import Link from "next/link";
import { MENSAGEM_BLOQUEIO } from "@/lib/mobileBlock";

/**
 * 📱 PÁGINA DE BLOQUEIO MÓVEL (PJODC v10)
 * Local: apps/admin-web/src/app/mobile-blocked/page.tsx
 *
 * Destino do redirecionamento do middleware quando um user agent de celular
 * tenta entrar no `/dashboard`. É a mesma mensagem do overlay, só que como
 * página inteira — porque aqui a navegação já foi interrompida no servidor.
 *
 * 🚫 SEM BOTÃO "VOLTAR" (`window.history.back()`). Ele exigiria transformar
 * este Server Component em cliente por causa de um único `onClick`, e levaria
 * o usuário de volta à rota que o middleware acabou de barrar: o redirecionamento
 * o traria para cá outra vez. Um laço com aparência de saída.
 */
export default function MobileBlockedPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-xl">
        <p className="mb-4 text-3xl">📱</p>
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Acesso Não Permitido</h2>
        <p className="mb-8 text-gray-600">{MENSAGEM_BLOQUEIO}</p>
        <Link
          href="/"
          className="block rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
        >
          Ir para a Home
        </Link>
      </div>
    </div>
  );
}
