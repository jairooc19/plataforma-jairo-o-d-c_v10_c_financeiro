-- ===========================================================================
-- 🌱 PLATAFORMA JAIRO O D C v10 - INITIAL DATA SEED
-- Responsabilidade: Injeção de dados mínimos obrigatórios (Fase 3: Hidratação)
-- Versão: v10 (Fonte Única de Dados Iniciais / SSOT Real)
-- ===========================================================================
--
-- ⚠️ ESTES SÃO OS PADRÕES DE FÁBRICA, E AGORA SÃO OS MESMOS EM TODO LUGAR.
-- Até a v9 existiam TRÊS listas de cores diferentes: esta (cinza `#ADB5BD`), a
-- do `FACTORY_DEFAULTS` da web e a do `DEFAULT_SETTINGS` do Core. Restaurar o
-- padrão pela web e rodar este arquivo davam resultados DIFERENTES. A v10
-- unificou: o Core exporta `PADROES_DE_FABRICA`, a web e o mobile o consomem, e
-- os valores abaixo são exatamente os mesmos.
--
-- ⚠️ `updated_at` NÃO É MAIS CALCULADO À MÃO. A expressão anterior
-- (`timezone('utc', now() AT TIME ZONE 'America/Sao_Paulo')`) convertia o fuso
-- duas vezes e gravava 3 horas a menos. Hoje quem carimba é o gatilho
-- `set_updated_at_settings`, com `now()`.
-- ===========================================================================

-- 1. CONFIGURAÇÕES GLOBAIS DEFAULT (White Label)
-- Garante que o registro id = 1 exista para que a interface Web e Mobile
-- consiga ler o título e a paleta padrão imediatamente após o reset.
-- `DO UPDATE SET` permite reaplicar a identidade visual sem reset destrutivo.
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
    admin_emails = EXCLUDED.admin_emails;


-- ===========================================================================
-- 2. 🔧 O USUÁRIO DO DESENVOLVEDOR — PASSO MANUAL OBRIGATÓRIO
-- ===========================================================================
--
-- A v10 APAGOU a credencial fixa `admin@pjodc.ia` / `1qaz` que vivia dentro do
-- código (e, portanto, dentro do JavaScript do site e do APK do aplicativo).
-- O Desenvolvedor agora é um usuário REAL do Supabase com `is_superuser = true`.
--
-- ⚠️ NÃO DÁ PARA CRIAR ESSE USUÁRIO AQUI. A senha precisa ser cifrada pelo
-- serviço de autenticação (GoTrue); um INSERT à mão em `auth.users` produz uma
-- conta que não faz login. Por isso são dois passos:
--
--   PASSO 1 — No painel do Supabase:
--     Authentication > Users > "Add user" > "Create new user"
--       E-mail: o seu e-mail de administração
--       Senha:  uma senha forte (mínimo 6 caracteres; use bem mais)
--       Marque "Auto Confirm User"
--
--   PASSO 2 — Aqui no SQL Editor, troque o e-mail e execute:
--
--       update public.users
--          set is_superuser      = true,
--              is_active         = true,
--              profile_completed = true,
--              full_name         = 'DESENVOLVEDOR',
--              planet            = 'TERRA',
--              country           = 'BRASIL',
--              state             = 'SP',
--              city              = 'SAO PAULO'
--        where email = 'coloque-o-email-aqui';
--
--   CONFERÊNCIA:
--       select email, is_superuser, profile_completed from public.users;
--
-- ⚠️ SEM O PASSO 2, O PAINEL DE ENGENHARIA NÃO ABRE PARA NINGUÉM — e é assim
-- que tem de ser: a porta de serviço passou a exigir uma chave que só existe no
-- banco, e não uma senha escrita no código que todo mundo baixa junto com o app.
-- ===========================================================================
