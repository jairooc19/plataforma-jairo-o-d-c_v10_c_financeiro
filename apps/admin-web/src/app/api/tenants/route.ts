import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mensagemDeErro } from "@/lib/erro";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Inicialização protegida dentro da função
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, owner_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    // A mensagem crua fica no log do servidor; ao cliente vai um texto neutro,
    // porque aqui roda a SERVICE ROLE e o erro pode citar tabela e policy.
    console.error("[API-TENANTS] Falha ao listar empresas:", mensagemDeErro(error));
    return NextResponse.json({ success: false, error: "Erro interno no servidor de API." }, { status: 500 });
  }
}