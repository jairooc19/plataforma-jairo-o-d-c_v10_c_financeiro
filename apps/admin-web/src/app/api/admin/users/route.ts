import { NextResponse } from "next/server";
import { tenantService } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = "force-dynamic";

/**
 * 🛰️ ROTA: TODOS OS USUÁRIOS DA PLATAFORMA (PJODC v10)
 * Local: apps/admin-web/src/app/api/admin/users/route.ts
 *
 * ⚠️ ESTA ROTA EXISTE PARA O MOBILE, e não para a web. O `admin-web` já lê esta
 * mesma lista pela Server Action `getAllUsersAction` e continua fazendo isso —
 * nada nele mudou. O que faltava era uma porta HTTP: Server Action não é
 * endereço, é uma chamada RPC do próprio Next.js, com corpo e cabeçalhos
 * proprietários. O `apps/mobile-app` não tem como falar esse protocolo.
 *
 * 🔐 POR QUE NÃO DÁ PARA O MOBILE FALAR DIRETO COM O BANCO: `getAllUsers` usa
 * `supabaseAdmin` (service role), proibido no mobile pelo CLAUDE.md — a chave
 * iria dentro do APK. E a RLS também não resolve: o Desenvolvedor do mobile
 * entra por credencial fixa no Core, SEM sessão Supabase, então `auth.uid()` é
 * nulo e nenhuma policy o reconhece. Só o servidor pode servir esta lista.
 *
 * ⚠️ SEM AUTENTICAÇÃO, como as demais rotas de `/api` deste projeto
 * (`/api/settings`, `/api/users/promote`, `/api/users/pending`). Quem souber a
 * URL lê a lista de usuários. É a postura que o projeto já tinha e a que estas
 * rotas seguem — está registrada como risco conhecido no CLAUDE.md, junto com a
 * credencial fixa do Painel de Engenharia. Endurecer isto é um trabalho só, e
 * vale para as seis rotas de uma vez: um segredo compartilhado em cabeçalho, ou
 * um JWT de serviço conferido aqui.
 */
export async function GET() {
  try {
    const data = await tenantService.getAllUsers();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    // A mensagem crua fica no log do servidor; ao cliente vai um texto neutro,
    // porque aqui roda a SERVICE ROLE e o erro pode citar tabela e policy.
    console.error("[API-ADMIN-USERS] Falha ao listar usuários:", mensagemDeErro(error));
    return NextResponse.json(
      { success: false, error: "Erro interno ao listar usuários." },
      { status: 500 }
    );
  }
}
