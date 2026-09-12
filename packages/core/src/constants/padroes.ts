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
 *
 * 📌 2026-09-12 — A PALETA DEFINITIVA PASSOU A SER A CINZA/PRETA (`#ADB5BD`,
 * `#000000`, `#F1F8E9`), por decisão do dono do projeto. A v10 havia
 * unificado no branco/azul (`#ffffff`, `#1d4ed8`); a escolha inverteu, e os
 * três lugares (este arquivo e os dois SQL) foram trocados juntos — a lista
 * histórica acima descreve como era ATÉ a v9, não o valor de hoje.
 */

/** As nove colunas de `global_settings`, nos valores de fábrica. */
export const PADROES_DE_FABRICA = {
  system_title: 'PLATAFORMA JAIRO O D C',
  color_header_bg: '#ADB5BD',
  color_footer_bg: '#ADB5BD',
  color_header_text: '#000000',
  color_footer_text: '#000000',
  color_bg_general: '#F1F8E9',
  color_button_border: '#000000',
  color_border_header_footer: '#000000',
  admin_emails: 'jairooc19@gmail.com',
} as const;

export type PadroesDeFabrica = typeof PADROES_DE_FABRICA;
