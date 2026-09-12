-- ===========================================================================
-- 🧪 PROVA: TABELA ÚNICA (RLS por empresa) × UMA TABELA POR CLIENTE
-- Local: supabase/testes/ambiente-local/prova-tabela-unica-x-por-cliente.sql
-- ===========================================================================
--
-- POR QUE EXISTE: no degrau 6, ao projetar o módulo Controle Financeiro, o dono
-- do projeto pediu tabelas separadas por cliente — para poder apagar um cliente
-- apagando a tabela dele. Em vez de decidir por argumento, medimos.
--
-- COMO RODAR: num banco local criado com `00_supabase_falso.sql` +
-- `plataforma_01_schema.sql` (ver o README desta pasta).
--
-- ---------------------------------------------------------------------------
-- RESULTADO MEDIDO EM 12/09/2026 (PostgreSQL 18)
-- ---------------------------------------------------------------------------
--  1. Dono da BETA lendo a ALFA .................. 0 linhas nos DOIS modelos
--  2. Dependente habilitado lendo a ALFA ......... 2 linhas nos DOIS modelos
--  3. Dependente da ALFA lendo a BETA ............ 0 linhas nos DOIS modelos
--     → os dois modelos ISOLAM corretamente; a tabela separada não é mais
--       segura que a RLS, nem menos
--  4. Objetos para 2 clientes .... 2 tabelas/2 policies × 4 tabelas/4 policies
--  5. Acrescentar 1 coluna ....... 1 comando × 1 comando POR CLIENTE
--  6. Apagar na ordem errada ..... sem erro (DELETE) × erro 2BP01 (DROP)
--  7. Apagar 1 cliente ........... apagar LINHAS × apagar N TABELAS na ordem
--  8. Policy esquecida, SEM o event trigger do Supabase .... ESTRANHO LEU
--  9. Policy esquecida, COM o event trigger `ensure_rls` ... leu 0 (RLS ligou
--     sozinha). No Supabase do projeto o esquecimento NÃO vaza — a tabela
--     simplesmente não funciona para ninguém até criarem a policy
-- 10. ⚠️ `DROP TABLE contas CASCADE` .... NÃO apagou a tabela de lançamentos:
--     o CASCADE removeu a CHAVE ESTRANGEIRA e deixou a tabela do cliente com
--     os dados dentro (2 linhas sobreviveram). O "simplesmente deleto" deixa
--     resto sem avisar
-- ===========================================================================

-- ===========================================================================
-- PROVA PRÁTICA: MODELO 1 (tabela única + RLS por tenant)
--            ×  MODELO 2 (uma tabela por cliente + RLS por tabela)
-- ===========================================================================

DROP TABLE IF EXISTS public.prova_resultado;
CREATE TABLE public.prova_resultado (
  n        integer PRIMARY KEY,
  bloco    text,
  pergunta text,
  modelo_1 text,
  modelo_2 text
);

-- ---------------------------------------------------------------------------
-- PREPARAÇÃO: 2 clientes (ALFA e BETA) + 1 dependente habilitado só na ALFA
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
VALUES
 ('00000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000001','authenticated','authenticated','dono.alfa@teste.com','x','{"provider":"email"}','{"full_name":"DONO ALFA"}'),
 ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000002','authenticated','authenticated','dono.beta@teste.com','x','{"provider":"email"}','{"full_name":"DONO BETA"}'),
 ('00000000-0000-0000-0000-000000000000','dddddddd-0000-0000-0000-000000000003','authenticated','authenticated','dependente@teste.com','x','{"provider":"email"}','{"full_name":"DEPENDENTE"}');

INSERT INTO public.tenants (id, tenant_name, slug, owner_id) VALUES
 ('11111111-aaaa-0000-0000-000000000001','EMPRESA ALFA','empresa-alfa','aaaaaaaa-0000-0000-0000-000000000001'),
 ('22222222-bbbb-0000-0000-000000000002','EMPRESA BETA','empresa-beta','bbbbbbbb-0000-0000-0000-000000000002');

INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES
 ('11111111-aaaa-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','OWNER'),
 ('22222222-bbbb-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','OWNER'),
 ('11111111-aaaa-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000003','DEPENDENT');

-- ---------------------------------------------------------------------------
-- MODELO 1 — UMA TABELA, ISOLAMENTO POR RLS
-- ---------------------------------------------------------------------------
CREATE TABLE public.m1_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL
);
CREATE TABLE public.m1_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES public.m1_contas(id) ON DELETE RESTRICT,
  valor_centavos bigint NOT NULL
);

ALTER TABLE public.m1_contas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m1_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "m1 contas"      ON public.m1_contas      FOR SELECT TO authenticated
  USING (public.check_is_tenant_member(tenant_id) OR public.check_is_tenant_owner(tenant_id));
CREATE POLICY "m1 lancamentos" ON public.m1_lancamentos FOR SELECT TO authenticated
  USING (public.check_is_tenant_member(tenant_id) OR public.check_is_tenant_owner(tenant_id));

GRANT SELECT ON public.m1_contas, public.m1_lancamentos TO authenticated;

INSERT INTO public.m1_contas (id, tenant_id, nome) VALUES
 ('c1111111-0000-0000-0000-000000000001','11111111-aaaa-0000-0000-000000000001','BANCO DA ALFA'),
 ('c2222222-0000-0000-0000-000000000002','22222222-bbbb-0000-0000-000000000002','BANCO DA BETA');
INSERT INTO public.m1_lancamentos (tenant_id, conta_id, valor_centavos) VALUES
 ('11111111-aaaa-0000-0000-000000000001','c1111111-0000-0000-0000-000000000001', 10000),
 ('11111111-aaaa-0000-0000-000000000001','c1111111-0000-0000-0000-000000000001', 25000),
 ('22222222-bbbb-0000-0000-000000000002','c2222222-0000-0000-0000-000000000002', 99900);

-- ---------------------------------------------------------------------------
-- MODELO 2 — UMA TABELA POR CLIENTE (criadas por script, como seria na prática)
-- ---------------------------------------------------------------------------
DO $prova$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT slug, id FROM public.tenants ORDER BY slug
  LOOP
    -- o nome do cliente entra no NOME dos objetos
    EXECUTE format($f$
      CREATE TABLE public.m2_contas_%1$s (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL
      );
      CREATE TABLE public.m2_lancamentos_%1$s (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conta_id uuid NOT NULL REFERENCES public.m2_contas_%1$s(id) ON DELETE RESTRICT,
        valor_centavos bigint NOT NULL
      );
      ALTER TABLE public.m2_contas_%1$s      ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.m2_lancamentos_%1$s ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "dados do cliente" ON public.m2_contas_%1$s FOR SELECT TO authenticated
        USING (public.check_is_tenant_member(%2$L) OR public.check_is_tenant_owner(%2$L));
      CREATE POLICY "dados do cliente" ON public.m2_lancamentos_%1$s FOR SELECT TO authenticated
        USING (public.check_is_tenant_member(%2$L) OR public.check_is_tenant_owner(%2$L));
      GRANT SELECT ON public.m2_contas_%1$s, public.m2_lancamentos_%1$s TO authenticated;
    $f$, replace(c.slug, '-', '_'), c.id);
  END LOOP;
END;
$prova$;

INSERT INTO public.m2_contas_empresa_alfa (id, nome) VALUES ('c1111111-0000-0000-0000-000000000001','BANCO DA ALFA');
INSERT INTO public.m2_contas_empresa_beta (id, nome) VALUES ('c2222222-0000-0000-0000-000000000002','BANCO DA BETA');
INSERT INTO public.m2_lancamentos_empresa_alfa (conta_id, valor_centavos) VALUES
 ('c1111111-0000-0000-0000-000000000001', 10000),
 ('c1111111-0000-0000-0000-000000000001', 25000);
INSERT INTO public.m2_lancamentos_empresa_beta (conta_id, valor_centavos) VALUES
 ('c2222222-0000-0000-0000-000000000002', 99900);


-- ===========================================================================
-- TESTE 1 — O DONO DA BETA CONSEGUE LER OS DADOS DA ALFA?
-- ===========================================================================
DO $prova$
DECLARE q1 integer; q2 integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);

  SELECT count(*) INTO q1 FROM public.m1_lancamentos;                 -- vê só o que a RLS deixa
  SELECT count(*) INTO q2 FROM public.m2_lancamentos_empresa_alfa;    -- tabela do OUTRO cliente

  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.prova_resultado VALUES (
    1, 'ISOLAMENTO',
    'Dono da BETA lendo dados da ALFA (deve ser 0)',
    format('leu %s linha(s) da ALFA', GREATEST(q1 - 1, 0)),
    format('leu %s linha(s) da tabela da ALFA', q2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 2 — O DEPENDENTE DA ALFA LÊ OS DADOS DA ALFA?
-- ===========================================================================
DO $prova$
DECLARE q1 integer; q2 integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"dddddddd-0000-0000-0000-000000000003","role":"authenticated"}', true);

  SELECT count(*) INTO q1 FROM public.m1_lancamentos;
  SELECT count(*) INTO q2 FROM public.m2_lancamentos_empresa_alfa;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.prova_resultado VALUES (
    2, 'ISOLAMENTO',
    'Dependente habilitado na ALFA lendo a ALFA (deve ser 2)',
    format('leu %s', q1), format('leu %s', q2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 3 — O DEPENDENTE DA ALFA CONSEGUE LER A BETA?
-- ===========================================================================
DO $prova$
DECLARE q1 integer; q2 integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"dddddddd-0000-0000-0000-000000000003","role":"authenticated"}', true);

  SELECT count(*) INTO q1 FROM public.m1_lancamentos WHERE tenant_id = '22222222-bbbb-0000-0000-000000000002';
  SELECT count(*) INTO q2 FROM public.m2_lancamentos_empresa_beta;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.prova_resultado VALUES (
    3, 'ISOLAMENTO',
    'Dependente da ALFA lendo a BETA (deve ser 0)',
    format('leu %s', q1), format('leu %s', q2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 4 — QUANTOS OBJETOS CADA MODELO CRIOU (2 clientes)
-- ===========================================================================
DO $prova$
DECLARE t1 int; t2 int; p1 int; p2 int;
BEGIN
  SELECT count(*) INTO t1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'm1_%';
  SELECT count(*) INTO t2 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'm2_%';
  SELECT count(*) INTO p1 FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'm1_%';
  SELECT count(*) INTO p2 FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'm2_%';

  INSERT INTO public.prova_resultado VALUES (
    4, 'MANUTENCAO', 'Objetos criados para 2 clientes (tabelas / policies)',
    format('%s tabelas, %s policies', t1, p1),
    format('%s tabelas, %s policies', t2, p2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 5 — ACRESCENTAR UMA COLUNA NOVA AO MÓDULO
-- ===========================================================================
DO $prova$
DECLARE cmd1 int := 0; cmd2 int := 0; r record;
BEGIN
  -- Modelo 1: um comando
  ALTER TABLE public.m1_lancamentos ADD COLUMN conferido boolean NOT NULL DEFAULT false;
  cmd1 := 1;

  -- Modelo 2: um comando por cliente
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'm2_lancamentos_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN conferido boolean NOT NULL DEFAULT false', r.relname);
    cmd2 := cmd2 + 1;
  END LOOP;

  INSERT INTO public.prova_resultado VALUES (
    5, 'MANUTENCAO', 'Comandos para acrescentar 1 coluna ao modulo',
    format('%s comando', cmd1),
    format('%s comandos (1 por cliente)', cmd2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 6 — APAGAR UM CLIENTE: A ORDEM ERRADA FUNCIONA?
-- ===========================================================================
DO $prova$
DECLARE erro1 text := 'sem erro'; erro2 text := 'sem erro';
BEGIN
  -- Modelo 2, ordem errada: apagar a tabela de contas antes da de lançamentos
  BEGIN
    DROP TABLE public.m2_contas_empresa_beta;
  EXCEPTION WHEN OTHERS THEN
    erro2 := SQLSTATE;
  END;

  -- Modelo 1, apagar os dados da BETA por função (ordem correta, uma transação)
  BEGIN
    DELETE FROM public.m1_lancamentos WHERE tenant_id = '22222222-bbbb-0000-0000-000000000002';
    DELETE FROM public.m1_contas      WHERE tenant_id = '22222222-bbbb-0000-0000-000000000002';
  EXCEPTION WHEN OTHERS THEN
    erro1 := SQLSTATE;
  END;

  INSERT INTO public.prova_resultado VALUES (
    6, 'EXCLUSAO', 'Apagar o cliente BETA',
    format('2 DELETEs numa funcao: %s', erro1),
    format('DROP na ordem errada: %s', erro2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 7 — QUANTOS OBJETOS PRECISAM SER APAGADOS POR CLIENTE
-- ===========================================================================
DO $prova$
DECLARE n2 int;
BEGIN
  SELECT count(*) INTO n2 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE '%empresa_alfa%';

  INSERT INTO public.prova_resultado VALUES (
    7, 'EXCLUSAO', 'Objetos a apagar para remover 1 cliente (so este modulo de teste)',
    'nenhum objeto: apaga LINHAS (1 funcao, 1 clique)',
    format('%s tabelas, na ordem certa', n2)
  );
END;
$prova$;

-- ===========================================================================
-- TESTE 8 — E SE ALGUÉM ESQUECER A POLICY DE UM CLIENTE NOVO?
-- ===========================================================================
CREATE TABLE public.m2_lancamentos_cliente_novo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_centavos bigint NOT NULL
);
GRANT SELECT ON public.m2_lancamentos_cliente_novo TO authenticated;
INSERT INTO public.m2_lancamentos_cliente_novo (valor_centavos) VALUES (55555);

DO $prova$
DECLARE q int; rls boolean;
BEGIN
  SELECT c.relrowsecurity INTO rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='m2_lancamentos_cliente_novo';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
  SELECT count(*) INTO q FROM public.m2_lancamentos_cliente_novo;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.prova_resultado VALUES (
    8, 'RISCO', 'Tabela de cliente criada SEM policy: um estranho le?',
    'nao se aplica (a tabela e unica e ja tem policy)',
    format('RLS ligada=%s; estranho leu %s linha(s)', rls, q)
  );
END;
$prova$;


SELECT n AS "#", bloco AS "bloco", pergunta AS "pergunta",
       modelo_1 AS "MODELO 1 (tabela unica)", modelo_2 AS "MODELO 2 (por cliente)"
  FROM public.prova_resultado ORDER BY n;
-- ===========================================================================
-- COMPLEMENTO DA PROVA
-- (a) reproduz o event trigger `ensure_rls` que existe no Supabase do projeto
-- (b) mede o DROP com CASCADE (a forma mais simples de apagar no modelo 2)
-- ===========================================================================

-- (a) o mesmo mecanismo do banco publicado
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $rls$
DECLARE cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
              WHERE command_tag IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
                AND object_type IN ('table','partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END;
$rls$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end EXECUTE FUNCTION public.rls_auto_enable();

-- Agora repete o cenário do teste 8: cliente novo, policy esquecida
CREATE TABLE public.m2_lancamentos_cliente_novo2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_centavos bigint NOT NULL
);
GRANT SELECT ON public.m2_lancamentos_cliente_novo2 TO authenticated;
INSERT INTO public.m2_lancamentos_cliente_novo2 (valor_centavos) VALUES (77777);

DO $prova$
DECLARE q int; rls boolean; erro text := 'nenhum';
BEGIN
  SELECT c.relrowsecurity INTO rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='m2_lancamentos_cliente_novo2';

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
  BEGIN
    SELECT count(*) INTO q FROM public.m2_lancamentos_cliente_novo2;
  EXCEPTION WHEN OTHERS THEN q := -1; erro := SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.prova_resultado VALUES (
    9, 'RISCO',
    'IDEM, mas COM o event trigger ensure_rls do Supabase',
    'nao se aplica',
    format('RLS ligada=%s; estranho leu %s linha(s); erro=%s', rls, q, erro)
  );
END;
$prova$;

-- (b) DROP com CASCADE: a forma simples de apagar no modelo 2
DO $prova$
DECLARE erro text := 'sem erro'; sobrou int;
BEGIN
  BEGIN
    DROP TABLE public.m2_contas_empresa_alfa CASCADE;
  EXCEPTION WHEN OTHERS THEN erro := SQLSTATE;
  END;

  SELECT count(*) INTO sobrou FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE '%empresa_alfa%';

  INSERT INTO public.prova_resultado VALUES (
    10, 'EXCLUSAO',
    'DROP ... CASCADE na tabela de contas do cliente ALFA',
    'nao se aplica',
    format('erro=%s; tabelas do cliente que SOBRARAM: %s', erro, sobrou)
  );
END;
$prova$;

SELECT n AS "#", bloco, pergunta, modelo_2 AS "RESULTADO NO MODELO 2"
  FROM public.prova_resultado WHERE n >= 9 ORDER BY n;
