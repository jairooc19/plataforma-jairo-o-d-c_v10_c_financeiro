import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 🔵 RECONEXÃO: Importando o serviço de configurações e a versão centralizada do Core
import { settingsService, WEB_VERSION } from "@jairo/core";
// 🔑 Casca "use client" do Google Identity Services (este layout é Server Component)
import GoogleAuthProvider from "@/components/providers/GoogleAuthProvider";
// 📱 Bloqueio de telas pequenas: montado no layout raiz para cobrir TODA rota
import { MobileBlocker } from "@/components/MobileBlocker";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  // 🚀 O PULO DO GATO: Web usa o serviço centralizado para o título
  const settings = await settingsService.getGlobalSettings();
  return { title: settings.system_title, description: "Engenharia de Software" };
}

/**
 * ÍCONE LOGO PJODC (Preservado conforme Identidade Visual)
 *
 * ⚠️ MORA NO ESCOPO DO MÓDULO, e não dentro do `RootLayout`. Um componente
 * declarado dentro do corpo de outro é uma FUNÇÃO NOVA a cada render: o React
 * a trata como um tipo diferente, desmonta a árvore anterior e monta outra do
 * zero, perdendo estado e refazendo o DOM. Aqui o desenho é estático e o
 * prejuízo seria só desperdício — mas a regra não distingue, e o padrão certo
 * é este.
 */
const LogoIcon = () => {
  const textoCircular = "PJODC-".repeat(14);
  const perimetroTotal = "157.1";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="55" height="55" className="shrink-0">
      <defs>
        <path id="trilhoFechado25" d="M 50, 50 m -25, 0 a 25,25 0 1,1 50,0 a 25,25 0 1,1 -50,0" />
      </defs>
      <circle cx="50" cy="50" r="30" fill="white" />
      <g id="bandeira-br">
        <rect x="38" y="42" width="24" height="16" fill="#009b3a" />
        <polygon points="50,43.5 60.5,50 50,56.5 39.5,50" fill="#fedf00" />
        <circle cx="50" cy="50" r="4" fill="#002776" />
      </g>
      <text fontFamily="monospace" fontSize="4" fontWeight="bold" fill="#42A5F5" textLength={perimetroTotal} lengthAdjust="spacingAndGlyphs">
        <textPath href="#trilhoFechado25">{textoCircular}</textPath>
      </text>
    </svg>
  );
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 🚀 O PULO DO GATO: Web busca as configurações visuais no banco
  const settings = await settingsService.getGlobalSettings();

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body 
        className="min-h-full flex flex-col transition-colors duration-500"
        style={{ 
          backgroundColor: settings.color_bg_general,
          "--header-bg": settings.color_header_bg,
          "--header-text": settings.color_header_text,
          "--footer-bg": settings.color_footer_bg,
          "--footer-text": settings.color_footer_text,
          "--btn-border": settings.color_button_border,
          "--border-global": settings.color_border_header_footer,
        } as React.CSSProperties}
      >
        {/* 📱 Primeiro filho do <body>: a cortina cobre cabeçalho, conteúdo e rodapé. */}
        <MobileBlocker />

        <header
          className="w-full backdrop-blur-md shadow-sm py-0.5 px-6 sticky top-0 z-50 border-b transition-all"
          style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border-global)" }}
        >
          <div className="max-w-7xl mx-auto flex justify-center items-center gap-4">
            <LogoIcon />
            <h1 className="text-xl md:text-2xl font-black tracking-widest uppercase transition-colors" style={{ color: "var(--header-text)" }}>
              {settings.system_title}
            </h1>
          </div>
        </header>

        {/* 🔑 O provedor embrulha só o conteúdo: cabeçalho e rodapé não precisam
            do contexto do Google, e mantê-los fora evita reprocessá-los à toa. */}
        <main className="flex-1 flex flex-col relative">
          <GoogleAuthProvider>{children}</GoogleAuthProvider>
        </main>

        <footer 
          className="w-full py-5 px-6 mt-auto relative z-20 border-t transition-all"
          style={{ backgroundColor: "var(--footer-bg)", borderColor: "var(--border-global)" }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center gap-1 md:gap-3 text-xs font-medium text-center" style={{ color: "var(--footer-text)" }}>
            <p>&copy; 2026. Todos os direitos reservados para Jairo Oliveira da Cunha.</p>
            <span className="hidden md:inline opacity-50">|</span>
            <p className="uppercase tracking-wider">Versão: <strong>{WEB_VERSION}</strong></p>
          </div>
        </footer>
      </body>
    </html>
  );
}