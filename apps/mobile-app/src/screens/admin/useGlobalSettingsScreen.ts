import { useCallback, useEffect, useState } from 'react';
import { settingsService, PADROES_DE_FABRICA, type GlobalSettings } from '@jairo/core';
import { errorService } from '@/services/errorService';

/**
 * 🎨 PADRÕES DE FÁBRICA — AGORA IMPORTADOS, NÃO COPIADOS (PJODC v10)
 *
 * ⚠️ ESTA LISTA ERA UMA SEGUNDA CÓPIA. Havia três no repositório: esta, a do
 * `FACTORY_DEFAULTS` da web e a do `DEFAULT_SETTINGS` do Core — e a do SQL, com
 * valores DIFERENTES dos outros dois. Restaurar o padrão pela web e rodar o seed
 * davam resultados distintos. A v10 unificou tudo em
 * `packages/core/src/constants/padroes.ts`; aqui só reexportamos para não
 * quebrar quem já importava daqui.
 */
export const PADROES_DE_FABRICA_MOBILE = PADROES_DE_FABRICA;

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
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 * A gravação ia por HTTP para `POST /api/settings` — uma rota com a chave mestra
 * e SEM autenticação: quem soubesse o endereço trocava o título e as cores do
 * sistema de qualquer lugar do mundo. Agora é a função
 * `admin_update_global_settings`, que confere `is_superuser()` dentro do banco.
 *
 *   LEITURA  → `settingsService.getGlobalSettings()`, cliente público. A linha
 *              do white-label é legível por todos (é o que a guarita desenha
 *              antes do login).
 *   GRAVAÇÃO → `settingsService.updateGlobalSettings()`, que chama a função
 *              administrativa.
 *
 * ⚠️ O QUE SE VÊ AQUI NÃO REPINTA O APP NA HORA. A paleta é lida no boot pelo
 * `app/_layout.tsx`; a mudança aparece na próxima abertura. A web tem o mesmo
 * comportamento.
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
      await settingsService.updateGlobalSettings(ajustes);
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
      const padroes: GlobalSettings = { id: 1, ...PADROES_DE_FABRICA };
      await settingsService.updateGlobalSettings(padroes);
      setAjustes(padroes);
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
