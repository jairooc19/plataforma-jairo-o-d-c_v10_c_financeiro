import { NextResponse } from "next/server";
// 🔵 IMPORTAÇÃO DO CÉREBRO ÚNICO
import { authService } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    /**
     * 🚀 O PULO DO GATO:
     * Delegamos a busca da lista de espera para o serviço centralizado.
     */
    const data = await authService.getPendingUsers();

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error("[API-USERS-PENDING] Falha ao recuperar via Core:", mensagemDeErro(error));
    
    return NextResponse.json(
      { success: false, error: "Erro interno ao processar triagem." }, 
      { status: 500 }
    );
  }
}