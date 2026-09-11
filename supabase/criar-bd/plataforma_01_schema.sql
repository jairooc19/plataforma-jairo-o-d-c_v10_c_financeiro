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
--   8. Constraints e saneamento final
--
-- Modo de uso: colar inteiro no SQL Editor do Supabase e executar de uma vez.
-- Exige papel com privilégio sobre o schema `auth` (o papel `postgres` do SQL
-- Editor e o Supabase CLI local atendem).
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
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    role text DEFAULT 'pending',
    is_superuser boolean DEFAULT false,
    is_client_owner boolean DEFAULT false,
    is_active boolean DEFAULT true,
    planet text NOT NULL DEFAULT 'TERRA',
    -- 🌍 v7: país é obrigatório. Padrão 'BRASIL' (maiúsculas, como o app grava).
    country text NOT NULL DEFAULT 'BRASIL',
    state text,
    city text,
    -- 🔐 v7: como a conta nasceu. 'email' (cadastro com senha) ou 'google' (OAuth).
    -- Vira NOT NULL na seção 8.4; aqui fica com DEFAULT para o INSERT do gatilho.
    auth_provider text DEFAULT 'email',
    -- ✅ v7: o cadastro chegou ao fim? Vira NOT NULL na seção 8.5.
    -- Nasce `true` no cadastro com senha (o formulário já pediu tudo) e `false`
    -- no Google, que só entrega e-mail e nome — falta planeta, país, estado e cidade.
    profile_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc', now() AT TIME ZONE 'America/Sao_Paulo') NOT NULL
);

-- 2.2 CONFIGURAÇÕES GLOBAIS (White Label) — linha única, id = 1
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
    admin_emails text DEFAULT 'jairooc19@gmail.com',
    updated_at timestamp with time zone DEFAULT timezone('utc', now() AT TIME ZONE 'America/Sao_Paulo') NOT NULL
);

-- 2.3 EMPRESAS (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name text NOT NULL,
    slug text UNIQUE NOT NULL,
    owner_id uuid REFERENCES public.users(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now() AT TIME ZONE 'America/Sao_Paulo') NOT NULL
);

-- 2.4 VÍNCULOS (Membros de cada empresa)
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('OWNER', 'DEPENDENT', 'VIEWER')),
    is_active boolean DEFAULT true,
    allowed_modules text DEFAULT '',
    module_configs jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc', now() AT TIME ZONE 'America/Sao_Paulo') NOT NULL,
    UNIQUE(tenant_id, user_id)
);


-- ===========================================================================
-- 3. HABILITAÇÃO DE ROW LEVEL SECURITY
-- ===========================================================================

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members  ENABLE ROW LEVEL SECURITY;


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
-- ===========================================================================

-- 5.1 AUTO-CONFIRMAÇÃO DE E-MAIL
-- Libera o login imediatamente após o cadastro, sem depender da chave
-- "Confirm email" do painel do Supabase.
--
-- POR QUE EXISTE: a plataforma não tem provedor de e-mail transacional. Com a
-- confirmação LIGADA no projeto, o usuário se cadastra mas o login falha com
-- "Email not confirmed" — e o link de confirmação não chega a lugar nenhum,
-- porque não há quem o envie. O usuário fica preso. A correção vive no banco:
-- nenhum passo manual no painel é necessário.
--
-- BEFORE INSERT (e não AFTER): assim o próprio GoTrue já enxerga a conta como
-- confirmada dentro da mesma transação do cadastro.
-- A coluna `confirmed_at` NÃO é tocada — no Supabase ela é GERADA a partir de
-- `email_confirmed_at`/`phone_confirmed_at`, e escrever nela quebra o INSERT.
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 SINCRONIZAÇÃO auth.users -> public.users (com suporte a Google OAuth)
-- Extrai os metadados do cadastro e insere na tabela pública de perfis.
--
-- 🔐 DETECÇÃO DO PROVEDOR: usa `raw_app_meta_data->>'provider'`, que o GoTrue
-- já grava na PRÓPRIA linha sendo inserida ('email' no cadastro com senha,
-- 'google' no OAuth). NÃO consultar `auth.identities` aqui: a linha de identidade
-- só nasce DEPOIS deste AFTER INSERT, e a consulta voltaria vazia sempre —
-- carimbando todo usuário Google como 'email'. A varredura em auth.identities
-- fica como segunda tentativa, para o caso de o app_metadata vir vazio.
--
-- 🛡️ ON CONFLICT DO NOTHING: sem ele, um segundo INSERT em auth.users com o mesmo
-- id (re-sincronização, reimportação) derrubaria o cadastro inteiro por violação
-- de chave primária — o gatilho roda dentro da transação do GoTrue.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
    id,
    email,
    full_name,
    role,
    planet,
    country,
    state,
    city,
    is_active,
    auth_provider,
    profile_completed
  )
  VALUES (
    new.id,
    new.email,
    -- O Google entrega o nome em 'full_name' ou em 'name', conforme o escopo.
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'full_name', ''),
      NULLIF(new.raw_user_meta_data->>'name', '')
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'pending'),
    COALESCE(NULLIF(new.raw_user_meta_data->>'planet', ''), 'TERRA'),
    -- 🌍 v7: país é NOT NULL na tabela. Cadastros sem país caem no padrão 'BRASIL'.
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 5.3 VERIFICAÇÃO DE MEMBRO DO TENANT
-- Usada pelas políticas de RLS para saber se o utilizador logado pertence à empresa.
CREATE OR REPLACE FUNCTION public.check_is_tenant_member(p_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.4 VERIFICAÇÃO DE DONO DO TENANT
-- Usada para funções administrativas dentro de uma empresa específica.
CREATE OR REPLACE FUNCTION public.check_is_tenant_owner(p_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = p_tenant_id
      AND owner_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.5 BUSCA DE UTILIZADOR PARA CONVITE
-- Permite que um dono de empresa encontre outro utilizador pelo e-mail para o convidar.
CREATE OR REPLACE FUNCTION public.get_user_by_email_for_invite(p_email text)
RETURNS TABLE (id uuid, full_name text, email text) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.full_name, u.email
    FROM public.users u
    WHERE u.email = p_email AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6 MOTOR DE SINCRONIZAÇÃO MANUAL DE UTILIZADORES
-- Utilidade para garantir que a tabela pública esteja sempre em dia com o Auth.
CREATE OR REPLACE FUNCTION public.sync_auth_users()
RETURNS json AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, auth_provider, created_at)
  SELECT
    id,
    email,
    COALESCE(NULLIF(raw_user_meta_data->>'full_name', ''), NULLIF(raw_user_meta_data->>'name', '')),
    COALESCE(raw_user_meta_data->>'role', 'pending'),
    true,
    -- 🔐 Sem isto, todo usuário Google reimportado seria carimbado como 'email'.
    COALESCE(NULLIF(raw_app_meta_data->>'provider', ''), 'email'),
    created_at
  FROM auth.users
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    role = COALESCE(public.users.role, EXCLUDED.role)
  WHERE public.users.role IS NULL OR public.users.role = 'USER' OR public.users.role = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('success', true, 'synced_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.7 REDE DE SEGURANÇA DO PERFIL GOOGLE
-- Garante que um usuário autenticado via Google tenha linha em public.users.
--
-- POR QUE EXISTE, se o gatilho 7.2 já espelha o perfil: o gatilho só dispara no
-- INSERT em auth.users. Uma conta Google que já existia antes deste schema, ou
-- criada em janela onde o gatilho estava ausente, autentica com sucesso e cai
-- num dashboard sem perfil. Esta função é chamada pelo Core logo após o login
-- Google e fecha esse buraco.
--
-- SECURITY DEFINER é obrigatório: não há policy de INSERT em public.users, então
-- o cliente anon/authenticated não consegue criar o próprio perfil por conta.
CREATE OR REPLACE FUNCTION public.ensure_google_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_user_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id)
    INTO v_user_exists;

  IF NOT v_user_exists THEN
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

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'created', NOT v_user_exists
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.8 O CADASTRO ESTÁ COMPLETO?
-- Fonte de verdade do portão que leva à tela "Completar Cadastro".
--
-- Confere os campos, e não apenas a bandeira `profile_completed`: a bandeira
-- sozinha mentiria se alguém a marcasse antes de preencher os dados, ou se um
-- campo fosse esvaziado depois. Os dois precisam concordar.
CREATE OR REPLACE FUNCTION public.check_profile_completed(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.9 APAGAR A PRÓPRIA CONTA, EM DEFINITIVO
-- Remove o usuário de auth.users; o ON DELETE CASCADE derruba public.users e,
-- atrás dele, os vínculos em tenant_members.
--
-- 🛡️ TRAVA DE IDENTIDADE (LEIA ANTES DE MEXER): a função é SECURITY DEFINER e
-- recebe o id por parâmetro. Sem a comparação com auth.uid(), QUALQUER pessoa
-- autenticada apagaria a conta de QUALQUER outra só trocando o uuid na chamada —
-- o RLS não protege nada aqui, porque SECURITY DEFINER passa por cima dele.
-- O parâmetro serve só para o chamador declarar a intenção; quem manda é a sessão.
-- Visitante anônimo tem auth.uid() NULL e é barrado pela mesma comparação.
--
-- 🏢 PROTEÇÃO DE EMPRESA: dono de empresa não se apaga. A empresa e os vínculos
-- dos dependentes sobreviveriam órfãos, com owner_id apontando para o nada.
CREATE OR REPLACE FUNCTION public.delete_user_permanently(p_user_id uuid)
RETURNS json AS $$
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

  -- Explícitos de propósito: o CASCADE já faria o serviço, mas deixar os passos
  -- à vista evita que uma mudança futura nas chaves estrangeiras deixe sobras.
  DELETE FROM public.tenant_members WHERE user_id = p_user_id;
  DELETE FROM public.users          WHERE id      = p_user_id;
  DELETE FROM auth.users            WHERE id      = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Conta apagada em definitivo.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;


-- ===========================================================================
-- 6. POLÍTICAS DE SEGURANÇA (RLS)
-- ===========================================================================

-- 6.1 USERS
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Acesso administrativo para triagem" ON public.users
FOR SELECT USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- 6.2 GLOBAL SETTINGS
CREATE POLICY "Permitir leitura pública das configurações" ON public.global_settings
FOR SELECT USING (true);

CREATE POLICY "Ninguém atualiza via cliente" ON public.global_settings
FOR UPDATE USING (false);

-- 6.3 TENANTS
-- Leitura de sinal aberto: o Dono OU um dependente ativo confirmado por
-- check_is_tenant_member. Sem a segunda metade, o DEPENDENTE não enxerga a
-- linha da empresa à qual está vinculado e trava na tela de triagem.
CREATE POLICY "Acesso à Empresa (Dono ou Membro)" ON public.tenants
FOR SELECT
USING (
    auth.uid() = owner_id
    OR public.check_is_tenant_member(id)
);

CREATE POLICY "Dono gerencia sua empresa" ON public.tenants
FOR ALL USING (auth.uid() = owner_id);

-- 6.4 TENANT MEMBERS — leitura do próprio vínculo
-- 🛡️ Elo perdido: libera a leitura do próprio vínculo para o cliente passar da
-- tela de triagem de forma legítima.
CREATE POLICY "Usuários veem seus próprios vínculos de membro" ON public.tenant_members
FOR SELECT USING (auth.uid() = user_id);

-- 6.5 TENANT MEMBERS — controle administrativo do OWNER sobre seus dependentes
CREATE POLICY "Donos veem todos os membros do seu tenant"
ON public.tenant_members FOR SELECT
USING (public.check_is_tenant_owner(tenant_id));

CREATE POLICY "Donos podem inserir membros no seu tenant"
ON public.tenant_members FOR INSERT
WITH CHECK (public.check_is_tenant_owner(tenant_id));

CREATE POLICY "Donos podem atualizar membros no seu tenant"
ON public.tenant_members FOR UPDATE
USING (public.check_is_tenant_owner(tenant_id))
WITH CHECK (public.check_is_tenant_owner(tenant_id));

CREATE POLICY "Donos podem remover membros no seu tenant"
ON public.tenant_members FOR DELETE
USING (public.check_is_tenant_owner(tenant_id));


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


-- ===========================================================================
-- 8. CONSTRAINTS E SANEAMENTO FINAL
-- Em banco novo os UPDATEs não encontram nenhuma linha — são inofensivos.
-- Ficam aqui como rede de segurança: se o arquivo for reaplicado sobre um
-- banco já povoado, a restrição NOT NULL não quebra por dado sujo.
-- ===========================================================================

-- 8.1 PAÍS: nenhum registro pode ficar sem país antes da restrição entrar.
UPDATE public.users
   SET country = 'BRASIL'
 WHERE country IS NULL
    OR btrim(country) = '';

ALTER TABLE public.users ALTER COLUMN country SET DEFAULT 'BRASIL';
ALTER TABLE public.users ALTER COLUMN country SET NOT NULL;

-- 8.2 PLANETA: mesma blindagem, mantendo o padrão histórico 'TERRA'.
UPDATE public.users
   SET planet = 'TERRA'
 WHERE planet IS NULL
    OR btrim(planet) = '';

ALTER TABLE public.users ALTER COLUMN planet SET DEFAULT 'TERRA';
ALTER TABLE public.users ALTER COLUMN planet SET NOT NULL;

-- 8.3 DESTRAVAMENTO RETROATIVO DE CONFIRMAÇÃO
-- Libera quem já se cadastrou e ficou preso no "Email not confirmed".
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 8.4 PROVEDOR DE AUTENTICAÇÃO: mesma blindagem antes do NOT NULL entrar.
-- Perfis criados antes desta coluna existir nasceram do cadastro com senha.
-- O ADD COLUMN é obrigatório aqui: o CREATE TABLE da seção 2.1 é IF NOT EXISTS,
-- então num banco já povoado ele não acrescenta a coluna nova — e os comandos
-- abaixo quebrariam com "column auth_provider does not exist".
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';

UPDATE public.users
   SET auth_provider = 'email'
 WHERE auth_provider IS NULL
    OR btrim(auth_provider) = '';

ALTER TABLE public.users ALTER COLUMN auth_provider SET DEFAULT 'email';
ALTER TABLE public.users ALTER COLUMN auth_provider SET NOT NULL;

-- 8.5 CADASTRO COMPLETO: mesma blindagem (o CREATE TABLE da 2.1 é IF NOT EXISTS).
-- O backfill não pode chutar `false` para todo mundo: quem se cadastrou com senha
-- já preencheu o formulário inteiro e seria jogado de volta para a tela de
-- "Completar Cadastro" sem ter o que completar.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

UPDATE public.users
   SET profile_completed = (
         auth_provider = 'email'
         OR (
              full_name IS NOT NULL AND btrim(full_name) <> ''
          AND state     IS NOT NULL AND btrim(state)     <> ''
          AND city      IS NOT NULL AND btrim(city)      <> ''
         )
       )
 WHERE profile_completed IS NULL;

ALTER TABLE public.users ALTER COLUMN profile_completed SET DEFAULT false;
ALTER TABLE public.users ALTER COLUMN profile_completed SET NOT NULL;


-- ===========================================================================
-- FIM DO SCHEMA — PLATAFORMA JAIRO O D C v10
-- ===========================================================================
--
-- NOTA PARA FRONTEND: Remover fluxo "Esqueceu a Senha" em SignUpView.tsx
--   O fluxo de recuperação de senha é 100% frontend (TypeScript/React) — não há
--   nada a remover do lado do banco. Os arquivos que hoje o mencionam no
--   admin-web (varredura em apps/, node_modules excluído) são:
--     - src/components/auth/views/MainMenuView.tsx      (link "Esqueceu a senha?")
--     - src/components/auth/views/RecoveryFormsView.tsx (a view em si)
--     - src/components/auth/hooks/useAuthLogic.ts       (estado/transição)
--     - src/components/AuthInterface.tsx                (roteamento entre views)
--   SignUpView.tsx não contém o fluxo — a remoção acontece nos 4 acima.
--
-- PRÓXIMOS PASSOS
--   1. Colar este arquivo inteiro no SQL Editor do Supabase e executar.
--   2. Conferir: 4 tabelas, 9 funções, 12 policies e 2 triggers criados.
--   3. Testar cadastro + login imediato (sem confirmação de e-mail).
--   4. Remover o fluxo "Esqueceu a Senha" no frontend, conforme a nota acima.
--   5. Login Google (Proprietário): ativar o provedor Google em
--      Authentication > Providers e colar o mesmo Client ID que o admin-web usa
--      em NEXT_PUBLIC_GOOGLE_CLIENT_ID. Sem isso o token do popup é recusado.
-- ===========================================================================
