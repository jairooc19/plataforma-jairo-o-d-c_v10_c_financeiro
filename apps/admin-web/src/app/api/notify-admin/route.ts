import { NextResponse } from "next/server";
// 🔵 IMPORTAÇÃO DO CÉREBRO ÚNICO
import { authService } from "@jairo/core";

// 1. Força a rota a ser dinâmica para processamento em tempo real
export const dynamic = 'force-dynamic';

/**
 * 🛠️ HEADERS DE SEGURANÇA (CORS)
 * Permite que o App Mobile (Android/iOS) fale com a Vercel com segurança.
 */
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}, { status: 200 }));
}

/**
 * 🛰️ ROTA: NOTIFY-ADMIN (PJODC v4 — REGISTRO LOCAL)
 *
 * A v4 removeu o Resend e qualquer disparo de e-mail transacional.
 * A rota foi preservada como ponte de triagem: ela apenas registra o novo
 * cadastro no log do servidor, junto dos administradores que seriam avisados.
 *
 * A triagem continua sendo feita no painel: Dashboard → Central de Comandos.
 */
export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    // Destinatários configurados em global_settings (mantido para a trilha do log).
    let adminEmailsArray = ['jairooc19@gmail.com'];
    try {
      const dbEmails = await authService.getAdminNotificationEmails();
      if (dbEmails && dbEmails.length > 0) {
        adminEmailsArray = dbEmails;
      }
    } catch {
      console.warn("[API-NOTIFY] Falha ao ler e-mails do banco, usando fallback padrão.");
    }

    console.log(
      `[API-NOTIFY] Novo cadastro aguardando triagem: ${name} <${email}> ` +
      `| responsáveis: ${adminEmailsArray.join(', ')}`
    );

    return setCorsHeaders(
      NextResponse.json({ success: true, notified: adminEmailsArray, channel: 'server-log' })
    );

  } catch (error) {
    const detalhe = error instanceof Error ? error.message : String(error);
    console.error("[API-NOTIFY-ADMIN] Erro interno inesperado:", detalhe);
    return setCorsHeaders(
      NextResponse.json({
        success: false,
        error: "Erro interno no servidor de notificações."
      }, { status: 500 })
    );
  }
}
