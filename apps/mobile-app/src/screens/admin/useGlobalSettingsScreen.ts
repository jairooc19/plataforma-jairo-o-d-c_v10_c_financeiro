import { useCallback, useEffect, useState } from 'react';
import { settingsService, adminApiService, type GlobalSettings } from '@jairo/core';
import { errorService } from '@/services/errorService';

/**
 * 🎨 PADRÕES DE FÁBRICA — os mesmos sete valores da web.
 *
 * ⚠️ ESTA LISTA É UMA SEGUNDA CÓPIA, e é preciso saber disso. A primeira está em
 * `apps/admin-web/src/app/dashboard/settings/page.tsx` (`FACTORY_DEFAULTS`), e
 * uma terceira, DIFERENTE, está no `DEFAULT_SETTINGS` do `settingsService` do
 * Core — aquela é a paleta de emergência de quando o banco não responde, não o
 * padrão de fábrica, e por isso os valores não batem. Unificá-las é uma mudança
 * de contrato do Core que atinge a web também; ficou fora do escopo desta
 * entrega. Ao mexer numa, mexa nas duas de propósito.
 */
export const PADROES_DE_FABRICA = {
  system_title: 'PLATAFORMA JAIRO O D C',
  color_header_bg: '#ffffff',
  color_footer_bg: '#ffffff',
  color_header_text: '#1d4ed8',
  color_footer_text: '#64748b',
  color_bg_general: '#f8fafc',
  color_button_border: '#e2e8f0',
  color_border_header_footer: '#e2e8f0',
  admin_emails: 'jairooc19@gmail.com',
} as const;

/** As sete colunas de cor, derivadas do tipo — nunca uma lista solta de strings. */
export type CampoCor = Exclude<keyof GlobalSettings, 'id' | 'system_title' | 'admin_emails'>;

export const CAMPOS_FUNDO: CampoCor[] = ['color_header_bg', 'color_footer_bg', 'color_bg_general'];

export const CAMPOS_TEXTO: CampoCor[] = [
  'color_header_text',
  'color_footer_text',
  'color_border_header_footer',
  'color_button_border',
];

/** Rótulos legíveis. O nome da coluna não é texto de interface. */
export const ROTULO_COR: Record<CampoCor, string> = {
  color_header_bg: 'Fundo do cabeçalho',
  color_footer_bg: 'Fundo do rodapé',
  color_bg_general: 'Fundo geral',
  color_header_text: 'Texto do cabeçalho',
  color_footer_text: 'Texto do rodapé',
  color_border_header_footer: 'Borda de cabeçalho e rodapé',
  color_button_border: 'Borda dos botões',
};

/**
 * 🎨 CÉREBRO DOS AJUSTES GLOBAIS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/useGlobalSettingsScreen.ts
 *
 * Espelho de `apps/admin-web/src/app/dashboard/settings/page.tsx`, com a mesma
 * divisão de trabalho que a web faz sem dizer:
 *
 *   LEITURA  → `settingsService.getGlobalSettings()`, cliente ANON. `global_settings`
 *              é legível por qualquer um; é o que o boot do app já faz.
 *   GRAVAÇÃO → `adminApiService.salvarAjustesGlobais()`, que vai por HTTP à
 *              `/api/settings` do admin-web. Exige a SERVICE ROLE, e a service
 *              role não pode existir no aparelho.
 *
 * ⚠️ A GRAVAÇÃO DEPENDE DO ADMIN-WEB ESTAR NO AR e de `EXPO_PUBLIC_API_URL`
 * apontar para ele. Em desenvolvimento isso NÃO pode ser `localhost` — no
 * aparelho, `localhost` é o próprio aparelho. Ver `lib/apiBaseUrl.ts` no Core,
 * que recusa o valor com a instrução de correção em vez de deixar a chamada
 * falhar com "Network request failed".
 */
export function useGlobalSettingsScreen() {
  const [ajustes, setAjustes] = useState<GlobalSettings | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      try {
        const dados = await settingsService.getGlobalSettings();
        if (!cancelado) setAjustes(dados);
      } catch (e) {
        errorService.registrar('AJUSTES', e);
        if (!cancelado) setErro(errorService.mensagem(e));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, []);

  const alterarCampo = useCallback((campo: keyof GlobalSettings, valor: string) => {
    setAjustes((anterior) => (anterior ? { ...anterior, [campo]: valor } : anterior));
    setSucesso(null);
  }, []);

  const salvar = useCallback(async () => {
    if (!ajustes) return;

    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      await adminApiService.salvarAjustesGlobais(ajustes);
      setSucesso('Configurações globais atualizadas.');
    } catch (e) {
      errorService.registrar('AJUSTES', e);
      setErro(errorService.mensagem(e));
    } finally {
      setSalvando(false);
    }
  }, [ajustes]);

  /**
   * ↺ Restaura e JÁ GRAVA, como na web. Restaurar só na tela deixaria o usuário
   * achando que salvou — o botão diz "restaurar", não "pré-visualizar".
   */
  const restaurarPadroes = useCallback(async () => {
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      await adminApiService.salvarAjustesGlobais(PADROES_DE_FABRICA);
      setAjustes({ id: 1, ...PADROES_DE_FABRICA });
      setSucesso('Padrões de fábrica restaurados.');
    } catch (e) {
      errorService.registrar('AJUSTES', e);
      setErro(errorService.mensagem(e));
    } finally {
      setSalvando(false);
    }
  }, []);

  return { ajustes, carregando, salvando, erro, sucesso, alterarCampo, salvar, restaurarPadroes };
}
