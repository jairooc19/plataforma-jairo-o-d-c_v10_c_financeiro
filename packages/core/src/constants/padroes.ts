/**
 * 🎨 PADRÕES DE FÁBRICA DO WHITE-LABEL — FONTE ÚNICA (PJODC v10)
 * Local: packages/core/src/constants/padroes.ts
 *
 * ⚠️ ESTE ARQUIVO EXISTE PARA MATAR UM BUG DE TRÊS CABEÇAS. Até a v9 os
 * "padrões de fábrica" estavam escritos em TRÊS lugares, e dois deles não
 * batiam:
 *
 *   1. `supabase/criar-bd/plataforma_02_seed.sql`  → cinza  (#ADB5BD, #F1F8E9…)
 *   2. `admin-web/.../dashboard/settings/page.tsx` → branco (#ffffff, #1d4ed8…)
 *   3. `core/.../settingsService.ts` (DEFAULT_SETTINGS) → igual ao 2
 *
 * Resultado: apertar "Restaurar Padrões" na web e rodar o seed no banco davam
 * resultados DIFERENTES, e ninguém sabia qual era o certo. Agora o valor mora
 * aqui, o SQL repete os mesmos números (com o comentário dizendo por quê), e as
 * telas importam daqui.
 *
 * 🎯 QUANDO MUDAR A PALETA PADRÃO: troque neste arquivo E nos dois arquivos SQL
 * de `supabase/criar-bd/`. São os únicos dois lugares — o SQL não consegue
 * importar TypeScript, e é por isso que a duplicação sobrevive ali.
 */

/** As nove colunas de `global_settings`, nos valores de fábrica. */
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

export type PadroesDeFabrica = typeof PADROES_DE_FABRICA;
