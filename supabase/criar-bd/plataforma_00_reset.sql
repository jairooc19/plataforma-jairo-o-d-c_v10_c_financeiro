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
--
-- ⚠️ SE HOUVER MÓDULO INSTALADO, O RESET DO MÓDULO VEM ANTES DESTE ARQUIVO.
-- A partir de 17/09/2026 quem cobra isso é o PORTEIRO da seção 0, logo abaixo:
-- este script se RECUSA a rodar em vez de causar o estrago em silêncio.
-- Ver `supabase/LEIA-ME-ORDEM.md`.
-- ===========================================================================


-- ===========================================================================
-- 0. 🚧 O PORTEIRO — RECUSA RODAR COM MÓDULO AINDA INSTALADO
-- ===========================================================================
--
-- 📖 POR QUE ISTO EXISTE (a armadilha, em 3 passos)
-- ---------------------------------------------------------------------------
-- 1. As tabelas de um módulo apontam para `tenants` e `users` por CHAVE
--    ESTRANGEIRA. A seção 2 deste arquivo faz `DROP TABLE ... CASCADE` nessas
--    duas tabelas.
-- 2. O `CASCADE` derruba, junto, TODAS essas chaves estrangeiras — **sem um
--    único aviso**. As tabelas do módulo SOBREVIVEM, agora sem as amarras que
--    garantiam que um lançamento pertence a uma empresa que existe.
-- 3. E reaplicar o schema do módulo **NÃO conserta**: ele começa com
--    `CREATE TABLE IF NOT EXISTS`, vê que a tabela existe e pula o bloco
--    inteiro — constraint nenhuma volta. O banco fica quebrado para sempre, e
--    nada na tela denuncia.
--
-- Até 16/09/2026 isso estava apenas DOCUMENTADO (no `CLAUDE.md` e no
-- `LEIA-ME-ORDEM.md`). Documento não impede ninguém de colar o arquivo errado
-- às 23h. Agora o banco impede.
--
-- 🧩 POR QUE ELE NÃO CITA O NOME DE NENHUM MÓDULO
-- ---------------------------------------------------------------------------
-- Este é um arquivo da PLATAFORMA, e a regra do LEGO (`MODULOS.md`) proíbe a
-- plataforma de conhecer o nome de uma peça fora dos 3 pontos de solda. Um
-- porteiro escrito como `IF to_regclass('public.fin_lancamentos') ...` seria
-- uma quarta solda clandestina — e, pior, ficaria cego para o SEGUNDO módulo.
--
-- Então ele não procura nomes. Ele procura **o dano**: alguma tabela que NÃO é
-- da plataforma tem chave estrangeira para uma tabela que este script vai
-- derrubar? Se tem, essa chave morreria no `CASCADE`. Isso vale para o módulo
-- de hoje, para os de amanhã e para qualquer tabela avulsa que alguém criou.
--
-- 🔓 COMO PASSAR PELO PORTEIRO (e nunca é apagando-o)
-- ---------------------------------------------------------------------------
--   • Caminho normal: rode o `<modulo>_00_reset.sql` de CADA módulo listado na
--     mensagem, e só então volte a este arquivo.
--   • Banco órfão (as tabelas ficaram, o código do módulo já não existe):
--     derrube-as à mão, uma vez, com `DROP TABLE public.<nome> CASCADE;`.
--
-- ===========================================================================
-- ⚠️ O `BEGIN;` ABAIXO É PARTE DO PORTEIRO — NÃO O REMOVA
-- ===========================================================================
-- Sem ele, o porteiro protege em alguns clientes e é INÚTIL noutros. Medido
-- nesta máquina, em PostgreSQL 18, em 17/09/2026:
--
--   • SQL Editor do Supabase (e qualquer cliente que mande o arquivo como UM
--     lote): o PostgreSQL embrulha o lote numa transação implícita, o erro do
--     porteiro aborta TUDO e nada é derrubado. ✅
--   • `psql -f arquivo.sql` SEM `-v ON_ERROR_STOP=1`: o psql manda uma
--     instrução por vez. Ele IMPRIME o erro do porteiro e **segue para a
--     instrução seguinte** — os `DROP TABLE` rodam, e o estrago acontece
--     inteiro, com o aviso do porteiro já rolado para fora da tela. ❌
--     (Foi exatamente o que aconteceu no teste: `users` e `tenants` caíram e
--     as 8 chaves estrangeiras do módulo foram destruídas.)
--
-- Com `BEGIN;` aqui e `COMMIT;` no fim, o caso ❌ deixa de existir: o erro
-- aborta a transação, e toda instrução seguinte é recusada com
-- "current transaction is aborted". Nada é derrubado em cliente nenhum.
--
-- 🎁 DE BRINDE, o reset ficou ATÔMICO: ou o banco inteiro volta ao estado
-- limpo, ou nada muda. Antes, uma falha no meio deixava metade derrubada.
BEGIN;

DO $porteiro$
DECLARE
  -- As 7 tabelas que ESTE arquivo derruba. É a mesma lista da seção 2, e as
  -- duas precisam andar juntas: tabela nova na seção 2 entra aqui também.
  v_da_plataforma text[] := ARRAY[
    'users', 'tenants', 'tenant_members', 'global_settings',
    'audit_log', 'platform_modules', 'tenant_modules'
  ];
  v_tabelas  text;
  v_catalogo text;
BEGIN
  -- ---------------------------------------------------------------------
  -- TRAVA 1 — chaves estrangeiras que o CASCADE destruiria em silêncio.
  -- ---------------------------------------------------------------------
  -- `filha` = a tabela que TEM a chave (a do módulo);
  -- `mae`   = a tabela apontada (a da plataforma, que vai cair).
  SELECT string_agg(DISTINCT filha.relname, ', ' ORDER BY filha.relname)
    INTO v_tabelas
    FROM pg_constraint k
    JOIN pg_class     filha ON filha.oid = k.conrelid
    JOIN pg_class     mae   ON mae.oid   = k.confrelid
    JOIN pg_namespace ns    ON ns.oid    = filha.relnamespace
   WHERE k.contype = 'f'
     AND ns.nspname = 'public'
     AND mae.relname   =  ANY(v_da_plataforma)
     AND filha.relname <> ALL(v_da_plataforma);

  IF v_tabelas IS NOT NULL THEN
    RAISE EXCEPTION
      'RESET RECUSADO: ha modulo instalado neste banco. Tabelas que perderiam as chaves estrangeiras em silencio: %. RODE O RESET DO MODULO PRIMEIRO (supabase/criar-bd-<modulo>/<modulo>_00_reset.sql) e so depois este arquivo.',
      v_tabelas
      USING
        ERRCODE = 'P0001',
        DETAIL  = 'O DROP TABLE ... CASCADE de tenants e users apagaria essas chaves estrangeiras sem aviso. As tabelas sobreviveriam sem amarras, e reaplicar o schema do modulo NAO as recria: o CREATE TABLE IF NOT EXISTS pula o bloco inteiro.',
        HINT    = 'Ver supabase/LEIA-ME-ORDEM.md. Se o codigo do modulo nao existe mais, derrube as tabelas listadas a mao (DROP TABLE public.<nome> CASCADE) antes de voltar aqui. NUNCA apague este porteiro.';
  END IF;

  -- ---------------------------------------------------------------------
  -- TRAVA 2 — o catálogo ainda tem módulo registrado.
  -- ---------------------------------------------------------------------
  -- Pega o caso em que as tabelas já saíram mas a linha do catálogo ficou (ou
  -- o módulo é só de leitura e não tem tabela com chave para a plataforma).
  -- Quem apaga essa linha é o reset do próprio módulo.
  --
  -- ⚠️ O `to_regclass` NÃO É ZELO EXCESSIVO: em banco novo e vazio a tabela
  -- `platform_modules` ainda não existe, e um SELECT direto derrubaria o
  -- arquivo justamente no caso em que ele é mais seguro de rodar.
  IF to_regclass('public.platform_modules') IS NOT NULL THEN
    SELECT string_agg(id, ', ' ORDER BY id) INTO v_catalogo
      FROM public.platform_modules;

    IF v_catalogo IS NOT NULL THEN
      RAISE EXCEPTION
        'RESET RECUSADO: o catalogo platform_modules ainda registra o(s) modulo(s): %. RODE O RESET DE CADA UM (supabase/criar-bd-<modulo>/<modulo>_00_reset.sql) e so depois este arquivo.',
        v_catalogo
        USING
          ERRCODE = 'P0001',
          DETAIL  = 'Quem apaga a linha do catalogo e o reset do proprio modulo. Enquanto ela estiver ai, ha modulo plugado.',
          HINT    = 'Ver supabase/LEIA-ME-ORDEM.md. NUNCA apague este porteiro.';
    END IF;
  END IF;

  RAISE NOTICE 'PORTEIRO OK: nenhum modulo instalado. O reset da plataforma pode seguir.';
END
$porteiro$;


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
-- nova do `public`. Foi por isso que o inventário de 2026-09-12 encontrou uma
-- função a MAIS do que as que o schema cria.
--
-- ⚠️ NUNCA "LIMPE" O SCHEMA COM UM LAÇO DO TIPO `DROP FUNCTION` EM TUDO O QUE
-- HÁ EM `pg_proc`. Além de derrubar essa rede de segurança, levaria junto as
-- funções das extensões (`uuid-ossp`, `unaccent`), que moram no `public` neste
-- banco. Este script derruba por NOME, um a um, de propósito.


-- ===========================================================================
-- 5. ✅ FECHAMENTO DA TRANSAÇÃO ABERTA NA SEÇÃO 0
-- ===========================================================================
-- ⚠️ ESTE `COMMIT;` É O PAR DO `BEGIN;` DA SEÇÃO 0 — NÃO O REMOVA.
-- Sem ele, num cliente que abre transação explícita nada é gravado (ou fica
-- uma transação pendurada). Com ele, o reset é tudo-ou-nada: se o porteiro
-- recusar, ou se qualquer DROP falhar, o banco fica exatamente como estava.
--
-- 🔎 COMO CONFERIR QUE DEU CERTO: depois de rodar este arquivo, a consulta
-- abaixo tem de devolver **0**. Se devolver mais que isso, algo não caiu.
--
--   SELECT count(*) FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename IN ('users','tenants','tenant_members','global_settings',
--                        'audit_log','platform_modules','tenant_modules');
COMMIT;
