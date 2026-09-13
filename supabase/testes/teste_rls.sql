-- ===========================================================================
-- 🧪 TESTE DAS TRAVAS DE ACESSO — PLATAFORMA JAIRO O D C v10
-- Local: supabase/testes/teste_rls.sql
-- ===========================================================================
--
-- PARA QUE SERVE: provar, dentro do banco de verdade, que as correções de
-- segurança do degrau 3 funcionam. No fim, o script DEVOLVE UMA TABELA com uma
-- linha por teste, dizendo PASSOU ou FALHOU.
--
-- COMO RODAR:
--   1. Abra o SQL Editor do Supabase.
--   2. Cole este arquivo INTEIRO e execute.
--   3. Leia a tabela que aparece embaixo: a coluna `veredito` tem de dizer
--      "PASSOU" nas 14 linhas. O botão de exportar volta a funcionar, porque
--      agora há linhas de verdade.
--
-- ⚠️ A VERSÃO ANTERIOR DESTE ARQUIVO NÃO MOSTRAVA NADA NO SUPABASE, e a falha
-- era invisível: ela reportava por `RAISE NOTICE`, e o SQL Editor do Supabase
-- **descarta as mensagens do servidor** — só exibe conjuntos de linhas. O
-- resultado era um "Success. No rows returned" que parecia aprovação e não era:
-- os dez vereditos tinham sido jogados fora. `NOTICE` só aparece no `psql`.
-- Lição geral: no SQL Editor, teste que não faz SELECT não comunica nada.
--
-- ⚠️ POR QUE NÃO HÁ MAIS `BEGIN … ROLLBACK`. O desfazer era elegante e tornava
-- o relatório impossível: o `ROLLBACK` apagaria junto as linhas de resultado —
-- tabela temporária e `SET` de sessão também voltam atrás, então não há onde
-- guardar o veredito dentro de uma transação que será desfeita. Em troca, a
-- limpeza virou explícita: roda no INÍCIO e no FIM, é idempotente, e remove os
-- três usuários de teste, as empresas que eles criaram e o rastro disso em
-- `audit_log`. Reexecutar o arquivo é seguro.
--
-- ⚠️ PARA "SAIR DA SESSÃO" O TESTE GRAVA `{}`, NÃO STRING VAZIA. Foi uma lição
-- de 12/09/2026, ao rodar este arquivo num PostgreSQL puro: a `auth.uid()` do
-- Supabase é escrita com `nullif(..., '')` ANTES do cast, e por isso tolera
-- `request.jwt.claims = ''`. Uma implementação que faça `''::json` direto
-- estoura com "input string ended unexpectedly" — e o erro aparece DENTRO do
-- gatilho de auditoria, no meio de um INSERT que nada tem a ver com isso.
-- Gravar `{}` é um JSON válido sem `sub`: `auth.uid()` devolve NULL em
-- qualquer implementação, e o teste deixa de depender dessa sutileza.
--
-- ⚠️ POR QUE SIMULAR O LOGIN COM `set local role` E `request.jwt.claims`:
-- é assim que o PostgREST (a API do Supabase) apresenta o usuário ao banco.
-- `auth.uid()` lê exatamente esse parâmetro. Sem isso, tudo rodaria como o dono
-- do banco, que ignora a RLS — e o teste não provaria nada.
--
-- ⚠️ RODE EM AMBIENTE DE DESENVOLVIMENTO. O script escreve de verdade (cria
-- três contas e uma empresa) antes de apagar. A decisão do dono do projeto
-- (2026-09-11) é que ainda não há dados reais nesta fase.
--
-- O QUE CADA TESTE VERIFICA:
--   0. O cadastro não escolhe o próprio papel                 (correção S9)
--   1. Visitante anônimo NÃO lê a tabela de usuários          (correção S1)
--   2. Usuário comum vê só o próprio perfil                   (correção S1)
--   3. Usuário comum NÃO consegue virar Desenvolvedor         (correção S2)
--   4. Usuário comum NÃO consegue criar empresa               (correção S3)
--   5. Usuário comum NÃO executa função administrativa        (correção S4)
--   6. Desenvolvedor cria empresa pela função transacional    (correção C2)
--   7. A data gravada é a hora real, sem as 3 horas a menos   (correção C1)
--   8. `allowed_modules` é lista de verdade                   (correção C3)
--   9. A trilha de auditoria registrou a empresa criada       (correção B4)
--  10. Módulo não contratado NÃO pode ser liberado a um membro  (lacuna L4)
--  11. Contratado pela empresa, o módulo passa a ser aceito     (lacuna L4)
--  12. Descontratar limpa os membros na mesma transação         (lacuna L4)
--  13. Usuário comum não contrata módulo para ninguém           (lacuna L4)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- LIMPEZA PRÉVIA — restos de uma execução interrompida.
-- A ordem importa: `tenants.owner_id` é ON DELETE RESTRICT, então as empresas
-- saem ANTES dos usuários. `tenant_members` cai por cascata.
-- ---------------------------------------------------------------------------
DELETE FROM public.audit_log
 WHERE registro_id IN (
   SELECT id::text FROM public.tenants
    WHERE owner_id IN ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222',
                       '33333333-3333-3333-3333-333333333333')
 )
    OR registro_id IN ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222',
                       '33333333-3333-3333-3333-333333333333');

DELETE FROM public.tenants
 WHERE owner_id IN ('11111111-1111-1111-1111-111111111111',
                    '22222222-2222-2222-2222-222222222222',
                    '33333333-3333-3333-3333-333333333333');

DELETE FROM auth.users
 WHERE id IN ('11111111-1111-1111-1111-111111111111',
              '22222222-2222-2222-2222-222222222222',
              '33333333-3333-3333-3333-333333333333');


-- ---------------------------------------------------------------------------
-- O CADERNO DE RESULTADOS.
-- É uma tabela de verdade (não temporária) porque o SELECT final precisa
-- encontrá-la, e porque assim o resultado continua legível depois, se a janela
-- do editor for fechada. Nasce com RLS ligada e SEM nenhuma policy: a API não
-- entrega uma linha sequer — só o SQL Editor, que roda como dono do banco, lê.
-- A próxima execução a recria do zero.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.resultado_teste_rls;

CREATE TABLE public.resultado_teste_rls (
  n         integer PRIMARY KEY,
  veredito  text NOT NULL,
  teste     text NOT NULL,
  detalhe   text
);

ALTER TABLE public.resultado_teste_rls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resultado_teste_rls FROM anon, authenticated;


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
-- TESTE 0 — o gatilho ignora o `role` enviado no cadastro (S9)
-- O usuário comum pediu `"role":"active"` no metadata; tem de nascer 'pending'.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    0,
    CASE WHEN v_role = 'pending' THEN 'PASSOU' ELSE 'FALHOU' END,
    'S9 — o cadastro não escolhe o próprio papel',
    format('nasceu com role=%s (esperado pending)', coalesce(v_role, '<sem perfil>'))
  );
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

  INSERT INTO public.resultado_teste_rls VALUES (
    1,
    CASE WHEN v_qtd <= 0 THEN 'PASSOU' ELSE 'FALHOU' END,
    'S1 — anônimo não enxerga public.users',
    format('leu %s linha(s) — "-1" significa permissão negada na tabela', v_qtd)
  );
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
  PERFORM set_config('request.jwt.claims', '{}', true);

  INSERT INTO public.resultado_teste_rls VALUES (
    2,
    CASE WHEN v_qtd = 1 THEN 'PASSOU' ELSE 'FALHOU' END,
    'S1 — usuário comum vê só o próprio perfil',
    format('viu %s perfil(is) (esperado 1)', v_qtd)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 3 — usuário comum NÃO consegue se tornar Desenvolvedor (S2)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_erro  text := 'nenhum';
  v_final boolean;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  BEGIN
    UPDATE public.users SET is_superuser = true WHERE id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  -- A recusa pode vir como erro (sem privilégio na coluna) OU em silêncio, com
  -- a RLS descartando a linha. As duas contam, desde que o valor não mude.
  SELECT is_superuser INTO v_final FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    3,
    CASE WHEN v_final = false THEN 'PASSOU' ELSE 'FALHOU' END,
    'S2 — usuário comum não escreve is_superuser',
    format('SQLSTATE=%s; is_superuser ficou em %s', v_erro, v_final)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 4 — usuário comum NÃO consegue criar a própria empresa (S3)
-- Esta é a validação que faltava: na v9, o INSERT abaixo PASSAVA.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_erro   text := 'nenhum';
  v_nasceu integer;
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
  PERFORM set_config('request.jwt.claims', '{}', true);

  SELECT count(*) INTO v_nasceu FROM public.tenants WHERE slug = 'empresa-pirata';

  INSERT INTO public.resultado_teste_rls VALUES (
    4,
    CASE WHEN v_nasceu = 0 THEN 'PASSOU' ELSE 'FALHOU' END,
    'S3 — usuário comum não cria a própria empresa',
    format('SQLSTATE=%s; empresas piratas no banco: %s', v_erro, v_nasceu)
  );
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
  PERFORM set_config('request.jwt.claims', '{}', true);

  INSERT INTO public.resultado_teste_rls VALUES (
    5,
    CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END,
    'S4 — admin_list_users recusada a usuário comum',
    format('SQLSTATE=%s ("nenhum" significa que a função executou)', v_erro)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 6 — o Desenvolvedor cria empresa pela função transacional (C2)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_resultado json := null;
  v_erro       text := 'nenhum';
  v_role       text;
  v_empresas   integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

  BEGIN
    v_resultado := public.admin_sync_user_tenants(
      '11111111-1111-1111-1111-111111111111',
      '[{"tenant_id": null, "name": "EMPRESA DE TESTE", "is_active": true}]'::jsonb,
      '{}'::uuid[]
    );
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE || ' ' || SQLERRM;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  SELECT role INTO v_role FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT count(*) INTO v_empresas FROM public.tenants WHERE owner_id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    6,
    CASE WHEN coalesce((v_resultado->>'success')::boolean, false) AND v_role = 'active' AND v_empresas = 1
         THEN 'PASSOU' ELSE 'FALHOU' END,
    'C2 — Desenvolvedor cria empresa pela função transacional',
    format('erro=%s; retorno=%s; role=%s; empresas=%s', v_erro, coalesce(v_resultado::text, '<nulo>'), v_role, v_empresas)
  );
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

  INSERT INTO public.resultado_teste_rls VALUES (
    7,
    CASE WHEN v_diferenca IS NOT NULL AND v_diferenca < interval '1 minute' THEN 'PASSOU' ELSE 'FALHOU' END,
    'C1 — created_at bate com o relógio (sem as 3 horas a menos)',
    coalesce('diferença de ' || v_diferenca::text, 'não há empresa para medir — ver o teste 6')
  );
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

  INSERT INTO public.resultado_teste_rls VALUES (
    8,
    CASE WHEN v_tipo = 'ARRAY' THEN 'PASSOU' ELSE 'FALHOU' END,
    'C3 — allowed_modules é text[] de verdade',
    format('information_schema diz: %s (esperado ARRAY)', coalesce(v_tipo, '<coluna não existe>'))
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 9 — a trilha de auditoria registrou a empresa criada (B4)
-- Conta só os eventos DESTE teste (a empresa de owner 111…), não o histórico
-- inteiro da tabela — senão o teste passaria de graça por causa do uso normal.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_linhas integer;
BEGIN
  SELECT count(*) INTO v_linhas
    FROM public.audit_log a
   WHERE a.tabela = 'tenants'
     AND a.registro_id IN (
       SELECT t.id::text FROM public.tenants t
        WHERE t.owner_id = '11111111-1111-1111-1111-111111111111'
     );

  INSERT INTO public.resultado_teste_rls VALUES (
    9,
    CASE WHEN v_linhas > 0 THEN 'PASSOU' ELSE 'FALHOU' END,
    'B4 — a auditoria gravou a empresa criada no teste',
    format('%s evento(s) em audit_log para a empresa de teste', v_linhas)
  );
END;
$$;


-- ===========================================================================
-- O SOQUETE DOS MÓDULOS (v10 — degrau 5)
--
-- Os testes 10 a 13 usam um módulo de mentira, 'teste_lego', inserido agora no
-- catálogo e apagado na limpeza final. É assim que um módulo de verdade também
-- entra: pelo SEED DELE, não pela aplicação.
-- ===========================================================================

INSERT INTO public.platform_modules (id, nome, descricao)
VALUES ('teste_lego', 'MODULO DE TESTE', 'Existe so durante este arquivo.')
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- TESTE 10 — o que a empresa não contratou não chega ao membro (L4)
-- O Proprietário tenta liberar para si um módulo que a empresa não tem.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid;
  v_erro   text := 'nenhum';
  v_ficou  text[];
BEGIN
  SELECT id INTO v_tenant FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  BEGIN
    UPDATE public.tenant_members
       SET allowed_modules = ARRAY['teste_lego']
     WHERE tenant_id = v_tenant
       AND user_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  SELECT allowed_modules INTO v_ficou
    FROM public.tenant_members
   WHERE tenant_id = v_tenant AND user_id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    10,
    CASE WHEN COALESCE(array_length(v_ficou, 1), 0) = 0 THEN 'PASSOU' ELSE 'FALHOU' END,
    'L4 — módulo não contratado não pode ser liberado ao membro',
    format('SQLSTATE=%s; allowed_modules ficou em %s', v_erro, COALESCE(v_ficou::text, '<nulo>'))
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 11 — contratado pela empresa, o mesmo módulo passa (L4)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid;
  v_erro   text := 'nenhum';
  v_ficou  text[];
BEGIN
  SELECT id INTO v_tenant FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  -- O Desenvolvedor contrata (a função confere is_superuser por dentro).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  PERFORM public.admin_set_tenant_module(v_tenant, 'teste_lego', true);
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  BEGIN
    UPDATE public.tenant_members
       SET allowed_modules = ARRAY['teste_lego']
     WHERE tenant_id = v_tenant
       AND user_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE || ' ' || SQLERRM;
  END;

  SELECT allowed_modules INTO v_ficou
    FROM public.tenant_members
   WHERE tenant_id = v_tenant AND user_id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    11,
    CASE WHEN v_ficou @> ARRAY['teste_lego'] THEN 'PASSOU' ELSE 'FALHOU' END,
    'L4 — contratado pela empresa, o módulo é aceito no membro',
    format('erro=%s; allowed_modules=%s', v_erro, COALESCE(v_ficou::text, '<nulo>'))
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 12 — descontratar limpa os membros, na mesma transação (L4)
-- Sem isso, o membro ficaria com um módulo que a empresa não tem mais — e o
-- próximo UPDATE no vínculo seria recusado por causa desse resto.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid;
  v_retorno json;
  v_ficou   text[];
BEGIN
  SELECT id INTO v_tenant FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  v_retorno := public.admin_set_tenant_module(v_tenant, 'teste_lego', false);
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  SELECT allowed_modules INTO v_ficou
    FROM public.tenant_members
   WHERE tenant_id = v_tenant AND user_id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    12,
    CASE WHEN COALESCE(array_length(v_ficou, 1), 0) = 0 THEN 'PASSOU' ELSE 'FALHOU' END,
    'L4 — descontratar limpa os membros junto',
    format('retorno=%s; allowed_modules=%s', v_retorno::text, COALESCE(v_ficou::text, '<nulo>'))
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 13 — usuário comum não contrata módulo para ninguém (L4 + S4)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid;
  v_erro   text := 'nenhum';
BEGIN
  SELECT id INTO v_tenant FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  BEGIN
    PERFORM public.admin_set_tenant_module(v_tenant, 'teste_lego', true);
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  INSERT INTO public.resultado_teste_rls VALUES (
    13,
    CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END,
    'L4 — usuário comum não contrata módulo',
    format('SQLSTATE=%s ("nenhum" significa que a contratação passou)', v_erro)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 14 — o PROPRIETÁRIO abre o que a empresa contratou, sem se autoliberar
-- (L5). Este teste nasceu de um defeito real, encontrado por ele na validação
-- do degrau 7: o módulo estava contratado, o painel dizia "nenhum módulo
-- disponível", e a causa era `modulos_do_membro` exigir o id em
-- `allowed_modules` TAMBÉM para o dono da empresa. Note que o `allowed_modules`
-- dele continua VAZIO aqui — é justamente esse o ponto.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant  uuid;
  v_lista   text[];
  v_membro  text[];
BEGIN
  SELECT id INTO v_tenant FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  -- O Desenvolvedor contrata o módulo de mentira para a empresa.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  PERFORM public.admin_set_tenant_module(v_tenant, 'teste_lego', true);

  -- Agora o PROPRIETÁRIO pergunta o que pode abrir.
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_lista := public.modulos_do_membro(v_tenant);
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  SELECT allowed_modules INTO v_membro
    FROM public.tenant_members
   WHERE tenant_id = v_tenant AND user_id = '11111111-1111-1111-1111-111111111111';

  INSERT INTO public.resultado_teste_rls VALUES (
    14,
    CASE WHEN v_lista @> ARRAY['teste_lego'] THEN 'PASSOU' ELSE 'FALHOU' END,
    'L5 — Proprietário abre o módulo contratado sem se autoliberar',
    format('modulos_do_membro=%s; allowed_modules dele=%s (tem de estar vazio)',
           COALESCE(v_lista::text, '<nulo>'), COALESCE(v_membro::text, '<nulo>'))
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- TESTE 15 — `modulos_contratados` responde ao dono e recusa o estranho (L5).
-- É a função que alimenta o "Painel de Controle de Tripulação": sem ela, o
-- Proprietário não tem o que oferecer aos Dependentes. E ela não pode ser
-- pública — a lista de módulos de uma empresa é informação dela.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid;
  v_dono   int  := -1;
  v_erro   text := 'nenhum';
BEGIN
  SELECT id INTO v_tenant FROM public.tenants
   WHERE owner_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SELECT count(*)::int INTO v_dono FROM public.modulos_contratados(v_tenant);

  PERFORM set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  BEGIN
    PERFORM count(*) FROM public.modulos_contratados(v_tenant);
  EXCEPTION WHEN OTHERS THEN
    v_erro := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{}', true);

  INSERT INTO public.resultado_teste_rls VALUES (
    15,
    CASE WHEN v_dono >= 1 AND v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END,
    'L5 — modulos_contratados: dono vê, estranho leva 42501',
    format('dono viu %s módulo(s); estranho: SQLSTATE=%s', v_dono, v_erro)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- LIMPEZA FINAL — os três usuários, as empresas deles e o rastro na auditoria.
-- Mesma ordem da limpeza prévia, pelo mesmo motivo (ON DELETE RESTRICT).
-- A tabela `resultado_teste_rls` NÃO é apagada aqui: é ela que o SELECT abaixo
-- mostra. A próxima execução do arquivo a recria.
-- ---------------------------------------------------------------------------
DELETE FROM public.audit_log
 WHERE registro_id IN (
   SELECT id::text FROM public.tenants
    WHERE owner_id IN ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222',
                       '33333333-3333-3333-3333-333333333333')
 )
    OR registro_id IN ('11111111-1111-1111-1111-111111111111',
                       '22222222-2222-2222-2222-222222222222',
                       '33333333-3333-3333-3333-333333333333');

DELETE FROM public.tenants
 WHERE owner_id IN ('11111111-1111-1111-1111-111111111111',
                    '22222222-2222-2222-2222-222222222222',
                    '33333333-3333-3333-3333-333333333333');

DELETE FROM auth.users
 WHERE id IN ('11111111-1111-1111-1111-111111111111',
              '22222222-2222-2222-2222-222222222222',
              '33333333-3333-3333-3333-333333333333');

-- O módulo de mentira sai do catálogo; o ON DELETE CASCADE de `tenant_modules`
-- leva junto os contratos que os testes 11 e 12 criaram.
DELETE FROM public.audit_log WHERE registro_id = 'teste_lego';
DELETE FROM public.platform_modules WHERE id = 'teste_lego';


-- ---------------------------------------------------------------------------
-- O RELATÓRIO. Este SELECT é o último comando de propósito: o SQL Editor do
-- Supabase exibe o resultado do último comando que devolve linhas.
-- ---------------------------------------------------------------------------
SELECT n        AS "#",
       veredito AS "veredito",
       teste    AS "o que foi verificado",
       detalhe  AS "detalhe"
  FROM public.resultado_teste_rls
 ORDER BY n;
