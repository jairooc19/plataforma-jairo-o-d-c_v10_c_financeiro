-- ===========================================================================
-- PLATAFORMA JAIRO O D C v10 - CORE DATABASE SCHEMA (CONSOLIDATED)
-- Responsabilidade: Schema completo multi-tenant, segurança RLS, autenticação
-- Versão: v10 (Novo banco do zero - Consolidação de migrations)
-- ===========================================================================
--
-- ESTE ARQUIVO SUBSTITUI as 7 migrations core_platform_00..06.
-- Ele assume um banco NOVO, criado do zero: não há legado a preservar e não há
-- política antiga para derrubar. Por isso cada objeto é criado uma única vez,
-- já na forma final e na ordem correta de dependência.
--
-- ORDEM DAS SEÇÕES (não reordenar):
--   1. Extensões
--   2. Tabelas
--   3. Habilitação de RLS
--   4. Seed de configuração
--   5. Funções          <- precisam existir ANTES das policies que as chamam
--   6. Policies
--   7. Triggers         <- BEFORE antes de AFTER
--   8. Privilégios (GRANT/REVOKE)  <- a segunda tranca, ao lado da RLS
--   9. Realtime
--
-- Modo de uso: colar inteiro no SQL Editor do Supabase e executar de uma vez.
-- Exige papel com privilégio sobre o schema `auth` (o papel `postgres` do SQL
-- Editor e o Supabase CLI local atendem).
--
-- ===========================================================================
-- ⚠️ O QUE MUDOU NA v10 (degrau 3 — correções de segurança e integridade)
-- ===========================================================================
--
-- 🔐 SEGURANÇA
--   S1. A policy "Acesso administrativo para triagem" (`FOR SELECT USING (true)`)
--       FOI REMOVIDA. Ela deixava QUALQUER pessoa — inclusive visitante anônimo
--       com a chave pública do app — ler nome, e-mail, estado e cidade de todos
--       os usuários. Quem decide agora é `can_view_user_profile()`: você mesmo,
--       o dono da empresa em que você é membro, os seus dependentes, ou o
--       Desenvolvedor.
--   S2. O UPDATE do próprio perfil deixou de alcançar TODAS as colunas. Sem isso,
--       um usuário logado gravava `is_superuser = true` na própria linha e virava
--       Desenvolvedor. Agora o privilégio é POR COLUNA (seção 8).
--   S3. A policy "Dono gerencia sua empresa" era `FOR ALL USING (auth.uid() =
--       owner_id)`. No PostgreSQL, uma policy ALL sem WITH CHECK usa o USING
--       também para aprovar linhas NOVAS — ou seja, qualquer pessoa autenticada
--       podia INSERIR uma empresa declarando-se dona dela e pular a triagem.
--       Agora o cliente não tem INSERT em `tenants` (seção 8): empresa só nasce
--       pela função `admin_sync_user_tenants`, que exige Desenvolvedor.
--   S4/S5. As rotas HTTP sem autenticação e a credencial fixa do Desenvolvedor
--       deixaram de existir. O Desenvolvedor virou um usuário REAL do Supabase
--       com `is_superuser = true`, e toda operação administrativa passou a ser
--       uma função `admin_*` que confere esse sinalizador com `auth.uid()`.
--   S6. Toda função tem `search_path` fixo, e o `EXECUTE` foi revogado de
--       `public`/`anon`: só quem precisa recebe (seção 8).
--   S9. `handle_new_user` NÃO ACEITA MAIS `role` vindo do cadastro. O valor era
--       lido de `raw_user_meta_data`, que é escrito pelo próprio navegador: dava
--       para nascer com `role = 'active'`. Agora todo mundo nasce `pending`.
--
-- 🕐 INTEGRIDADE
--   C1. Os `DEFAULT` de data eram `timezone('utc', now() AT TIME ZONE
--       'America/Sao_Paulo')`, que converte o fuso DUAS vezes e grava 3 horas a
--       menos. Agora é `now()`, que guarda o instante exato; a conversão para o
--       horário de Brasília acontece na exibição.
--   C2. Criar/desativar empresas e ajustar o papel do usuário virou UMA função
--       transacional (`admin_sync_user_tenants`): ou tudo acontece, ou nada.
--   C3. `tenant_members.allowed_modules` virou `text[]`, como o CLAUDE.md sempre
--       exigiu e como os tipos do TypeScript já declaravam.
--   C5. `tenant_members` entra na publicação `supabase_realtime` (seção 9), sem
--       a qual o aviso de "permissões alteradas" do app nunca dispara.
--
-- 🧾 AUDITORIA (bônus B4)
--   Nova tabela `audit_log` + gatilhos nas quatro tabelas do CORE. Em sistema
--   financeiro, "quem mudou este valor, e quando?" é pergunta certa de aparecer.
-- ===========================================================================


-- ===========================================================================
-- 1. EXTENSÕES
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS unaccent;   -- buscas sem acento


-- ===========================================================================
-- 2. TABELAS
-- ===========================================================================

-- 2.1 UTILIZADORES PÚBLICOS (Perfil) — espelho de auth.users
--
-- ⚠️ `created_at` USA `now()`, E ISSO É CORREÇÃO, NÃO ESTILO. Até a v9 o padrão
-- era `timezone('utc', now() AT TIME ZONE 'America/Sao_Paulo')`: o primeiro
-- passo converte o instante para a hora de São Paulo e JOGA FORA o fuso; o
-- segundo diz "considere que isto é UTC". Resultado: toda linha nascia com 3
-- horas a menos. `timestamptz` guarda o INSTANTE, não o texto do relógio —
-- quem escolhe o fuso de exibição é quem lê.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    -- 'pending' (aguardando triagem) ou 'active' (tem empresa ativa).
    role text NOT NULL DEFAULT 'pending',
    -- 🔐 v10: é o Desenvolvedor? Substitui a credencial fixa no código.
    -- Só a chave de serviço (ou o SQL Editor) escreve aqui — ver seção 8.
    is_superuser boolean NOT NULL DEFAULT false,
    is_client_owner boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    planet text NOT NULL DEFAULT 'TERRA',
    country text NOT NULL DEFAULT 'BRASIL',
    state text,
    city text,
    -- Como a conta nasceu: 'email' (senha) ou 'google' (OAuth).
    auth_provider text NOT NULL DEFAULT 'email',
    -- O cadastro chegou ao fim? Nasce `true` no cadastro com senha (o formulário
    -- já pediu tudo) e `false` no Google, que só entrega e-mail e nome.
    profile_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 CONFIGURAÇÕES GLOBAIS (White Label) — linha única, id = 1
--
-- ⚠️ OS PADRÕES AQUI SÃO A FONTE ÚNICA DA PALETA DE FÁBRICA. Até a v9 existiam
-- TRÊS listas diferentes: esta, a do `FACTORY_DEFAULTS` da web e a do
-- `DEFAULT_SETTINGS` do Core — as duas últimas iguais entre si e diferentes
-- desta. Agora as três apontam para os mesmos valores (o Core exporta
-- `PADROES_DE_FABRICA`, e os apps o consomem).
CREATE TABLE IF NOT EXISTS public.global_settings (
    id integer PRIMARY KEY CHECK (id = 1), -- Garante linha única
    system_title text NOT NULL DEFAULT 'PLATAFORMA JAIRO O D C',
    color_header_bg text NOT NULL DEFAULT '#ADB5BD',
    color_footer_bg text NOT NULL DEFAULT '#ADB5BD',
    color_header_text text NOT NULL DEFAULT '#000000',
    color_footer_text text NOT NULL DEFAULT '#000000',
    color_bg_general text NOT NULL DEFAULT '#F1F8E9',
    color_button_border text NOT NULL DEFAULT '#000000',
    color_border_header_footer text NOT NULL DEFAULT '#000000',
    admin_emails text NOT NULL DEFAULT 'jairooc19@gmail.com',
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 EMPRESAS (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name text NOT NULL,
    slug text UNIQUE NOT NULL,
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.4 VÍNCULOS (Membros de cada empresa)
--
-- ⚠️ `allowed_modules` É `text[]`, NÃO `text`. Até a v9 a coluna era texto e o
-- TypeScript dos dois apps declarava `string[]`: no dia em que o banco guardasse
-- 'financeiro', o app contaria 10 módulos (as letras) e o `.map()` quebraria a
-- tela, porque texto não tem `.map`. É proibição explícita do CLAUDE.md.
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('OWNER', 'DEPENDENT', 'VIEWER')),
    is_active boolean NOT NULL DEFAULT true,
    allowed_modules text[] NOT NULL DEFAULT '{}'::text[],
    module_configs jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- 2.5 TRILHA DE AUDITORIA (bônus B4)
--
-- 🧾 POR QUE EXISTE: num sistema financeiro, saber QUEM mudou um valor é tão
-- importante quanto o valor. A tabela guarda o retrato de antes e o de depois,
-- em JSON, para qualquer alteração nas tabelas do CORE.
--
-- ⚠️ NINGUÉM ESCREVE AQUI PELA API. Quem grava é o gatilho da seção 7, que roda
-- como dono da tabela; o cliente não recebe INSERT (seção 8). Uma trilha que o
-- auditado pode reescrever não é trilha.
CREATE TABLE IF NOT EXISTS public.audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tabela text NOT NULL,
    registro_id text,
    operacao text NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
    -- Quem fez. `null` quando a mudança veio do servidor (chave de serviço)
    -- ou de um gatilho do próprio banco.
    ator_id uuid,
    dados_antes jsonb,
    dados_depois jsonb,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tabela_registro
    ON public.audit_log (tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_criado_em
    ON public.audit_log (criado_em DESC);

-- Índices de apoio às consultas de triagem e de vínculos.
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants (owner_id);


-- ===========================================================================
-- 3. HABILITAÇÃO DE ROW LEVEL SECURITY
-- ===========================================================================

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log       ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- 4. SEED INICIAL DE CONFIGURAÇÃO
-- ===========================================================================

INSERT INTO public.global_settings (
    id, system_title, color_header_bg, color_footer_bg, color_header_text,
    color_footer_text, color_bg_general, color_button_border, color_border_header_footer, admin_emails
) VALUES (
    1, 'PLATAFORMA JAIRO O D C', '#ADB5BD', '#ADB5BD', '#000000',
    '#000000', '#F1F8E9', '#000000', '#000000', 'jairooc19@gmail.com'
) ON CONFLICT (id) DO NOTHING;


-- ===========================================================================
-- 5. FUNÇÕES
-- Criadas ANTES das policies (seção 6) e dos triggers (seção 7), que as chamam.
--
-- ⚠️ TODAS TÊM `search_path` FIXO. A documentação do Supabase é explícita: ao
-- usar `security definer`, você PRECISA definir o `search_path` — senão quem
-- chama pode apontar `public` para um schema próprio e fazer a função rodar
-- código dele com o poder do dono.
-- ===========================================================================

-- 5.1 AUTO-CONFIRMAÇÃO DE E-MAIL
-- Libera o login imediatamente após o cadastro, sem depender da chave
-- "Confirm email" do painel do Supabase.
--
-- BEFORE INSERT (e não AFTER): assim o próprio GoTrue já enxerga a conta como
-- confirmada dentro da mesma transação do cadastro.
-- A coluna `confirmed_at` NÃO é tocada — no Supabase ela é GERADA a partir de
-- `email_confirmed_at`/`phone_confirmed_at`, e escrever nela quebra o INSERT.
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- 5.2 SINCRONIZAÇÃO auth.users -> public.users (com suporte a Google OAuth)
--
-- 🔐 DETECÇÃO DO PROVEDOR: usa `raw_app_meta_data->>'provider'`, que o GoTrue
-- já grava na PRÓPRIA linha sendo inserida. NÃO consultar `auth.identities`
-- aqui: a linha de identidade só nasce DEPOIS deste AFTER INSERT.
--
-- ⚠️ v10 — O `role` NÃO VEM MAIS DO CADASTRO. Até a v9 era
-- `COALESCE(new.raw_user_meta_data->>'role', 'pending')`, e `raw_user_meta_data`
-- é preenchido pelo NAVEGADOR na chamada de cadastro: bastava mandar
-- `role: 'active'` para nascer já aprovado, pulando a triagem. Quem promove é o
-- Desenvolvedor, pela função `admin_sync_user_tenants`.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_provider text;
  v_profile_completed boolean;
BEGIN
  v_auth_provider := NULLIF(new.raw_app_meta_data->>'provider', '');

  IF v_auth_provider IS NULL THEN
    SELECT i.provider INTO v_auth_provider
      FROM auth.identities i
     WHERE i.user_id = new.id
     ORDER BY i.created_at
     LIMIT 1;
  END IF;

  v_auth_provider := COALESCE(v_auth_provider, 'email');

  -- Cadastro com senha passou pelo formulário completo; Google, não.
  v_profile_completed := (v_auth_provider = 'email');

  INSERT INTO public.users (
    id, email, full_name, role, planet, country, state, city,
    is_active, auth_provider, profile_completed
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''),
      NULLIF(new.raw_user_meta_data->>'name', '')
    ),
    'pending',
    COALESCE(NULLIF(new.raw_user_meta_data->>'planet', ''), 'TERRA'),
    COALESCE(NULLIF(new.raw_user_meta_data->>'country', ''), 'BRASIL'),
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    true,
    v_auth_provider,
    v_profile_completed
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- 5.3 VERIFICAÇÃO DE MEMBRO DO TENANT
CREATE OR REPLACE FUNCTION public.check_is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- 5.4 VERIFICAÇÃO DE DONO DO TENANT
CREATE OR REPLACE FUNCTION public.check_is_tenant_owner(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = p_tenant_id
      AND owner_id = auth.uid()
      AND is_active = true
  );
$$;

-- 5.5 É O DESENVOLVEDOR? (v10)
--
-- 🔧 SUBSTITUI A CREDENCIAL FIXA NO CÓDIGO. Até a v9 o Painel de Engenharia
-- abria com `admin@pjodc.ia` / `1qaz` comparados dentro do próprio aplicativo, e
-- o "crachá" ficava no `sessionStorage` do navegador — gravável pelo DevTools.
-- Agora o Desenvolvedor é um usuário REAL do Supabase com `is_superuser = true`,
-- e quem confere é o banco, com a sessão na mão.
--
-- ⚠️ A COLUNA `is_superuser` NÃO PODE SER ESCRITA PELO CLIENTE. Ver seção 8: o
-- `authenticated` recebe UPDATE só nas cinco colunas do perfil.
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND is_superuser = true
      AND is_active = true
  );
$$;

-- 5.6 QUEM PODE VER O PERFIL DE QUEM (v10 — correção S1)
--
-- Substitui a policy `USING (true)`. Você enxerga um perfil quando:
--   a) é o seu;
--   b) a pessoa é dona de uma empresa onde você é membro ativo (o app mostra o
--      e-mail do "Gestor" na triagem e no seletor de empresas);
--   c) a pessoa é membro de uma empresa sua (a tela "Gerenciar Equipe");
--   d) você é o Desenvolvedor.
CREATE OR REPLACE FUNCTION public.can_view_user_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      p_user_id = auth.uid()
      OR public.is_superuser()
      OR EXISTS (
        SELECT 1
          FROM public.tenants t
          JOIN public.tenant_members m ON m.tenant_id = t.id
         WHERE t.owner_id = p_user_id
           AND m.user_id = auth.uid()
           AND m.is_active = true
      )
      OR EXISTS (
        SELECT 1
          FROM public.tenants t
          JOIN public.tenant_members m ON m.tenant_id = t.id
         WHERE t.owner_id = auth.uid()
           AND m.user_id = p_user_id
      )
    );
$$;

-- 5.7 BUSCA DE UTILIZADOR PARA CONVITE (v10 — correção S6)
--
-- ⚠️ AGORA EXIGE A EMPRESA, E QUE VOCÊ SEJA O DONO DELA. Até a v9 a função
-- aceitava qualquer e-mail vindo de qualquer pessoa autenticada — e como o
-- `EXECUTE` das funções é concedido a PUBLIC por padrão no PostgreSQL, ela
-- também respondia a visitante anônimo. Era um verificador de "esse e-mail tem
-- conta aqui?" aberto na internet.
CREATE OR REPLACE FUNCTION public.get_user_by_email_for_invite(
  p_email text,
  p_tenant_id uuid
)
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.check_is_tenant_owner(p_tenant_id) THEN
    RAISE EXCEPTION 'Apenas o dono da empresa pode buscar colaboradores.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT u.id, u.full_name, u.email
      FROM public.users u
     WHERE lower(u.email) = lower(btrim(p_email))
       AND u.is_active = true;
END;
$$;

-- 5.8 REDE DE SEGURANÇA DO PERFIL GOOGLE (v10 — correção S6)
--
-- ⚠️ AGORA SÓ CRIA O PRÓPRIO PERFIL. A versão da v9 agia sobre o id recebido por
-- parâmetro sem compará-lo com `auth.uid()` — exatamente o que o CLAUDE.md
-- proíbe para função `SECURITY DEFINER`.
CREATE OR REPLACE FUNCTION public.ensure_google_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existe boolean;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Só é possível criar o próprio perfil.' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_existe;

  IF NOT v_existe THEN
    INSERT INTO public.users (
      id, email, full_name, role, planet, country, is_active, auth_provider
    )
    VALUES (
      p_user_id,
      p_email,
      COALESCE(NULLIF(btrim(p_full_name), ''), p_email),
      'pending',
      'TERRA',
      'BRASIL',
      true,
      'google'
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_provider = 'google',
      is_active     = true;
  END IF;

  RETURN json_build_object('success', true, 'user_id', p_user_id, 'created', NOT v_existe);
END;
$$;

-- 5.9 O CADASTRO ESTÁ COMPLETO?
--
-- Confere os campos, e não apenas a bandeira `profile_completed`: a bandeira
-- sozinha mentiria se alguém a marcasse antes de preencher os dados, ou se um
-- campo fosse esvaziado depois.
--
-- ⚠️ v10: responde sobre VOCÊ (ou sobre qualquer um, se você for o
-- Desenvolvedor). Antes respondia sobre qualquer id, para qualquer um.
CREATE OR REPLACE FUNCTION public.check_profile_completed(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR (p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_superuser()) THEN
    RAISE EXCEPTION 'Consulta permitida apenas sobre o próprio cadastro.'
      USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
      AND profile_completed = true
      AND full_name IS NOT NULL AND btrim(full_name) <> ''
      AND planet    IS NOT NULL AND btrim(planet)    <> ''
      AND country   IS NOT NULL AND btrim(country)   <> ''
      AND state     IS NOT NULL AND btrim(state)     <> ''
      AND city      IS NOT NULL AND btrim(city)      <> ''
  );
END;
$$;

-- 5.10 APAGAR A PRÓPRIA CONTA, EM DEFINITIVO
--
-- 🛡️ TRAVA DE IDENTIDADE (LEIA ANTES DE MEXER): a função é SECURITY DEFINER e
-- recebe o id por parâmetro. Sem a comparação com auth.uid(), QUALQUER pessoa
-- autenticada apagaria a conta de QUALQUER outra só trocando o uuid na chamada —
-- o RLS não protege nada aqui, porque SECURITY DEFINER passa por cima dele.
--
-- 🏢 PROTEÇÃO DE EMPRESA: dono de empresa não se apaga. A empresa e os vínculos
-- dos dependentes sobreviveriam órfãos.
CREATE OR REPLACE FUNCTION public.delete_user_permanently(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant_count integer;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Só é possível apagar a própria conta.'
    );
  END IF;

  SELECT COUNT(*) INTO v_tenant_count
    FROM public.tenants
   WHERE owner_id = p_user_id;

  IF v_tenant_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você é dono de empresa. Transfira a propriedade antes de apagar a conta.'
    );
  END IF;

  DELETE FROM public.tenant_members WHERE user_id = p_user_id;
  DELETE FROM public.users          WHERE id      = p_user_id;
  DELETE FROM auth.users            WHERE id      = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Conta apagada em definitivo.');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5.11 a 5.16 — OPERAÇÕES DO PAINEL DE ENGENHARIA (v10)
--
-- 🔐 TODAS EXIGEM `is_superuser()`. Elas substituem as rotas `/api/admin/*`,
-- `/api/users/*`, `/api/tenants` e `/api/settings` (POST), que rodavam com a
-- CHAVE MESTRA e NÃO PEDIAM IDENTIFICAÇÃO NENHUMA: quem soubesse o endereço
-- criava empresas e trocava as cores do sistema. Agora quem confere é o banco,
-- com a sessão do Desenvolvedor, e a chave mestra não é mais necessária em lugar
-- nenhum da aplicação.
-- ---------------------------------------------------------------------------

-- 5.11 Lista os usuários da triagem.
--
-- ⚠️ O DESENVOLVEDOR NÃO ENTRA NA PRÓPRIA FILA. Ele nasce como qualquer usuário
-- (`role = 'pending'`, porque o gatilho ignora o papel enviado pelo cliente) e o
-- passo manual do seed só marca `is_superuser`. Sem o filtro abaixo, ele aparecia
-- na "Triagem de Usuários" com o botão de promover ao lado — e promovê-lo criaria
-- uma empresa em nome da conta de serviço, com `is_client_owner = true`. Filtrar
-- aqui, e não na tela, é o que impede o erro nas DUAS pontas (web e aplicativo),
-- que consomem esta mesma função.
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  is_active boolean,
  is_client_owner boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso restrito ao Desenvolvedor.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.is_client_owner, u.created_at
      FROM public.users u
     WHERE u.is_superuser = false
     ORDER BY u.created_at DESC;
END;
$$;

-- 5.12 Empresas de um usuário (ativas e inativas).
CREATE OR REPLACE FUNCTION public.admin_list_user_tenants(p_user_id uuid)
RETURNS TABLE (
  member_id uuid,
  tenant_id uuid,
  tenant_name text,
  slug text,
  is_active boolean,
  allowed_modules text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso restrito ao Desenvolvedor.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT m.id, t.id, t.tenant_name, t.slug, t.is_active, m.allowed_modules
      FROM public.tenant_members m
      JOIN public.tenants t ON t.id = m.tenant_id
     WHERE m.user_id = p_user_id
       AND m.role = 'OWNER'
     ORDER BY t.created_at;
END;
$$;

-- 5.13 Gera um slug estável a partir do nome da empresa.
--
-- Fica no banco, e não no aplicativo, porque o banco é quem conhece os slugs já
-- usados — o app enviava um slug calculado às cegas e descobria a colisão só no
-- erro de chave única.
CREATE OR REPLACE FUNCTION public.gerar_slug_empresa(p_nome text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_slug text;
  v_n integer := 1;
BEGIN
  v_base := btrim(regexp_replace(lower(coalesce(p_nome, 'empresa')), '[^a-z0-9]+', '-', 'g'), '-');
  IF v_base = '' THEN v_base := 'empresa'; END IF;

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  END LOOP;

  RETURN v_slug;
END;
$$;

-- 5.14 SINCRONIZAÇÃO DAS EMPRESAS DE UM USUÁRIO — UMA TRANSAÇÃO SÓ (C2)
--
-- ⚠️ ISTO ERA UMA SEQUÊNCIA DE CHAMADAS NO TYPESCRIPT, e por isso podia parar no
-- meio: a primeira empresa criada, a segunda recusada por nome repetido, o papel
-- do usuário não atualizado — e o banco num estado que ninguém pediu. Uma função
-- PL/pgSQL roda dentro de UMA transação: se qualquer passo falhar, tudo volta.
-- É a regra "nunca quebrar operação transacional em chamadas separadas" do
-- CLAUDE.md, agora cumprida.
--
-- Formato de `p_tenants` (o que a tela envia):
--   [{ "tenant_id": null,      "name": "EMPRESA NOVA",   "is_active": true },
--    { "tenant_id": "uuid...", "name": "EMPRESA ANTIGA", "is_active": true }]
CREATE OR REPLACE FUNCTION public.admin_sync_user_tenants(
  p_user_id uuid,
  p_tenants jsonb DEFAULT '[]'::jsonb,
  p_deleted uuid[] DEFAULT '{}'::uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_tenant_id uuid;
  v_nome text;
  v_ativo boolean;
  v_novo_id uuid;
  v_tem_ativa boolean;
  v_criadas integer := 0;
  v_atualizadas integer := 0;
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso restrito ao Desenvolvedor.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  -- A. DESATIVAÇÃO LÓGICA — "remover" nunca apaga; o histórico continua lá,
  -- e é isso que dá sentido ao botão "Reabilitar" da tela.
  IF array_length(p_deleted, 1) IS NOT NULL THEN
    UPDATE public.tenants
       SET is_active = false
     WHERE id = ANY(p_deleted)
       AND owner_id = p_user_id;
  END IF;

  -- B. CRIAÇÃO E ATUALIZAÇÃO
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_tenants, '[]'::jsonb))
  LOOP
    v_tenant_id := NULLIF(v_item->>'tenant_id', '')::uuid;
    v_nome      := btrim(coalesce(v_item->>'name', ''));
    v_ativo     := coalesce((v_item->>'is_active')::boolean, true);

    IF v_nome = '' THEN
      RAISE EXCEPTION 'Empresa sem nome.' USING ERRCODE = '22023';
    END IF;

    IF v_tenant_id IS NULL THEN
      -- Nome repetido para o MESMO dono é erro de negócio, com mensagem que a
      -- tela sabe traduzir. Nomes iguais de donos diferentes são permitidos.
      IF EXISTS (
        SELECT 1 FROM public.tenants
         WHERE owner_id = p_user_id AND upper(tenant_name) = upper(v_nome)
      ) THEN
        RAISE EXCEPTION 'NOME_EMPRESA_DUPLICADO' USING ERRCODE = '23505';
      END IF;

      INSERT INTO public.tenants (tenant_name, slug, owner_id, is_active)
      VALUES (v_nome, public.gerar_slug_empresa(v_nome), p_user_id, v_ativo)
      RETURNING id INTO v_novo_id;

      INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
      VALUES (v_novo_id, p_user_id, 'OWNER', true)
      ON CONFLICT (tenant_id, user_id) DO NOTHING;

      v_criadas := v_criadas + 1;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.tenants
         WHERE owner_id = p_user_id
           AND upper(tenant_name) = upper(v_nome)
           AND id <> v_tenant_id
      ) THEN
        RAISE EXCEPTION 'NOME_EMPRESA_DUPLICADO' USING ERRCODE = '23505';
      END IF;

      UPDATE public.tenants
         SET tenant_name = v_nome,
             is_active   = v_ativo
       WHERE id = v_tenant_id
         AND owner_id = p_user_id;

      -- Garante o vínculo de dono mesmo em base antiga, onde ele podia faltar.
      INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
      VALUES (v_tenant_id, p_user_id, 'OWNER', true)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_active = true;

      v_atualizadas := v_atualizadas + 1;
    END IF;
  END LOOP;

  -- C. O PAPEL DO USUÁRIO SEGUE AS EMPRESAS. Sobrou empresa ativa, ele é
  -- cliente operacional; não sobrou, volta para a fila de triagem.
  SELECT EXISTS (
    SELECT 1 FROM public.tenants WHERE owner_id = p_user_id AND is_active = true
  ) INTO v_tem_ativa;

  UPDATE public.users
     SET role            = CASE WHEN v_tem_ativa THEN 'active' ELSE 'pending' END,
         is_client_owner = v_tem_ativa
   WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'criadas', v_criadas,
    'atualizadas', v_atualizadas,
    'role', CASE WHEN v_tem_ativa THEN 'active' ELSE 'pending' END
  );
END;
$$;

-- 5.15 PROMOÇÃO DIRETA A PROPRIETÁRIO (atalho de uma empresa só).
-- Mesmo motor da 5.14, para o caso simples de "habilitar este usuário agora".
CREATE OR REPLACE FUNCTION public.admin_promote_to_owner(
  p_user_id uuid,
  p_tenant_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso restrito ao Desenvolvedor.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
           NULLIF(btrim(p_tenant_name), ''),
           'EMPRESA DE ' || upper(COALESCE(u.full_name, u.email))
         )
    INTO v_nome
    FROM public.users u
   WHERE u.id = p_user_id;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  RETURN public.admin_sync_user_tenants(
    p_user_id,
    jsonb_build_array(jsonb_build_object('tenant_id', NULL, 'name', v_nome, 'is_active', true)),
    '{}'::uuid[]
  );
END;
$$;

-- 5.16 GRAVAÇÃO DO WHITE-LABEL (título, cores e e-mails de alerta).
CREATE OR REPLACE FUNCTION public.admin_update_global_settings(p_ajustes jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso restrito ao Desenvolvedor.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.global_settings SET
    system_title               = COALESCE(NULLIF(btrim(p_ajustes->>'system_title'), ''), system_title),
    color_header_bg            = COALESCE(NULLIF(btrim(p_ajustes->>'color_header_bg'), ''), color_header_bg),
    color_footer_bg            = COALESCE(NULLIF(btrim(p_ajustes->>'color_footer_bg'), ''), color_footer_bg),
    color_header_text          = COALESCE(NULLIF(btrim(p_ajustes->>'color_header_text'), ''), color_header_text),
    color_footer_text          = COALESCE(NULLIF(btrim(p_ajustes->>'color_footer_text'), ''), color_footer_text),
    color_bg_general           = COALESCE(NULLIF(btrim(p_ajustes->>'color_bg_general'), ''), color_bg_general),
    color_button_border        = COALESCE(NULLIF(btrim(p_ajustes->>'color_button_border'), ''), color_button_border),
    color_border_header_footer = COALESCE(NULLIF(btrim(p_ajustes->>'color_border_header_footer'), ''), color_border_header_footer),
    admin_emails               = COALESCE(NULLIF(btrim(p_ajustes->>'admin_emails'), ''), admin_emails)
  WHERE id = 1;

  RETURN json_build_object('success', true);
END;
$$;

-- 5.17 MOTOR DE SINCRONIZAÇÃO MANUAL DE UTILIZADORES
-- Utilitário de manutenção. Só a chave de serviço executa (seção 8).
CREATE OR REPLACE FUNCTION public.sync_auth_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, auth_provider, created_at)
  SELECT
    id,
    email,
    COALESCE(NULLIF(raw_user_meta_data->>'full_name', ''), NULLIF(raw_user_meta_data->>'name', '')),
    'pending',
    true,
    COALESCE(NULLIF(raw_app_meta_data->>'provider', ''), 'email'),
    created_at
  FROM auth.users
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('success', true, 'synced_count', v_count);
END;
$$;

-- 5.18 CARIMBO DE `updated_at`
CREATE OR REPLACE FUNCTION public.marcar_atualizacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 5.19 TRILHA DE AUDITORIA (bônus B4)
--
-- Grava o antes e o depois de cada alteração. `auth.uid()` identifica a pessoa
-- quando a mudança vem do aplicativo; vem nulo quando vem do servidor ou de um
-- gatilho, e isso também é informação.
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id text;
BEGIN
  v_id := CASE
            WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD)->>'id')
            ELSE (to_jsonb(NEW)->>'id')
          END;

  INSERT INTO public.audit_log (tabela, registro_id, operacao, ator_id, dados_antes, dados_depois)
  VALUES (
    TG_TABLE_NAME,
    v_id,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN NULL; -- AFTER trigger: o retorno é ignorado.
END;
$$;


-- ===========================================================================
-- 6. POLÍTICAS DE SEGURANÇA (RLS)
--
-- ⚠️ TODA POLICY NOMEIA O PAPEL COM `TO`. A documentação do Supabase recomenda
-- isso explicitamente, e o PostgreSQL avisa que, sem `TO`, o padrão é PUBLIC —
-- ou seja, a regra também vale para o visitante anônimo. Foi assim que a v9
-- deixou a lista de usuários aberta.
-- ===========================================================================

-- 6.1 USERS
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Acesso administrativo para triagem" ON public.users;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Ver perfis relacionados" ON public.users;
DROP POLICY IF EXISTS "Atualizar o próprio perfil" ON public.users;

CREATE POLICY "Ver perfis relacionados" ON public.users
FOR SELECT TO authenticated
USING (public.can_view_user_profile(id));

CREATE POLICY "Atualizar o próprio perfil" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6.2 GLOBAL SETTINGS
-- Leitura pública DE PROPÓSITO: o título e as cores são desenhados ANTES do
-- login, na tela da guarita. É o único dado desta plataforma que o visitante
-- anônimo precisa enxergar.
DROP POLICY IF EXISTS "Permitir leitura pública das configurações" ON public.global_settings;
DROP POLICY IF EXISTS "Ninguém atualiza via cliente" ON public.global_settings;
DROP POLICY IF EXISTS "Leitura pública do white-label" ON public.global_settings;

CREATE POLICY "Leitura pública do white-label" ON public.global_settings
FOR SELECT TO anon, authenticated
USING (true);

-- Não há policy de UPDATE: a gravação passa por `admin_update_global_settings`.

-- 6.3 TENANTS
DROP POLICY IF EXISTS "Acesso à Empresa (Dono ou Membro)" ON public.tenants;
DROP POLICY IF EXISTS "Dono gerencia sua empresa" ON public.tenants;
DROP POLICY IF EXISTS "Ver a empresa (dono, membro ou desenvolvedor)" ON public.tenants;
DROP POLICY IF EXISTS "Dono atualiza a própria empresa" ON public.tenants;

CREATE POLICY "Ver a empresa (dono, membro ou desenvolvedor)" ON public.tenants
FOR SELECT TO authenticated
USING (
  auth.uid() = owner_id
  OR public.check_is_tenant_member(id)
  OR public.is_superuser()
);

-- O dono renomeia a própria empresa; criar e desativar continua sendo ato do
-- Desenvolvedor (função 5.14). Sem INSERT e sem DELETE para o cliente.
CREATE POLICY "Dono atualiza a própria empresa" ON public.tenants
FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 6.4 TENANT MEMBERS
DROP POLICY IF EXISTS "Usuários veem seus próprios vínculos de membro" ON public.tenant_members;
DROP POLICY IF EXISTS "Donos veem todos os membros do seu tenant" ON public.tenant_members;
DROP POLICY IF EXISTS "Donos podem inserir membros no seu tenant" ON public.tenant_members;
DROP POLICY IF EXISTS "Donos podem atualizar membros no seu tenant" ON public.tenant_members;
DROP POLICY IF EXISTS "Donos podem remover membros no seu tenant" ON public.tenant_members;
DROP POLICY IF EXISTS "Ver os próprios vínculos" ON public.tenant_members;
DROP POLICY IF EXISTS "Dono cria colaboradores" ON public.tenant_members;
DROP POLICY IF EXISTS "Dono atualiza colaboradores" ON public.tenant_members;
DROP POLICY IF EXISTS "Dono remove colaboradores" ON public.tenant_members;

CREATE POLICY "Ver os próprios vínculos" ON public.tenant_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.check_is_tenant_owner(tenant_id) OR public.is_superuser());

-- ⚠️ O DONO SÓ CRIA DEPENDENTE E VISITANTE, NUNCA OUTRO DONO. Sem a checagem de
-- papel, o dono podia inserir um vínculo OWNER para si mesmo em outra empresa —
-- ou promover alguém a dono de uma empresa que não é dele.
CREATE POLICY "Dono cria colaboradores" ON public.tenant_members
FOR INSERT TO authenticated
WITH CHECK (public.check_is_tenant_owner(tenant_id) AND role IN ('DEPENDENT', 'VIEWER'));

CREATE POLICY "Dono atualiza colaboradores" ON public.tenant_members
FOR UPDATE TO authenticated
USING (public.check_is_tenant_owner(tenant_id) AND role IN ('DEPENDENT', 'VIEWER'))
WITH CHECK (public.check_is_tenant_owner(tenant_id) AND role IN ('DEPENDENT', 'VIEWER'));

CREATE POLICY "Dono remove colaboradores" ON public.tenant_members
FOR DELETE TO authenticated
USING (public.check_is_tenant_owner(tenant_id) AND role IN ('DEPENDENT', 'VIEWER'));

-- 6.5 AUDIT LOG — leitura só do Desenvolvedor; escrita, só pelo gatilho.
DROP POLICY IF EXISTS "Desenvolvedor lê a trilha de auditoria" ON public.audit_log;

CREATE POLICY "Desenvolvedor lê a trilha de auditoria" ON public.audit_log
FOR SELECT TO authenticated
USING (public.is_superuser());


-- ===========================================================================
-- 7. TRIGGERS
-- Ordem obrigatória: BEFORE INSERT antes de AFTER INSERT. O carimbo de
-- confirmação precisa entrar na mesma linha que está sendo inserida, antes
-- de o AFTER espelhar o perfil em public.users.
-- ===========================================================================

-- 7.1 BEFORE INSERT — carimba email_confirmed_at (login imediato)
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auto_confirm_email();

-- 7.2 AFTER INSERT — espelha o novo usuário em public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7.3 Carimbo de `updated_at`
DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS set_updated_at_tenants ON public.tenants;
CREATE TRIGGER set_updated_at_tenants BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS set_updated_at_members ON public.tenant_members;
CREATE TRIGGER set_updated_at_members BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS set_updated_at_settings ON public.global_settings;
CREATE TRIGGER set_updated_at_settings BEFORE UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

-- 7.4 Trilha de auditoria nas quatro tabelas do CORE
DROP TRIGGER IF EXISTS audit_users ON public.users;
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_tenants ON public.tenants;
CREATE TRIGGER audit_tenants AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_tenant_members ON public.tenant_members;
CREATE TRIGGER audit_tenant_members AFTER INSERT OR UPDATE OR DELETE ON public.tenant_members
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_global_settings ON public.global_settings;
CREATE TRIGGER audit_global_settings AFTER INSERT OR UPDATE OR DELETE ON public.global_settings
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();


-- ===========================================================================
-- 8. PRIVILÉGIOS — A SEGUNDA TRANCA
--
-- ⚠️ RLS NÃO É A ÚNICA CAMADA, E CONFIAR SÓ NELA FOI O ERRO DA v9. A
-- documentação do Supabase diz que tabelas criadas em `public` recebem SELECT,
-- INSERT, UPDATE e DELETE para `anon` e `authenticated` POR PADRÃO: o GRANT diz
-- se o papel pode tocar no objeto, a RLS diz em quais linhas. Use os dois.
--
-- Aqui o INSERT e o DELETE de `users` e `tenants` são RETIRADOS do cliente: eles
-- só acontecem por gatilho (perfil) ou por função administrativa (empresa).
-- ===========================================================================

-- 8.1 Ponto de partida: tirar tudo de quem fala pela API pública.
REVOKE ALL ON public.users           FROM anon, authenticated;
REVOKE ALL ON public.global_settings FROM anon, authenticated;
REVOKE ALL ON public.tenants         FROM anon, authenticated;
REVOKE ALL ON public.tenant_members  FROM anon, authenticated;
REVOKE ALL ON public.audit_log       FROM anon, authenticated;

-- 8.2 Devolver apenas o necessário.

-- Perfil: leitura filtrada pela RLS; escrita SÓ nas cinco colunas do formulário
-- (mais a bandeira de cadastro completo). É isto que impede um usuário de
-- gravar `is_superuser = true` ou `role = 'active'` na própria linha.
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (full_name, planet, country, state, city, profile_completed)
  ON public.users TO authenticated;

-- White-label: leitura para todos (inclusive antes do login); gravação por função.
GRANT SELECT ON public.global_settings TO anon, authenticated;

-- Empresas: leitura filtrada; o dono só pode renomear.
GRANT SELECT ON public.tenants TO authenticated;
GRANT UPDATE (tenant_name) ON public.tenants TO authenticated;

-- Vínculos: o dono monta a própria equipe (a RLS limita a empresa e o papel).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;

-- Auditoria: leitura para o Desenvolvedor (a RLS confere); ninguém escreve.
GRANT SELECT ON public.audit_log TO authenticated;

-- 8.3 Funções: no PostgreSQL o EXECUTE é concedido a PUBLIC por padrão. Tiramos
-- tudo e devolvemos nome a nome.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Chamadas pelo usuário autenticado (o próprio app):
GRANT EXECUTE ON FUNCTION public.check_profile_completed(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_google_user_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email_for_invite(text, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superuser()                               TO authenticated;

-- Painel de Engenharia (as funções conferem `is_superuser()` por dentro):
GRANT EXECUTE ON FUNCTION public.admin_list_users()                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_user_tenants(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_user_tenants(uuid, jsonb, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_promote_to_owner(uuid, text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_global_settings(jsonb)          TO authenticated;

-- As funções de apoio da RLS precisam ser executáveis por quem a RLS avalia.
GRANT EXECUTE ON FUNCTION public.check_is_tenant_member(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_tenant_owner(uuid)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_user_profile(uuid)                  TO authenticated;

-- `sync_auth_users` e `gerar_slug_empresa` ficam só para o servidor/manutenção:
-- nenhum GRANT para anon ou authenticated.

-- 8.4 O que vier daqui para a frente (tabelas e funções novas do C FINANCEIRO)
-- nasce fechado; cada objeto novo precisa do seu GRANT explícito.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;


-- ===========================================================================
-- 9. REALTIME
--
-- ⚠️ SEM ISTO O AVISO DE "PERMISSÕES ALTERADAS" NUNCA DISPARA. O aplicativo
-- escuta mudanças em `tenant_members`, mas o Postgres Changes do Supabase só
-- envia eventos de tabelas que estejam na publicação `supabase_realtime`.
-- O bloco tolera o caso de a tabela já estar publicada.
-- ===========================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_members;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- já está publicada
  WHEN undefined_object THEN NULL;  -- banco sem a publicação (Postgres puro)
END;
$$;


-- ===========================================================================
-- FIM DO SCHEMA — PLATAFORMA JAIRO O D C v10
-- ===========================================================================
--
-- PRÓXIMOS PASSOS
--   1. Rodar o `plataforma_02_seed.sql`.
--   2. Criar o usuário do Desenvolvedor:
--        a) Supabase > Authentication > Users > "Add user" (com senha);
--        b) marcar o sinalizador:
--             update public.users
--                set is_superuser = true, is_active = true, profile_completed = true,
--                    full_name = 'DESENVOLVEDOR', state = 'SP', city = 'SAO PAULO'
--              where email = 'coloque-o-email-aqui';
--      ⚠️ Não existe mais credencial fixa no código. Sem este passo, o Painel de
--      Engenharia não abre para ninguém.
--   3. Conferir: 5 tabelas, 19 funções, 10 policies, 10 triggers.
--   4. Rodar `supabase/testes/teste_rls.sql` para verificar as travas de acesso.
-- ===========================================================================
