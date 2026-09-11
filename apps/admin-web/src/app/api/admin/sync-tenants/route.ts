import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { tenantService, type TenantSyncData } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = "force-dynamic";

/**
 * 🛰️ ROTA: SINCRONIZAÇÃO DAS EMPRESAS DE UM USUÁRIO (PJODC v10)
 * Local: apps/admin-web/src/app/api/admin/sync-tenants/route.ts
 *
 * Porta HTTP para `tenantService.syncUserTenants` — criar, desativar e reabilitar
 * as empresas de um usuário, e ajustar o papel dele conforme sobre ou não empresa
 * ativa. É a gravação do "Central de Comandos", e a única das três rotas novas
 * que MUDA o banco.
 *
 * ♻️ `revalidatePath` NÃO É ENFEITE AQUI. A `/dashboard/tenants` da web é
 * renderizada com cache de rota na Vercel; sem invalidá-la, uma empresa criada
 * pelo telemóvel continuaria invisível no navegador até o cache expirar sozinho —
 * e o dono do projeto veria duas verdades diferentes para o mesmo banco. A
 * Server Action equivalente já fazia exatamente isso; a rota precisa fazer igual.
 *
 * ⚠️ A MENSAGEM DE ERRO DE NEGÓCIO PASSA INTEIRA, ao contrário das outras duas
 * rotas. `NOME_EMPRESA_DUPLICADO` é a resposta que a tela precisa ler para dizer
 * "esse nome já está em uso" — trocá-la por um texto neutro deixaria o usuário
 * sem saber o que corrigir. O texto neutro continua valendo para o que NÃO for
 * previsto, que é onde mora o risco de vazar nome de tabela ou de policy.
 */
export async function POST(request: Request) {
  try {
    const { userId, tenants, deletedIds } = (await request.json()) as {
      userId?: string;
      tenants?: TenantSyncData[];
      deletedIds?: string[];
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Parâmetro 'userId' não informado." },
        { status: 400 }
      );
    }

    await tenantService.syncUserTenants(userId, tenants ?? [], deletedIds ?? []);

    revalidatePath("/dashboard/tenants");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const mensagem = mensagemDeErro(error);
    console.error("[API-ADMIN-SYNC-TENANTS] Falha ao sincronizar:", mensagem);

    const previsto = mensagem === "NOME_EMPRESA_DUPLICADO";
    return NextResponse.json(
      { success: false, error: previsto ? mensagem : "Erro interno ao sincronizar empresas." },
      { status: 500 }
    );
  }
}
