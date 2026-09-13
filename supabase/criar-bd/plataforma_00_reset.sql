-- ===========================================================================
-- 🛡️ PLATAFORMA JAIRO O D C v10 — RESET DA PLATAFORMA CORE
-- ===========================================================================
-- Responsabilidade: devolver o banco a um estado limpo, contendo apenas as
-- estruturas da Plataforma CORE (autenticação, empresas, membros, ajustes).
-- Uso previsto: desenvolvimento e testes.
--
-- Versão: v10 (CORE only)
-- Atualizado em: 2026-09-11
-- Módulos: TODOS removidos (Tarefas, Conciliador, Finanças Pessoal).
--          Este script NÃO derruba as estruturas desses módulos.
--
-- ⚠️ ISTO APAGA TODOS OS USUÁRIOS E TODAS AS EMPRESAS. Não existe desfazer.
-- Enquanto não houver dado real (decisão do dono do projeto, 2026-09-11), este
-- é o caminho recomendado: recriar do zero em vez de remendar. No dia em que
-- existir dado real, a evolução passa a ser por `supabase/migrations/` —
-- ver o README daquela pasta.
--
-- Ordem de execução para reconstruir do zero:
--   1) este script (plataforma_00_reset.sql)
--   2) plataforma_01_schema.sql
--   3) plataforma_02_seed.sql
-- ===========================================================================

-- ===========================================================================
-- 1. 🧪 LIMPEZA DO COFRE DE AUTENTICAÇÃO (auth)
-- ===========================================================================
-- Reseta os usuários e identidades criados no Supabase Auth em cascata.
-- ⚠️ Isto inclui o usuário do Desenvolvedor: depois do reset é preciso criá-lo
-- de novo (Authentication > Users) e marcar `is_superuser = true`. O passo a
-- passo está no fim do `plataforma_02_seed.sql`.
TRUNCATE auth.users CASCADE;
TRUNCATE auth.identities CASCADE;

-- ===========================================================================
-- 2. 🧽 DROPS DA PLATAFORMA CORE: MULTI-TENANCY, PERFIS E AUDITORIA (public)
-- Ordem reversa de dependência: filhas -> mestres
-- ===========================================================================
-- v10 degrau 5: o soquete dos modulos sai antes de tenants (FK) e do catalogo.
DROP TABLE IF EXISTS public.tenant_modules   CASCADE;
DROP TABLE IF EXISTS public.platform_modules CASCADE;
DROP TABLE IF EXISTS public.audit_log      CASCADE;
DROP TABLE IF EXISTS public.tenant_members CASCADE;
DROP TABLE IF EXISTS public.tenants        CASCADE;
DROP TABLE IF EXISTS public.global_settings CASCADE;
DROP TABLE IF EXISTS public.users          CASCADE;

-- ===========================================================================
-- 3. 🧽 DROPS DE FUNÇÕES E TRIGGERS DA PLATAFORMA CORE
-- ===========================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users CASCADE;

-- Gatilhos e perfil
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auto_confirm_email() CASCADE;
DROP FUNCTION IF EXISTS public.marcar_atualizacao() CASCADE;
DROP FUNCTION IF EXISTS public.registrar_auditoria() CASCADE;

-- Apoio da RLS
DROP FUNCTION IF EXISTS public.check_is_tenant_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_is_tenant_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_superuser() CASCADE;
DROP FUNCTION IF EXISTS public.can_view_user_profile(uuid) CASCADE;

-- Perfil e conta
DROP FUNCTION IF EXISTS public.ensure_google_user_profile(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_profile_completed(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_permanently(uuid) CASCADE;

-- Equipe
-- ⚠️ AS DUAS ASSINATURAS: a da v9 recebia só o e-mail; a da v10 exige também a
-- empresa. Derrubar apenas uma deixaria a antiga viva no banco — e ela é
-- justamente a versão aberta que a v10 fechou.
DROP FUNCTION IF EXISTS public.get_user_by_email_for_invite(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_by_email_for_invite(text, uuid) CASCADE;

-- Painel de Engenharia (v10)
DROP FUNCTION IF EXISTS public.admin_list_users() CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_user_tenants(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_sync_user_tenants(uuid, jsonb, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.admin_promote_to_owner(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_global_settings(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.gerar_slug_empresa(text) CASCADE;

-- Modulos (v10 - degrau 5)
DROP FUNCTION IF EXISTS public.modulo_contratado(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validar_modulos_do_membro() CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_tenant_module(uuid, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_tenant_modules(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.modulos_do_membro(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.modulos_contratados(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_list_all_tenants() CASCADE;
DROP FUNCTION IF EXISTS public.admin_apagar_dados_do_modulo(uuid, text) CASCADE;

-- Manutenção
DROP FUNCTION IF EXISTS public.sync_auth_users() CASCADE;

-- ===========================================================================
-- 4. ⚠️ O QUE ESTE SCRIPT **NÃO** DERRUBA, E NÃO DEVE DERRUBAR
-- ===========================================================================
-- `public.rls_auto_enable()` e o event trigger `ensure_rls` que a usa NÃO são
-- deste projeto: são do ambiente (dono `postgres`) e ligam RLS em toda tabela
-- nova do `public`. Foi por isso que o inventário de 2026-09-12 encontrou 26
-- funções onde o schema cria 25.
--
-- ⚠️ NUNCA "LIMPE" O SCHEMA COM UM LAÇO DO TIPO `DROP FUNCTION` EM TUDO O QUE
-- HÁ EM `pg_proc`. Além de derrubar essa rede de segurança, levaria junto as
-- funções das extensões (`uuid-ossp`, `unaccent`), que moram no `public` neste
-- banco. Este script derruba por NOME, um a um, de propósito.
