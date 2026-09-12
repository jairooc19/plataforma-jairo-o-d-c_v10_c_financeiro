/**
 * 🎨 SETTINGS SERVICE: O Cérebro da Identidade Visual (PJODC v10)
 * Local: packages/core/src/services/platform/settingsService.ts
 *
 * Garante que a Web e o App mostrem o mesmo título e a mesma paleta.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  • A GRAVAÇÃO deixou de usar a chave mestra e de passar por uma rota HTTP
 *    aberta (`POST /api/settings`, que qualquer pessoa podia chamar para trocar
 *    o título e as cores do sistema). Agora é a função `admin_update_global_settings`,
 *    que confere `is_superuser()` dentro do banco.
 *  • A PALETA DE EMERGÊNCIA deixou de ser uma terceira lista de cores inventada
 *    aqui: ela É o `PADROES_DE_FABRICA` do Core, o mesmo que o SQL usa.
 *
 * 📖 A LEITURA CONTINUA PÚBLICA, e é de propósito: título e cores são
 * desenhados ANTES do login, na tela da guarita.
 */

import { supabase } from '../../lib/supabase';
import { PADROES_DE_FABRICA } from '../../constants/padroes';

export interface GlobalSettings {
  id: number;
  system_title: string;
  color_header_bg: string;
  color_footer_bg: string;
  color_header_text: string;
  color_footer_text: string;
  color_bg_general: string;
  color_button_border: string;
  color_border_header_footer: string;
  admin_emails: string;
}

/**
 * Paleta usada quando o banco não responde. É a MESMA de fábrica — se fosse
 * outra, uma queda de rede mudaria a cara do sistema, e ninguém entenderia por
 * quê (foi o que acontecia até a v9).
 */
const AJUSTES_DE_EMERGENCIA: GlobalSettings = { id: 1, ...PADROES_DE_FABRICA };

export const settingsService = {
  /**
   * Busca as configurações globais (linha fixa `id = 1`).
   * Nunca lança: a interface precisa de uma cor para desenhar, mesmo offline.
   */
  async getGlobalSettings(): Promise<GlobalSettings> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[CORE-SETTINGS] Erro na API, usando os padrões:', error.message);
        return AJUSTES_DE_EMERGENCIA;
      }

      if (!data) {
        console.warn('[CORE-SETTINGS] Linha id = 1 não encontrada, usando os padrões.');
        return AJUSTES_DE_EMERGENCIA;
      }

      return data as GlobalSettings;
    } catch (err) {
      console.error('[CORE-SETTINGS] Falha crítica na requisição:', err);
      return AJUSTES_DE_EMERGENCIA;
    }
  },

  /**
   * 🚀 Grava título, cores e e-mails de alerta.
   *
   * ⚠️ SÓ O DESENVOLVEDOR CONSEGUE. Quem recusa é o banco, não a tela: a função
   * `admin_update_global_settings` confere `is_superuser()`. Esconder o botão
   * nunca foi controle de acesso.
   */
  async updateGlobalSettings(ajustes: Partial<GlobalSettings>): Promise<{ success: true }> {
    const { error } = await supabase.rpc('admin_update_global_settings', {
      p_ajustes: ajustes,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  },

  /** Os valores de fábrica, para o botão "Restaurar Padrões". */
  padroesDeFabrica(): Omit<GlobalSettings, 'id'> {
    return { ...PADROES_DE_FABRICA };
  },
};
