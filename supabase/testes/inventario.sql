-- ===========================================================================
-- 🔎 INVENTÁRIO DO BANCO — PLATAFORMA JAIRO O D C v10
-- Local: supabase/testes/inventario.sql
-- ===========================================================================
--
-- PARA QUE SERVE: conferir, no banco de verdade, que o que está lá é o que o
-- `plataforma_01_schema.sql` manda estar. É o passo 3 do roteiro de recriação
-- ("Conferir: 7 tabelas, 25 funções, 12 policies, 15 triggers").
--
-- COMO USAR: cada bloco abaixo é INDEPENDENTE. Cole UM bloco por vez no SQL
-- Editor e execute. Todos devolvem LINHAS (nunca `RAISE NOTICE`, que o SQL
-- Editor descarta — a lição do degrau 4).
--
-- ⚠️ COMECE PELO BLOCO 1: ele já diz OK ou DIVERGE, sem você precisar contar
-- nada. Os blocos 2 a 7 são o detalhe, para investigar uma divergência ou para
-- mandar o retrato completo do banco.
--
-- ---------------------------------------------------------------------------
-- ⚠️ AS TRÊS ARMADILHAS QUE ESTE ARQUIVO EVITA (e que uma contagem ingênua não)
-- ---------------------------------------------------------------------------
--
-- 1. AS EXTENSÕES TRAZEM FUNÇÕES PARA O `public`. O schema faz
--    `CREATE EXTENSION uuid-ossp` e `unaccent` sem dizer em qual schema; elas
--    entram no `public` e levam consigo mais de dez funções
--    (`uuid_generate_v4`, `unaccent`, `unaccent_lexize`…). Contar tudo que há
--    em `pg_proc` daria ~38, não 25. O filtro `pg_depend.deptype = 'e'` remove
--    o que pertence a extensão e deixa só o que É NOSSO.
--
-- 2. O TESTE DEIXA UMA TABELA NO BANCO. O `teste_rls.sql` cria
--    `public.resultado_teste_rls` para poder mostrar o relatório, e ela fica lá
--    de propósito (para você reler o resultado depois). Contar tabelas sem
--    excluí-la dá 8, não 7.
--
-- 3. DOIS DOS QUINZE GATILHOS NÃO ESTÃO NO `public`. `on_auth_user_created` e
--    `on_auth_user_auto_confirm` vivem em `auth.users` — são eles que espelham
--    o perfil e confirmam o e-mail. Contar só `public` dá 13. E contar `auth`
--    inteiro pode dar MAIS de 15, porque o próprio Supabase põe gatilhos dele
--    ali; por isso o bloco 1 nomeia os dois que são nossos.
-- ===========================================================================


-- ===========================================================================
-- BLOCO 1 — O PLACAR. É este que responde ao passo 3 do roteiro.
-- Quatro linhas; todas têm de dizer OK.
-- ===========================================================================
-- ⚠️ ANTES DE COLAR, LIMPE O EDITOR (Ctrl+A e apague). O SQL Editor do Supabase
-- executa TODO o texto do painel: um resto da execução anterior colado junto
-- vira "syntax error" numa linha que parece ser deste comando e não é.
-- (Foi o que aconteceu em 12/09/2026: um trecho repetido do próprio comando
-- ficou grudado no fim e o erro apontou para o `WHERE` da linha 32.)
--
-- Esta versão é curta de propósito: sem `WITH` e sem `JOIN`, só subconsultas
-- que contam. Quanto menos linhas, menor a chance de sobrar pedaço.
SELECT x.objeto      AS "objeto",
       x.encontrado  AS "encontrado",
       x.esperado    AS "esperado",
       CASE WHEN x.encontrado = x.esperado THEN 'OK' ELSE 'DIVERGE' END AS "veredito"
  FROM (
    SELECT '1. tabelas'::text AS objeto,
           (SELECT count(*)::int
              FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_type = 'BASE TABLE'
               AND table_name <> 'resultado_teste_rls') AS encontrado,
           7 AS esperado
    UNION ALL
    SELECT '2. funcoes',
           (SELECT count(*)::int
              FROM pg_proc p
              JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public'
               AND NOT EXISTS (SELECT 1 FROM pg_depend d
                                WHERE d.objid = p.oid AND d.deptype = 'e')),
           25
    UNION ALL
    SELECT '3. policies',
           (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public'),
           12
    UNION ALL
    SELECT '4. triggers',
           (SELECT count(*)::int
              FROM pg_trigger t
              JOIN pg_class c     ON c.oid = t.tgrelid
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE NOT t.tgisinternal
               AND (n.nspname = 'public'
                    OR t.tgname IN ('on_auth_user_created', 'on_auth_user_auto_confirm'))),
           15
  ) x
 ORDER BY x.objeto;


-- ===========================================================================
-- BLOCO 2 — AS TABELAS, uma linha por tabela, com RLS e nº de colunas.
-- ⚠️ `rls_ligada` TEM DE SER `true` EM TODAS. Uma tabela sem RLS no `public`
-- é lida pela API pública por qualquer pessoa com a chave anônima.
-- ===========================================================================
-- SELECT c.relname                                   AS "tabela",
--        c.relrowsecurity                            AS "rls_ligada",
--        (SELECT count(*) FROM information_schema.columns col
--          WHERE col.table_schema = 'public' AND col.table_name = c.relname) AS "colunas",
--        (SELECT count(*) FROM pg_policies pol
--          WHERE pol.schemaname = 'public' AND pol.tablename = c.relname)    AS "policies",
--        obj_description(c.oid)                      AS "comentario"
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public' AND c.relkind = 'r'
--  ORDER BY c.relname;


-- ===========================================================================
-- BLOCO 3 — AS COLUNAS (o seu comando original, corrigido).
--
-- ⚠️ O QUE MUDOU EM RELAÇÃO AO SEU: (a) o `ORDER BY` saiu de dentro da
-- subconsulta — num `jsonb_agg` a ordem de dentro não é garantida, então ela
-- passou a ser argumento do próprio agregado; (b) `auth` traz só `users` e
-- `identities`, como você já fazia; (c) a tabela de resultado do teste fica
-- fora.
-- ===========================================================================
-- SELECT jsonb_pretty(
--          jsonb_agg(
--            jsonb_build_object(
--              'esquema',      table_schema,
--              'tabela',       table_name,
--              'coluna',       column_name,
--              'tipo_dado',    data_type,
--              'permite_nulo', is_nullable,
--              'valor_padrao', column_default
--            )
--            ORDER BY table_schema, table_name, ordinal_position
--          )
--        ) AS esquema_completo
--   FROM information_schema.columns
--  WHERE table_schema IN ('public', 'auth')
--    AND (table_schema = 'public' OR table_name IN ('users', 'identities'))
--    AND table_name <> 'resultado_teste_rls';


-- ===========================================================================
-- BLOCO 4 — AS FUNÇÕES: assinatura, se é SECURITY DEFINER e quem pode chamar.
--
-- ⚠️ `security_definer = true` + `pode_chamar` contendo `authenticated` é a
-- combinação das funções `admin_*`: elas rodam com poder de dono do banco, e é
-- por isso que TODAS conferem `is_superuser()` na primeira linha do corpo.
-- ===========================================================================
-- SELECT p.proname                                   AS "funcao",
--        pg_get_function_identity_arguments(p.oid)   AS "argumentos",
--        p.prosecdef                                 AS "security_definer",
--        CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE'
--                           WHEN 's' THEN 'STABLE'
--                           ELSE 'VOLATILE' END      AS "volatilidade",
--        COALESCE(
--          (SELECT string_agg(DISTINCT g.grantee, ', ')
--             FROM information_schema.routine_privileges g
--            WHERE g.specific_schema = 'public'
--              AND g.routine_name = p.proname
--              AND g.grantee IN ('anon', 'authenticated', 'service_role')),
--          '(ninguém pela API)'
--        )                                           AS "pode_chamar"
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public'
--    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
--  ORDER BY p.proname;


-- ===========================================================================
-- BLOCO 5 — AS POLICIES: tabela, comando, PARA QUEM e a expressão.
--
-- ⚠️ A COLUNA `para_quem` NÃO PODE DIZER `{public}` EM NENHUMA LINHA. Policy
-- sem cláusula `TO` vale para PUBLIC — foi assim que a lista de usuários ficou
-- aberta até a v9. Todas as 12 devem dizer `{authenticated}`.
-- ===========================================================================
-- SELECT tablename    AS "tabela",
--        policyname   AS "policy",
--        cmd          AS "comando",
--        roles        AS "para_quem",
--        qual         AS "condicao_leitura",
--        with_check   AS "condicao_escrita"
--   FROM pg_policies
--  WHERE schemaname = 'public'
--  ORDER BY tablename, cmd, policyname;


-- ===========================================================================
-- BLOCO 6 — OS GATILHOS: onde, quando e qual função.
-- Os 15 nossos, mais os do próprio Supabase em `auth` (que aparecem aqui para
-- você ver a diferença — eles não entram na contagem do bloco 1).
-- ===========================================================================
-- SELECT n.nspname                                   AS "esquema",
--        c.relname                                   AS "tabela",
--        t.tgname                                    AS "gatilho",
--        CASE WHEN (t.tgtype & 2) > 0 THEN 'BEFORE' ELSE 'AFTER' END AS "quando",
--        concat_ws(' ou ',
--          CASE WHEN (t.tgtype &  4) > 0 THEN 'INSERT' END,
--          CASE WHEN (t.tgtype &  8) > 0 THEN 'DELETE' END,
--          CASE WHEN (t.tgtype & 16) > 0 THEN 'UPDATE' END
--        )                                           AS "evento",
--        p.proname                                   AS "funcao"
--   FROM pg_trigger t
--   JOIN pg_class c     ON c.oid = t.tgrelid
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   JOIN pg_proc p      ON p.oid = t.tgfoid
--  WHERE NOT t.tgisinternal
--    AND n.nspname IN ('public', 'auth')
--  ORDER BY n.nspname, c.relname, t.tgname;


-- ===========================================================================
-- BLOCO 7 — OS PRIVILÉGIOS: a segunda tranca (a que não é RLS).
--
-- ⚠️ É AQUI QUE SE VÊ A TRAVA DO `is_superuser`. A linha de UPDATE em `users`
-- tem de listar SÓ: full_name, planet, country, state, city, profile_completed.
-- Se aparecer `role` ou `is_superuser` nessa lista, qualquer usuário logado se
-- promove a Desenvolvedor pela API — e a RLS não impede, porque ela decide
-- QUAIS LINHAS, não QUAIS COLUNAS.
-- ===========================================================================
-- SELECT t.table_name                                AS "tabela",
--        t.privilege_type                            AS "privilegio",
--        t.grantee                                   AS "papel",
--        COALESCE(
--          (SELECT string_agg(c.column_name, ', ' ORDER BY c.column_name)
--             FROM information_schema.column_privileges c
--            WHERE c.table_schema = 'public'
--              AND c.table_name = t.table_name
--              AND c.grantee = t.grantee
--              AND c.privilege_type = t.privilege_type),
--          '(tabela inteira)'
--        )                                           AS "colunas"
--   FROM information_schema.table_privileges t
--  WHERE t.table_schema = 'public'
--    AND t.grantee IN ('anon', 'authenticated')
--    AND t.table_name <> 'resultado_teste_rls'
--  ORDER BY t.table_name, t.grantee, t.privilege_type;


-- ===========================================================================
-- BLOCO 8 — O SOQUETE DOS MÓDULOS (v10 — degrau 5).
-- Com zero módulos plugados, as duas consultas devolvem ZERO LINHAS — e isso
-- é o estado correto de hoje, não um defeito.
-- ===========================================================================
-- SELECT id AS "modulo", nome, descricao, is_active AS "ativo", created_at
--   FROM public.platform_modules
--  ORDER BY nome;

-- SELECT t.tenant_name  AS "empresa",
--        tm.module_id   AS "modulo",
--        tm.is_active   AS "contratado",
--        tm.updated_at  AS "desde"
--   FROM public.tenant_modules tm
--   JOIN public.tenants t ON t.id = tm.tenant_id
--  ORDER BY t.tenant_name, tm.module_id;
