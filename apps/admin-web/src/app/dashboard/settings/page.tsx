"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authService,
  settingsService,
  telemetry,
  ANALYTICS_EVENTS,
  PADROES_DE_FABRICA,
  type GlobalSettings,
} from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

/**
 * 🎨 AJUSTES GLOBAIS — WHITE LABEL (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/settings/page.tsx
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  1. A GRAVAÇÃO DEIXOU DE PASSAR POR UMA ROTA ABERTA. A v9 mandava um POST
 *     para `/api/settings`, que usava a chave mestra e não perguntava quem era
 *     quem: qualquer pessoa com o endereço trocava o título e as cores do
 *     sistema. Agora é `settingsService.updateGlobalSettings`, que chama a
 *     função `admin_update_global_settings` — e ela confere `is_superuser()`
 *     dentro do banco.
 *  2. A CHECAGEM DE ACESSO ERA MENTIRA. O código testava
 *     `profile?.role !== 'DEVELOPER'`, e esse papel NUNCA existiu na tabela
 *     (`role` só assume 'pending' ou 'active'). Na prática, quem entrasse por
 *     aqui dependia só da marca no `sessionStorage`.
 *  3. OS PADRÕES DE FÁBRICA VÊM DO CORE. Eram três listas diferentes espalhadas
 *     pelo repositório — duas iguais e uma (a do SQL) com outras cores.
 */

/** As sete colunas de cor de `global_settings`, derivadas do tipo do Core. */
type CampoCor = Exclude<keyof GlobalSettings, 'id' | 'system_title' | 'admin_emails'>;

const CAMPOS_FUNDO: CampoCor[] = ['color_header_bg', 'color_footer_bg', 'color_bg_general'];
const CAMPOS_TEXTO: CampoCor[] = [
  'color_header_text',
  'color_footer_text',
  'color_border_header_footer',
  'color_button_border',
];

export default function GlobalSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [settings, setSettings] = useState<GlobalSettings>({ id: 1, ...PADROES_DE_FABRICA });

  useEffect(() => {
    async function carregar() {
      try {
        // 🛡️ A pergunta vai ao banco. Esconder a tela não é controle de acesso —
        // quem recusa de verdade é a função `admin_update_global_settings`.
        const ehDev = await authService.ehDesenvolvedor();
        if (!ehDev) {
          router.replace("/dashboard");
          return;
        }

        setSettings(await settingsService.getGlobalSettings());
      } catch (error: unknown) {
        setMessage({ text: "Erro ao carregar configurações: " + mensagemDeErro(error), type: 'error' });
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const gravar = async (valores: GlobalSettings, textoDeSucesso: string) => {
    setSaving(true);
    setMessage(null);

    try {
      await settingsService.updateGlobalSettings(valores);
      telemetry.capture(ANALYTICS_EVENTS.SETTINGS_UPDATED);
      setSettings(valores);
      setMessage({ text: textoDeSucesso, type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: unknown) {
      setMessage({ text: "Erro ao salvar: " + mensagemDeErro(error), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await gravar(settings, "✅ Configurações Globais atualizadas com sucesso!");
  };

  const handleRestoreDefaults = async () => {
    const confirmar = window.confirm("ATENÇÃO: Tem certeza que deseja retornar ao padrão de fábrica?");
    if (!confirmar) return;
    await gravar({ id: 1, ...PADROES_DE_FABRICA }, "🔄 Padrões de fábrica restaurados com sucesso!");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
         <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-transparent p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/dashboard")} className="p-2 bg-white rounded-xl shadow-sm hover:shadow text-slate-500 hover:text-slate-800 transition-all border border-slate-200">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configurações Globais</h1>
            <p className="text-slate-500 text-sm">Painel White Label (Título, Cores e Alertas)</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium border mb-6 shadow-sm animate-fade-in ${
            message.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">Identidade do Sistema</h2>
            <div className="max-w-xl">
              <label htmlFor="system_title" className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Título Oficial</label>
              <input id="system_title" type="text" name="system_title" value={settings.system_title} onChange={handleChange} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-800" />
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Central de Notificações</h2>
            <p className="text-slate-500 text-sm mb-6">E-mails que receberão alertas automáticos (separe por vírgula).</p>
            <div className="max-w-xl">
              <label htmlFor="admin_emails" className="sr-only">E-mails de alerta</label>
              <input id="admin_emails" type="text" name="admin_emails" value={settings.admin_emails} onChange={handleChange} placeholder="ex: admin@empresa.com, financeiro@empresa.com" required className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none font-semibold text-blue-900" />
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
             <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">Paleta de Cores</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Fundos</h3>
                   {CAMPOS_FUNDO.map(field => (
                     <div key={field}>
                       <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">{field.replace(/_/g, ' ')}</label>
                       <div className="flex gap-3 items-center">
                          <input type="color" name={field} value={settings[field]} onChange={handleChange} aria-label={field} className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
                          <input type="text" name={field} value={settings[field]} onChange={handleChange} aria-label={field} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-mono text-sm uppercase" />
                       </div>
                     </div>
                   ))}
                </div>

                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                   <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Textos e Elementos</h3>
                   {CAMPOS_TEXTO.map(field => (
                     <div key={field}>
                       <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">{field.replace(/_/g, ' ')}</label>
                       <div className="flex gap-3 items-center">
                          <input type="color" name={field} value={settings[field]} onChange={handleChange} aria-label={field} className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
                          <input type="text" name={field} value={settings[field]} onChange={handleChange} aria-label={field} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-mono text-sm uppercase" />
                       </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
             <button type="button" onClick={handleRestoreDefaults} disabled={saving} className="text-slate-500 hover:text-red-600 font-bold text-sm uppercase py-2 px-4 rounded-lg hover:bg-red-50 transition-all">
                ↺ Restaurar Padrões
             </button>
             <button disabled={saving} type="submit" className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-10 rounded-2xl shadow-lg transition-all text-sm uppercase tracking-widest">
                {saving ? 'Processando...' : 'Salvar Parâmetros'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
