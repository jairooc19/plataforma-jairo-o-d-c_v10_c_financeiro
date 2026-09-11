/**
 * 🎨 SETTINGS SERVICE: O Cérebro da Identidade Visual (PJODC v4)
 * Novo Local: packages/core/src/services/platform/settingsService.ts
 * Responsabilidade: PLATAFORMA (CORE)
 * Garante que a Web e o App tenham a mesma estética.
 */

import { supabase, supabaseAdmin } from '../../lib/supabase';

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
 * VALORES PADRÃO (FALLBACK)
 * Caso a conexão com o Supabase falhe ou o registro ID 1 não exista,
 * o sistema utiliza esta paleta base para manter a integridade visual.
 */
const DEFAULT_SETTINGS: GlobalSettings = {
  id: 1,
  system_title: "PLATAFORMA JAIRO O D C",
  color_header_bg: "#ADB5BD",
  color_footer_bg: "#ADB5BD",
  color_header_text: "#000000",
  color_footer_text: "#000000",
  color_bg_general: "#F1F8E9",
  color_button_border: "#000000",
  color_border_header_footer: "#000000",
  admin_emails: "jairooc19@gmail.com"
};

export const settingsService = {
  /**
   * Busca as configurações globais (ID 1 fixo).
   * Implementa um padrão de resiliência para evitar quebras no Mobile.
   */
  async getGlobalSettings(): Promise<GlobalSettings> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle(); 

      if (error) {
        console.warn('[CORE-SETTINGS] Erro na API, usando valores padrão:', error.message);
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        console.warn('[CORE-SETTINGS] Registro ID 1 não encontrado, usando padrão.');
        return DEFAULT_SETTINGS;
      }

      return data as GlobalSettings;
    } catch (err) {
      console.error('[CORE-SETTINGS] Falha crítica na requisição:', err);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * 🚀 ATUALIZAÇÃO CENTRALIZADA
   * Grava as novas cores e títulos no banco usando o poder administrativo.
   */
  async updateGlobalSettings(body: Partial<GlobalSettings>) {
    if (!supabaseAdmin) {
      throw new Error("Acesso administrativo não configurado no Core.");
    }

    const { error } = await supabaseAdmin
      .from('global_settings')
      .update({
        system_title: body.system_title,
        color_header_bg: body.color_header_bg,
        color_footer_bg: body.color_footer_bg,
        color_header_text: body.color_header_text,
        color_footer_text: body.color_footer_text,
        color_bg_general: body.color_bg_general,
        color_button_border: body.color_button_border,
        color_border_header_footer: body.color_border_header_footer,
        admin_emails: body.admin_emails
      })
      .eq('id', 1);

    if (error) throw error;
    return { success: true };
  }
};