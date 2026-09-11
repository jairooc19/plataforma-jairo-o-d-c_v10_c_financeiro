import { NextResponse } from "next/server";
// 🔵 IMPORTAÇÃO DO CÉREBRO ÚNICO
import { settingsService } from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    /**
     * 🚀 O PULO DO GATO:
     * Delegamos a gravação para o serviço centralizado.
     */
    await settingsService.updateGlobalSettings(body);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const mensagem = mensagemDeErro(error);
    console.error("[SETTINGS-API] Erro ao atualizar via Core:", mensagem);
    return NextResponse.json({ success: false, error: mensagem }, { status: 500 });
  }
}

export async function GET() {
  try {
    /**
     * 🚀 O PULO DO GATO:
     * Delegamos a busca para o serviço centralizado.
     */
    const data = await settingsService.getGlobalSettings();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: mensagemDeErro(error) }, { status: 500 });
  }
}