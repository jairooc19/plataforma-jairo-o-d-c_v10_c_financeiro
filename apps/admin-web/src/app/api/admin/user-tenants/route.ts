import { NextResponse } from "next/server";
import { tenantService } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = "force-dynamic";

/**
 * 🛰️ ROTA: EMPRESAS DE UM USUÁRIO (PJODC v10)
 * Local: apps/admin-web/src/app/api/admin/user-tenants/route.ts
 *
 * Porta HTTP para `tenantService.getUserTenantManagement`, que o `admin-web`
 * consome por Server Action e o mobile não alcança. Ver o cabeçalho de
 * `api/admin/users/route.ts` para o porquê de a service role ser obrigatória
 * aqui e o mobile não poder tê-la.
 *
 * ⚠️ O `userId` VEM NA QUERY STRING, e não no corpo: isto é um GET, e um GET com
 * corpo é ignorado por proxies, caches e pelo próprio `fetch` de algumas
 * plataformas. A ausência do parâmetro é 400, não 500 — o pedido está errado, o
 * servidor não.
 */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Parâmetro 'userId' não informado." },
        { status: 400 }
      );
    }

    const data = await tenantService.getUserTenantManagement(userId);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("[API-ADMIN-USER-TENANTS] Falha ao ler vínculos:", mensagemDeErro(error));
    return NextResponse.json(
      { success: false, error: "Erro interno ao ler as empresas do usuário." },
      { status: 500 }
    );
  }
}
