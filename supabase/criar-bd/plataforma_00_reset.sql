-- ===========================================================================
-- 🛡️ PLATAFORMA JAIRO O D C v10 — RESET DA PLATAFORMA CORE
-- ===========================================================================
-- Responsabilidade: devolver o banco a um estado limpo, contendo apenas as
-- estruturas da Plataforma CORE (autenticação, empresas, membros, ajustes).
-- Uso previsto: desenvolvimento e testes.
--
-- Versão: v10 (CORE only)
-- Atualizado em: 2026-09-01
-- Módulos: TODOS removidos (Tarefas, Conciliador, Finanças Pessoal).
--          Este script NÃO derruba mais as estruturas desses módulos.
--
-- Ordem de execução para reconstruir do zero:
--   1) este script (00_reset.sql)
--   2) 01_schema.sql
--   3) 02_seed.sql
-- ===========================================================================

-- ===========================================================================
-- 1. 🧪 LIMPEZA DO COFRE DE AUTENTICAÇÃO (auth)
-- ===========================================================================
-- Reseta os usuários e identidades criados no Supabase Auth em cascata
TRUNCATE auth.users CASCADE;
TRUNCATE auth.identities CASCADE;

-- ===========================================================================
-- 2. 🧽 DROPS DA PLATAFORMA CORE: MULTI-TENANCY E PERFIS (public)
-- Ordem reversa de dependência: filhas -> mestres
-- ===========================================================================
DROP TABLE IF EXISTS public.tenant_members CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.global_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ===========================================================================
-- 3. 🧽 DROPS DE FUNÇÕES E TRIGGERS DA PLATAFORMA CORE
-- ===========================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auto_confirm_email() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_tenant_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_is_tenant_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_by_email_for_invite(text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_users() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_google_user_profile(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_profile_completed(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_permanently(uuid) CASCADE;
