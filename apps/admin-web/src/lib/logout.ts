import { authService } from "@jairo/core";

/**
 * 🚪 LOGOUT COMPLETO — as duas metades da sessão (PJODC v10)
 * Local: apps/admin-web/src/lib/logout.ts
 *
 * A sessão desta plataforma vive em dois lugares e sair de um só não é sair:
 *   1. armazenamento do navegador (supabase-js)  -> authService.signOut()
 *   2. cookies HTTP, escritos pelo servidor      -> POST /auth/logout
 * Some ainda um terceiro resíduo, o `sessionStorage`, que guarda a empresa ativa
 * e a bandeira de desenvolvedor — deixá-lo para trás faria o próximo usuário
 * desta máquina cair na empresa do anterior.
 *
 * Fica num arquivo só porque o dashboard e a tela de completar cadastro precisam
 * exatamente do mesmo encerramento. Duplicar isso é como esquecer uma das metades.
 *
 * ⚠️ NUNCA LANÇA: um logout que falha pela metade é pior que um logout ruidoso.
 * Se o servidor não responder, a sessão do navegador ainda é encerrada e o
 * usuário sai da tela; o middleware derruba o cookie órfão na requisição seguinte.
 */
export async function encerrarSessao() {
  // Primeiro os cookies: enquanto o cliente ainda tem sessão, o servidor
  // consegue identificá-la para apagá-la.
  try {
    await fetch("/auth/logout", { method: "POST" });
  } catch (erro) {
    console.error("[Logout] Cookies de sessão não foram limpos no servidor:", erro);
  }

  try {
    await authService.signOut();
  } catch (erro) {
    console.error("[Logout] Sessão do navegador não foi encerrada:", erro);
  }

  try {
    sessionStorage.clear();
  } catch {
    // sessionStorage indisponível (janela anônima restrita): nada a limpar.
  }
}
