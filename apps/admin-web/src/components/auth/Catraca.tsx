"use client";

/**
 * 🛡️ COMPONENTE CATRACA - MODO BYPASS (PJODC v4)
 *
 * A v4 removeu o Cloudflare Turnstile e toda a verificação externa de humanidade.
 * O componente foi mantido como ponto de extensão do fluxo de login: ele libera
 * a passagem imediatamente, sem rede, sem chave de API e sem widget de terceiros.
 *
 * Para reativar uma verificação no futuro, basta reintroduzir a lógica aqui e
 * voltar a condicionar o submit do LoginFormsView ao resultado.
 */
export default function Catraca() {
  // Catraca sempre liberada nesta versão (isVerified = true).
  return (
    <div className="catraca-container flex flex-col items-center justify-center p-4 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 my-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Acesso Direto Liberado
        </p>
      </div>
    </div>
  );
}
