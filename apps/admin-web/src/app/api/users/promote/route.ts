import { NextResponse } from "next/server";
// 🔵 IMPORTAÇÃO DO CÉREBRO ÚNICO
import { authService } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { userId, userName, userEmail } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "ID do usuário não fornecido." }, { status: 400 });
    }

    /**
     * 🚀 O PULO DO GATO:
     * Toda a lógica de slug, criação de tenant e update de user agora
     * acontece dentro da transação segura do Core.
     */
    await authService.promoteToOwner(userId, userName, userEmail);

    return NextResponse.json({ 
      success: true, 
      message: "Proprietário habilitado e empresa criada com sucesso!" 
    });

  } catch (error: unknown) {
    const mensagem = mensagemDeErro(error, "Erro interno ao promover usuário.");
    console.error("[API-USERS-PROMOTE] Erro ao processar via Core:", mensagem);

    return NextResponse.json(
      { success: false, error: mensagem }, 
      { status: 500 }
    );
  }
}