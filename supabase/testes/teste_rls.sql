-- ===========================================================================
-- 🧪 TESTE DAS TRAVAS DE ACESSO — PLATAFORMA JAIRO O D C v10
-- Local: supabase/testes/teste_rls.sql
-- ===========================================================================
--
-- PARA QUE SERVE: provar, dentro do banco de verdade, que as correções de
-- segurança do degrau 3 funcionam. Cada bloco imprime PASSOU ou FALHOU.
--
-- COMO RODAR:
--   1. Abra o SQL Editor do Supabase (ou o `psql` do projeto local).
--   2. Cole este arquivo INTEIRO e execute.
--   3. Leia as mensagens: todas devem dizer "PASSOU".
--
-- ⚠️ ELE NÃO DEIXA RASTRO. Tudo roda dentro de uma transação que termina em
-- ROLLBACK: os três usuários de teste somem no fim. Ainda assim, rode em
-- ambiente de desenvolvimento — a decisão do dono do projeto (2026-09-11) é que
-- não há dados reais nesta fase.
--
-- ⚠️ POR QUE SIMULAR O LOGIN COM `set local role` E `request.jwt.claims`:
-- é assim que o PostgREST (a API do Supabase) apresenta o usuário ao banco.
-- `auth.uid()` lê exatamente esse parâmetro. Sem isso, tudo rodaria como o dono
-- do banco, que ignora a RLS — e o teste não provaria nada.
--
-- O QUE CADA TESTE VERIFICA:
--   1. Visitante anônimo NÃO lê a tabela de usuários          (correção S1)
--   2. Usuário comum vê só o próprio perfil                   (correção S1)
--   3. Usuário comum NÃO consegue virar Desenvolvedor         (correção S2)
--   4. Usuário comum NÃO consegue criar empresa               (correção S3)
--   5. Usuário comum NÃO executa função administrativa        (correção S4)
--   6. Desenvolvedor cria empresa pela função transacional    (correção C2)
--   7. A data gravada é a hora real, sem as 3 horas a menos   (correção C1)
--   8. `allowed_modules` é lista de verdade                   (correção C3)
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- PREPARAÇÃO: três contas de teste.
-- O INSERT em auth.users dispara os gatilhos e cria os perfis em public.users.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    (v_instance, '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'teste.comum@exemplo.com',  'x', now(), now(), '{"provider":"email"}', '{"full_name":"USUARIO COMUM","role":"active"}'),
    (v_instance, '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'teste.dev@exemplo.com',    'x', now(), now(), '{"provider":"email"}', '{"full_name":"DESENVOLVEDOR TESTE"}'),
    (v_instance, '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'teste.outro@exemplo.com',  'x', now(), now(), '{"provider":"email"}', '{"full_name":"OUTRO USUARIO"}');
END;
$$;

-- O Desenvolvedor de teste. (No banco de verdade, este passo é o do seed.)
UPDATE public.users SET is_superuser = true WHERE id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- TESTE 0 — o gatilho ignora o `role` enviado no cadastro (correção S9)
-- O usuário comum pediu `"role":"active"` no metadata; tem de nascer 'pending'.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111';
  IF v_role = 'pending' THEN
    RAISE NOTICE 'PASSOU  0 — cadastro não escolhe o próprio papel (nasceu %)', v_role;
  ELSE
    RAISE WARNING 'FALHOU  0 — nasceu com role=% (esperado pending)', v_role;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 1 — visitante anônimo NÃO lê a lista de usuários (S1)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_qtd integer;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO v_qtd FROM public.users;
  EXCEPTION WHEN insufficient_privilege THEN
    v_qtd := -1;  -- sem nem permissão de tabela: melhor ainda
  END;
  RESET ROLE;

  IF v_qtd <= 0 THEN
    RAISE NOTICE 'PASSOU  1 — anônimo não enxerga usuários (retorno %)', v_qtd;
  ELSE
    RAISE WARNING 'FALHOU  1 — anônimo leu % linhas de public.users', v_qtd;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 2 — usuário comum vê só o próprio perfil (S1)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_qtd integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  SELECT count(*) INTO v_qtd FROM public.users;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_qtd = 1 THEN
    RAISE NOTICE 'PASSOU  2 — usuário comum vê 1 perfil (o próprio)';
  ELSE
    RAISE WARNING 'FALHOU  2 — usuário comum viu % perfis (esperado 1)', v_qtd;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 3 — usuário comum NÃO consegue se tornar Desenvolvedor (S2)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_erro text := 'nenhum';
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  BEGIN
    UPDATE public.users SET is_superuser = true WHERE id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_erro <> 'nenhum' THEN
    RAISE NOTICE 'PASSOU  3 — escrita em is_superuser recusada (SQLSTATE %)', v_erro;
  ELSE
    RAISE WARNING 'FALHOU  3 — o usuário conseguiu gravar is_superuser';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 4 — usuário comum NÃO consegue criar a própria empresa (S3)
-- Esta é a validação que faltava: na v9, o INSERT abaixo PASSAVA.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_erro text := 'nenhum';
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  BEGIN
    INSERT INTO public.tenants (tenant_name, slug, owner_id, is_active)
    VALUES ('EMPRESA PIRATA', 'empresa-pirata', '11111111-1111-1111-1111-111111111111', true);
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_erro <> 'nenhum' THEN
    RAISE NOTICE 'PASSOU  4 — criação de empresa pelo cliente recusada (SQLSTATE %)', v_erro;
  ELSE
    RAISE WARNING 'FALHOU  4 — o usuário criou a própria empresa e pularia a triagem';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 5 — usuário comum NÃO executa função administrativa (S4)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_erro text := 'nenhum';
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  BEGIN
    PERFORM public.admin_list_users();
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_erro <> 'nenhum' THEN
    RAISE NOTICE 'PASSOU  5 — admin_list_users recusada para usuário comum (SQLSTATE %)', v_erro;
  ELSE
    RAISE WARNING 'FALHOU  5 — usuário comum listou todos os usuários';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 6 — o Desenvolvedor cria empresa pela função transacional (C2)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_resultado json;
  v_role text;
  v_empresas integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

  v_resultado := public.admin_sync_user_tenants(
    '11111111-1111-1111-1111-111111111111',
    '[{"tenant_id": null, "name": "EMPRESA DE TESTE", "is_active": true}]'::jsonb,
    '{}'::uuid[]
  );

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT role INTO v_role FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT count(*) INTO v_empresas FROM public.tenants WHERE owner_id = '11111111-1111-1111-1111-111111111111';

  IF (v_resultado->>'success')::boolean AND v_role = 'active' AND v_empresas = 1 THEN
    RAISE NOTICE 'PASSOU  6 — Desenvolvedor criou a empresa e o papel virou active';
  ELSE
    RAISE WARNING 'FALHOU  6 — retorno=%, role=%, empresas=%', v_resultado, v_role, v_empresas;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 7 — a data gravada é a hora real (C1)
-- Na v9 a diferença era de ~3 horas para trás.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_diferenca interval;
BEGIN
  SELECT now() - created_at INTO v_diferenca
    FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111'
   LIMIT 1;

  IF v_diferenca < interval '1 minute' THEN
    RAISE NOTICE 'PASSOU  7 — created_at bate com o relógio (diferença %)', v_diferenca;
  ELSE
    RAISE WARNING 'FALHOU  7 — created_at está % atrás do horário real', v_diferenca;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 8 — `allowed_modules` é lista de verdade (C3)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_tipo text;
BEGIN
  SELECT data_type INTO v_tipo
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tenant_members' AND column_name = 'allowed_modules';

  IF v_tipo = 'ARRAY' THEN
    RAISE NOTICE 'PASSOU  8 — allowed_modules é ARRAY (text[])';
  ELSE
    RAISE WARNING 'FALHOU  8 — allowed_modules é % (esperado ARRAY)', v_tipo;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- TESTE 9 — a trilha de auditoria registrou as mudanças (B4)
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_linhas integer;
BEGIN
  SELECT count(*) INTO v_linhas FROM public.audit_log WHERE tabela = 'tenants';
  IF v_linhas > 0 THEN
    RAISE NOTICE 'PASSOU  9 — auditoria gravou % evento(s) de empresa', v_linhas;
  ELSE
    RAISE WARNING 'FALHOU  9 — nenhum evento de auditoria para tenants';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- FIM: desfaz tudo. Nenhum usuário ou empresa de teste sobrevive.
-- ---------------------------------------------------------------------------
ROLLBACK;
