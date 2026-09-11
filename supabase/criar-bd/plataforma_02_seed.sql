-- ===========================================================================
-- 🌱 PLATAFORMA JAIRO O D C v10 - INITIAL DATA SEED
-- Responsabilidade: Injeção de dados mínimos obrigatórios (Fase 3: Hidratação)
-- Versão: v10 (Fonte Única de Dados Iniciais / SSOT Real)
-- REVISÃO: Evolução para Idempotência Ativa via DO UPDATE SET
-- ===========================================================================

-- 1. CONFIGURAÇÕES GLOBAIS DEFAULT (White Label)
-- Garante que o registro id = 1 exista para que a interface Web e Mobile
-- consiga ler o título e a paleta de cores padrão imediatamente após o reset.
-- Utiliza DO UPDATE SET para permitir a atualização dinâmica de parâmetros visuais
-- e administrativos sem a necessidade de executar resets destrutivos na base.
INSERT INTO public.global_settings (
    id, 
    system_title, 
    color_header_bg, 
    color_footer_bg, 
    color_header_text, 
    color_footer_text, 
    color_bg_general, 
    color_button_border, 
    color_border_header_footer, 
    admin_emails
) VALUES (
    1, 
    'PLATAFORMA JAIRO O D C', 
    '#ADB5BD', 
    '#ADB5BD', 
    '#000000', 
    '#000000', 
    '#F1F8E9', 
    '#000000', 
    '#000000', 
    'jairooc19@gmail.com'
) 
ON CONFLICT (id) DO UPDATE SET
    system_title = EXCLUDED.system_title,
    color_header_bg = EXCLUDED.color_header_bg,
    color_footer_bg = EXCLUDED.color_footer_bg,
    color_header_text = EXCLUDED.color_header_text,
    color_footer_text = EXCLUDED.color_footer_text,
    color_bg_general = EXCLUDED.color_bg_general,
    color_button_border = EXCLUDED.color_button_border,
    color_border_header_footer = EXCLUDED.color_border_header_footer,
    admin_emails = EXCLUDED.admin_emails,
    updated_at = timezone('utc'::text, (now() AT TIME ZONE 'America/Sao_Paulo'::text));