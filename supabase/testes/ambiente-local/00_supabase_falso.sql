-- ===========================================================================
-- 🧪 SUPABASE FALSO — o mínimo para rodar o schema num PostgreSQL puro
-- Local: supabase/testes/ambiente-local/00_supabase_falso.sql
-- ===========================================================================
--
-- PARA QUE SERVE: permitir que o `plataforma_01_schema.sql`, o seed e o
-- `teste_rls.sql` sejam executados numa instância local de PostgreSQL, sem
-- depender do projeto Supabase publicado.
--
-- POR QUE ISSO EXISTE (12/09/2026): até o degrau 5, todo SQL era escrito aqui e
-- só provado quando o dono do projeto colava no SQL Editor. Isso significava
-- que um erro de sintaxe só aparecia depois de ida e volta. Com este arquivo, o
-- schema inteiro pode ser aplicado e testado localmente **antes** de ir para a
-- mão dele.
--
-- ⚠️ ESTE ARQUIVO NÃO VAI PARA O SUPABASE. Lá, o schema `auth`, os papéis
-- `anon`/`authenticated` e a função `auth.uid()` já existem — criá-los de novo
-- daria erro. Ele só é usado numa instância local e descartável.
--
-- COMO USAR (na máquina, com o PostgreSQL instalado):
--   createdb -h localhost -p 5432 -U postgres pjodc_local
--   psql ... -f supabase/testes/ambiente-local/00_supabase_falso.sql
--   psql ... -f supabase/criar-bd/plataforma_01_schema.sql
--   psql ... -f supabase/criar-bd/plataforma_02_seed.sql
--   psql ... -f supabase/testes/teste_rls.sql        → 14 linhas, todas PASSOU
-- ===========================================================================

-- Os três papéis que o Supabase cria. Idempotente: o cluster pode já tê-los.
DO $fake$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END;
$fake$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- `auth.users` com as colunas que o projeto realmente usa: as que o gatilho
-- `handle_new_user` lê e as que o `teste_rls.sql` preenche.
CREATE TABLE IF NOT EXISTS auth.users (
  instance_id        uuid,
  id                 uuid PRIMARY KEY,
  aud                varchar,
  role               varchar,
  email              varchar UNIQUE,
  encrypted_password varchar,
  email_confirmed_at timestamptz,
  raw_app_meta_data  jsonb,
  raw_user_meta_data jsonb,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      text,
  provider_id   text,
  identity_data jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ⚠️ O `nullif` VEM ANTES DO CAST, E ISSO NÃO É DETALHE. É assim que o Supabase
-- escreve a função: se o cast viesse primeiro, um `request.jwt.claims = ''`
-- (que é como se "sai da sessão" num teste) estouraria com "input string ended
-- unexpectedly" — e o erro apareceria DENTRO do gatilho de auditoria, no meio
-- de um INSERT que nada tem a ver com isso. Foi exatamente o que aconteceu na
-- primeira execução local, em 12/09/2026.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $fake$
  SELECT COALESCE(
           NULLIF(current_setting('request.jwt.claim.sub', true), ''),
           NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
         )::uuid;
$fake$;

GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- A publicação que o Realtime do Supabase usa; a seção 9 do schema acrescenta
-- `tenant_members` a ela.
DO $fake$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END;
$fake$;

-- ⚠️ ESTES GRANTS SÃO O ESTADO "ABERTO" QUE O SUPABASE DÁ POR PADRÃO, e eles
-- precisam existir ANTES do schema para o teste ter valor: é justamente o que a
-- seção 8 do `plataforma_01_schema.sql` REVOGA. Sem eles, o REVOKE não provaria
-- nada — estaria revogando um privilégio que nunca foi concedido.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
