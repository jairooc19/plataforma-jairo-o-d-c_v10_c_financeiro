-- ===========================================================================
-- 🧪 TESTES DO MÓDULO CONTROLE FINANCEIRO
-- Local: supabase/testes/teste_financeiro.sql
-- ===========================================================================
--
-- PARA QUE SERVE: provar, dentro do banco, que as regras da especificação
-- funcionam — ANTES de existir qualquer tela. É a ordem que o `MODULOS.md`
-- exige, e a lição do degrau 3: a tela escondia o botão, e ninguém tinha
-- testado o banco.
--
-- COMO RODAR: cole o arquivo INTEIRO no SQL Editor. No fim aparece uma TABELA
-- com uma linha por teste. Todas devem dizer PASSOU.
--
-- ⚠️ LIMPE O EDITOR ANTES DE COLAR (Ctrl+A). O SQL Editor executa todo o texto
-- do painel; resto da execução anterior entra junto.
--
-- ⚠️ NÃO USA `RAISE NOTICE`: o SQL Editor descarta mensagens do servidor e
-- mostraria "Success. No rows returned" — que parece aprovação e não é.
--
-- ⚠️ ELE ESCREVE DE VERDADE e limpa no início e no fim (idempotente). Rode em
-- ambiente de desenvolvimento.
--
-- PRÉ-REQUISITOS: `plataforma_01_schema.sql`, `financeiro_01_schema.sql` e
-- `financeiro_02_seed.sql` aplicados.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- LIMPEZA PRÉVIA
-- ---------------------------------------------------------------------------
DELETE FROM public.fin_lancamentos
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.fin_fechamentos
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.fin_contas_movimento
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.fin_contas_identificadoras
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.tenant_modules
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.audit_log
 WHERE registro_id IN (
   SELECT id::text FROM public.tenants
    WHERE id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1'));
DELETE FROM public.tenants
 WHERE id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM auth.users
 WHERE id IN ('a1000000-0000-0000-0000-0000000000a1',
              'b1000000-0000-0000-0000-0000000000b1',
              'd1000000-0000-0000-0000-0000000000d1',
              'e1000000-0000-0000-0000-0000000000e1');

DROP TABLE IF EXISTS public.resultado_teste_financeiro;
CREATE TABLE public.resultado_teste_financeiro (
  n integer PRIMARY KEY, veredito text NOT NULL, regra text, teste text NOT NULL, detalhe text
);
ALTER TABLE public.resultado_teste_financeiro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resultado_teste_financeiro FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- PREPARAÇÃO: 2 empresas, 2 donos, 1 dependente e 1 Desenvolvedor
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
VALUES
 ('00000000-0000-0000-0000-000000000000','a1000000-0000-0000-0000-0000000000a1','authenticated','authenticated','fin.dono.a@teste.com','x','{"provider":"email"}','{"full_name":"DONO A"}'),
 ('00000000-0000-0000-0000-000000000000','b1000000-0000-0000-0000-0000000000b1','authenticated','authenticated','fin.dono.b@teste.com','x','{"provider":"email"}','{"full_name":"DONO B"}'),
 ('00000000-0000-0000-0000-000000000000','d1000000-0000-0000-0000-0000000000d1','authenticated','authenticated','fin.dependente@teste.com','x','{"provider":"email"}','{"full_name":"DEPENDENTE"}'),
 ('00000000-0000-0000-0000-000000000000','e1000000-0000-0000-0000-0000000000e1','authenticated','authenticated','fin.dev@teste.com','x','{"provider":"email"}','{"full_name":"DEV TESTE"}');

UPDATE public.users SET is_superuser = true WHERE id = 'e1000000-0000-0000-0000-0000000000e1';

INSERT INTO public.tenants (id, tenant_name, slug, owner_id) VALUES
 ('aa000000-0000-0000-0000-0000000000a1','EMPRESA A','fin-empresa-a','a1000000-0000-0000-0000-0000000000a1'),
 ('bb000000-0000-0000-0000-0000000000b1','EMPRESA B','fin-empresa-b','b1000000-0000-0000-0000-0000000000b1');

INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES
 ('aa000000-0000-0000-0000-0000000000a1','a1000000-0000-0000-0000-0000000000a1','OWNER'),
 ('bb000000-0000-0000-0000-0000000000b1','b1000000-0000-0000-0000-0000000000b1','OWNER'),
 ('aa000000-0000-0000-0000-0000000000a1','d1000000-0000-0000-0000-0000000000d1','DEPENDENT');

-- As duas empresas contratam o módulo (como o Desenvolvedor faria na tela).
INSERT INTO public.tenant_modules (tenant_id, module_id, is_active) VALUES
 ('aa000000-0000-0000-0000-0000000000a1','financeiro', true),
 ('bb000000-0000-0000-0000-0000000000b1','financeiro', true);

-- O Dependente recebe o módulo e permissões LIMITADAS: vê e cria, mas não
-- exclui, não transfere e não fecha período.
UPDATE public.tenant_members
   SET allowed_modules = ARRAY['financeiro'],
       module_configs = jsonb_build_object('financeiro', jsonb_build_object(
         'ativo', true,
         'permissoes', jsonb_build_array('cm_ver','ci_ver','lc_ver_todos','lc_criar',
                                         'lc_editar_proprios','extrato_ver','imprimir')))
 WHERE tenant_id = 'aa000000-0000-0000-0000-0000000000a1'
   AND user_id = 'd1000000-0000-0000-0000-0000000000d1';


-- ===========================================================================
-- TESTE 1 — o Proprietário cria cadastros e lança (o caminho feliz)
-- ===========================================================================
DO $$
DECLARE
  v_cm json; v_ci json; v_lc json; v_erro text := 'nenhum';
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    v_cm := public.fin_gravar_conta_movimento('aa000000-0000-0000-0000-0000000000a1', NULL, 'banco itau', 'BANCO', 120000, true);
    v_ci := public.fin_gravar_identificadora('aa000000-0000-0000-0000-0000000000a1', NULL, 'salario', 'RECEITA', true);
    v_lc := public.fin_gravar_lancamento(
      'aa000000-0000-0000-0000-0000000000a1', NULL,
      (v_cm->>'id')::uuid, (v_ci->>'id')::uuid,
      DATE '2026-09-05', NULL, 'ENTRADA', 'PROPRIO', 'CAIXA', 300000, 'salario de agosto');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    1, CASE WHEN v_erro = 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-01/10',
    'Proprietario cria conta, categoria e lancamento',
    format('erro=%s', v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 2 — nome gravado em MAIÚSCULAS e sem repetir (RN-02)
-- ===========================================================================
DO $$
DECLARE v_nome text; v_erro text := 'nenhum';
BEGIN
  SELECT nome INTO v_nome FROM public.fin_contas_movimento
   WHERE tenant_id = 'aa000000-0000-0000-0000-0000000000a1' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    -- mesmo nome, com acento e caixa diferentes: deve ser recusado
    PERFORM public.fin_gravar_conta_movimento('aa000000-0000-0000-0000-0000000000a1', NULL, 'Banco Itaú', 'BANCO', 0, true);
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    2, CASE WHEN v_nome = 'BANCO ITAU' AND v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-02',
    'Nome em MAIUSCULAS e duplicado recusado (ignorando acento)',
    format('gravado como "%s"; duplicado deu %s', v_nome, v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 3 — valor zero é recusado pelo banco (RN-15)
-- ===========================================================================
DO $$
DECLARE v_erro text := 'nenhum'; v_cm uuid; v_ci uuid;
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;
  SELECT id INTO v_ci FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci,
      DATE '2026-09-06', NULL, 'SAIDA', 'PROPRIO', 'CAIXA', 0, NULL);
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    3, CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-15',
    'Valor zero recusado pelo banco', format('SQLSTATE=%s', v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 4 — excluir conta com lançamento é recusado (RN-04)
-- ===========================================================================
DO $$
DECLARE v_erro text := 'nenhum'; v_cm uuid;
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;
  BEGIN
    DELETE FROM public.fin_contas_movimento WHERE id = v_cm;
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;

  INSERT INTO public.resultado_teste_financeiro VALUES (
    4, CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-04',
    'Excluir conta com lancamento e recusado', format('SQLSTATE=%s', v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 5 — alterar o TIPO de cadastro com lançamento é recusado (RN-07)
-- ===========================================================================
DO $$
DECLARE v_erro text := 'nenhum'; v_cm uuid;
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    PERFORM public.fin_gravar_conta_movimento('aa000000-0000-0000-0000-0000000000a1', v_cm, 'BANCO ITAU', 'CAIXA', 120000, true);
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    5, CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-07',
    'Alterar tipo de cadastro que ja tem lancamento e recusado', format('SQLSTATE=%s', v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 6 — a EMPRESA B não enxerga nada da EMPRESA A (RN-27)
-- ===========================================================================
DO $$
DECLARE v_contas int; v_lanc int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SELECT count(*) INTO v_contas FROM public.fin_contas_movimento;
  SELECT count(*) INTO v_lanc   FROM public.fin_lancamentos;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    6, CASE WHEN v_contas = 0 AND v_lanc = 0 THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-27',
    'Dono da EMPRESA B nao le dados da EMPRESA A',
    format('viu %s conta(s) e %s lancamento(s)', v_contas, v_lanc));
END;
$$;

-- ===========================================================================
-- TESTE 7 — lançamento não pode misturar empresas (RN-29)
-- ===========================================================================
DO $$
DECLARE v_erro text := 'nenhum'; v_cm_a uuid; v_ci_a uuid; v_cm_b uuid;
BEGIN
  SELECT id INTO v_cm_a FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;
  SELECT id INTO v_ci_a FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;

  -- cria uma conta na empresa B, direto (como dono do banco)
  INSERT INTO public.fin_contas_movimento (tenant_id, nome, tipo, criado_por)
  VALUES ('bb000000-0000-0000-0000-0000000000b1','CAIXA DA B','CAIXA','b1000000-0000-0000-0000-0000000000b1')
  RETURNING id INTO v_cm_b;

  BEGIN
    -- lançamento da empresa A apontando para a conta da empresa B
    INSERT INTO public.fin_lancamentos (
      tenant_id, conta_movimento_id, conta_identificadora_id,
      tipo_conta_movimento, tipo_conta_identificadora,
      data_movimento, tipo_movimento, propriedade, regime, valor_centavos, criado_por)
    VALUES ('aa000000-0000-0000-0000-0000000000a1', v_cm_b, v_ci_a,
            'CAIXA','RECEITA', DATE '2026-09-07','ENTRADA','PROPRIO','CAIXA', 5000,
            'a1000000-0000-0000-0000-0000000000a1');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;

  INSERT INTO public.resultado_teste_financeiro VALUES (
    7, CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-29',
    'Lancamento da empresa A usando conta da empresa B e recusado',
    format('SQLSTATE=%s (23503 = chave estrangeira composta)', v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 8 — ordem repetida no mesmo dia desloca as seguintes (RN-12)
-- ===========================================================================
DO $$
DECLARE
  v_cm uuid; v_ci uuid; v_erro text := 'nenhum';
  v_ordens int[];
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;
  SELECT id INTO v_ci FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND is_sistema = false LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    -- três lançamentos em 10/09, ordens 1, 2 e 3
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci, DATE '2026-09-10', 1, 'SAIDA','PROPRIO','CAIXA', 1000, 'UM');
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci, DATE '2026-09-10', 2, 'SAIDA','PROPRIO','CAIXA', 2000, 'DOIS');
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci, DATE '2026-09-10', 3, 'SAIDA','PROPRIO','CAIXA', 3000, 'TRES');
    -- agora um NOVO na ordem 2: os antigos 2 e 3 viram 3 e 4
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci, DATE '2026-09-10', 2, 'SAIDA','PROPRIO','CAIXA', 9900, 'INTRUSO');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  SELECT array_agg(ordem_extrato ORDER BY ordem_extrato) INTO v_ordens
    FROM public.fin_lancamentos
   WHERE conta_movimento_id = v_cm AND data_movimento = DATE '2026-09-10';

  INSERT INTO public.resultado_teste_financeiro VALUES (
    8, CASE WHEN v_ordens = ARRAY[1,2,3,4] THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-12',
    'Ordem repetida desloca as seguintes, sem duplicar',
    format('erro=%s; ordens do dia = %s', v_erro, v_ordens::text));
END;
$$;

-- ===========================================================================
-- TESTE 9 — o extrato ignora regime COMPETENCIA (RN-19) e o saldo confere
-- ===========================================================================
DO $$
DECLARE
  v_cm uuid; v_ci uuid; v_saldo_final bigint; v_esperado bigint; v_linhas int;
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;
  SELECT id INTO v_ci FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND is_sistema = false LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

  -- um lançamento de COMPETENCIA, que NÃO deve entrar no extrato
  PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci,
    DATE '2026-09-11', NULL, 'SAIDA','PROPRIO','COMPETENCIA', 500000, 'CONTA DE LUZ DE AGOSTO');

  SELECT saldo_centavos INTO v_saldo_final
    FROM public.fin_extrato('aa000000-0000-0000-0000-0000000000a1', v_cm, DATE '2026-09-01', DATE '2026-09-30')
   WHERE linha_tipo = 'TOTAL';

  SELECT count(*) INTO v_linhas
    FROM public.fin_extrato('aa000000-0000-0000-0000-0000000000a1', v_cm, DATE '2026-09-01', DATE '2026-09-30')
   WHERE linha_tipo = 'LANCAMENTO';

  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  -- esperado = abertura + soma manual dos lançamentos de CAIXA
  SELECT 120000 + COALESCE(SUM(CASE WHEN tipo_movimento='ENTRADA' THEN valor_centavos ELSE -valor_centavos END), 0)
    INTO v_esperado
    FROM public.fin_lancamentos
   WHERE conta_movimento_id = v_cm AND regime = 'CAIXA'
     AND data_movimento BETWEEN DATE '2026-09-01' AND DATE '2026-09-30';

  INSERT INTO public.resultado_teste_financeiro VALUES (
    9, CASE WHEN v_saldo_final = v_esperado THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-19/21',
    'Extrato ignora COMPETENCIA e o saldo bate com a soma manual',
    format('extrato=%s, soma manual=%s, linhas no periodo=%s', v_saldo_final, v_esperado, v_linhas));
END;
$$;

-- ===========================================================================
-- TESTE 10 — transferência grava as duas pernas e a categoria do sistema (RN-23/30/31)
-- ===========================================================================
DO $$
DECLARE
  v_cm_a uuid; v_cm2 uuid; v_res json; v_pernas int; v_cat_sistema int; v_erro text := 'nenhum';
  v_prop text; v_reg text;
BEGIN
  SELECT id INTO v_cm_a FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND nome='BANCO ITAU' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    v_cm2 := (public.fin_gravar_conta_movimento('aa000000-0000-0000-0000-0000000000a1', NULL, 'carteira', 'CAIXA', 0, true)->>'id')::uuid;
    v_res := public.fin_transferir('aa000000-0000-0000-0000-0000000000a1', v_cm_a, v_cm2, DATE '2026-09-12', 50000, 'saque');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  SELECT count(*) INTO v_pernas FROM public.fin_lancamentos
   WHERE transferencia_id = (v_res->>'transferencia_id')::uuid;
  SELECT count(*) INTO v_cat_sistema FROM public.fin_contas_identificadoras
   WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND is_sistema = true;
  SELECT propriedade, regime INTO v_prop, v_reg FROM public.fin_lancamentos
   WHERE transferencia_id = (v_res->>'transferencia_id')::uuid LIMIT 1;

  INSERT INTO public.resultado_teste_financeiro VALUES (
    10, CASE WHEN v_pernas = 2 AND v_cat_sistema = 1 AND v_prop='PROPRIO' AND v_reg='CAIXA'
             THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-23/30/31',
    'Transferencia cria 2 pernas, categoria do sistema, PROPRIO e CAIXA',
    format('erro=%s; pernas=%s; categorias do sistema=%s; propriedade=%s; regime=%s',
           v_erro, v_pernas, v_cat_sistema, v_prop, v_reg));
END;
$$;

-- ===========================================================================
-- TESTE 11 — a categoria do sistema não pode ser alterada (RN-30)
-- ===========================================================================
DO $$
DECLARE v_erro text := 'nenhum'; v_cat uuid;
BEGIN
  SELECT id INTO v_cat FROM public.fin_contas_identificadoras
   WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND is_sistema = true LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    PERFORM public.fin_gravar_identificadora('aa000000-0000-0000-0000-0000000000a1', v_cat, 'TRANSF', 'DESPESA', true);
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    11, CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-30',
    'Categoria do sistema nao pode ser renomeada nem mudar de tipo',
    format('SQLSTATE=%s', v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 12 — período fechado recusa lançamento (RN-24)
-- ===========================================================================
DO $$
DECLARE v_cm uuid; v_ci uuid; v_erro text := 'nenhum'; v_fech json;
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND nome='BANCO ITAU' LIMIT 1;
  SELECT id INTO v_ci FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND is_sistema = false LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  v_fech := public.fin_fechar_periodo('aa000000-0000-0000-0000-0000000000a1', v_cm, DATE '2026-09-15', 'CONFERIDO CONTRA O EXTRATO');
  BEGIN
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci,
      DATE '2026-09-14', NULL, 'SAIDA','PROPRIO','CAIXA', 1500, 'DENTRO DO PERIODO FECHADO');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    12, CASE WHEN v_erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-24',
    'Lancamento em periodo fechado e recusado',
    format('fechamento=%s; SQLSTATE do lancamento=%s', v_fech::text, v_erro));
END;
$$;

-- ===========================================================================
-- TESTE 13 — o Dependente faz o que pode e NÃO faz o que não pode (RN-25)
-- ===========================================================================
DO $$
DECLARE
  v_cm uuid; v_ci uuid; v_erro_criar text := 'nenhum'; v_erro_excluir text := 'nenhum';
  v_lanc uuid;
BEGIN
  SELECT id INTO v_cm FROM public.fin_contas_movimento WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND nome='CARTEIRA' LIMIT 1;
  SELECT id INTO v_ci FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' AND is_sistema = false LIMIT 1;
  SELECT id INTO v_lanc FROM public.fin_lancamentos WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1' LIMIT 1;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"d1000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

  BEGIN   -- PODE criar (tem lc_criar)
    PERFORM public.fin_gravar_lancamento('aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci,
      DATE '2026-09-20', NULL, 'SAIDA','PROPRIO','CAIXA', 700, 'LANCADO PELO DEPENDENTE');
  EXCEPTION WHEN OTHERS THEN v_erro_criar := SQLSTATE;
  END;

  BEGIN   -- NÃO pode excluir (não tem lc_excluir_*)
    PERFORM public.fin_excluir_lancamento('aa000000-0000-0000-0000-0000000000a1', v_lanc);
  EXCEPTION WHEN OTHERS THEN v_erro_excluir := SQLSTATE;
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    13, CASE WHEN v_erro_criar = 'nenhum' AND v_erro_excluir <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-25',
    'Dependente cria (permitido) e nao exclui (negado)',
    format('criar=%s; excluir=%s', v_erro_criar, v_erro_excluir));
END;
$$;

-- ===========================================================================
-- TESTE 14 — apagar os dados de uma empresa não deixa resto nem toca na outra (RN-28)
-- ===========================================================================
DO $$
DECLARE
  v_res json; v_sobrou_a int; v_sobrou_b int; v_erro text := 'nenhum';
BEGIN
  -- a EMPRESA B recebe um lançamento, para provar que ela não é tocada
  INSERT INTO public.fin_contas_identificadoras (tenant_id, nome, tipo, criado_por)
  VALUES ('bb000000-0000-0000-0000-0000000000b1','VENDAS','RECEITA','b1000000-0000-0000-0000-0000000000b1');

  INSERT INTO public.fin_lancamentos (
    tenant_id, conta_movimento_id, conta_identificadora_id,
    tipo_conta_movimento, tipo_conta_identificadora,
    data_movimento, tipo_movimento, propriedade, regime, valor_centavos, criado_por)
  SELECT 'bb000000-0000-0000-0000-0000000000b1', cm.id, ci.id, cm.tipo, ci.tipo,
         DATE '2026-09-09','ENTRADA','PROPRIO','CAIXA', 4321, 'b1000000-0000-0000-0000-0000000000b1'
    FROM public.fin_contas_movimento cm, public.fin_contas_identificadoras ci
   WHERE cm.tenant_id='bb000000-0000-0000-0000-0000000000b1'
     AND ci.tenant_id='bb000000-0000-0000-0000-0000000000b1' LIMIT 1;

  -- o Desenvolvedor aciona o botão (pela função genérica da plataforma)
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
  BEGIN
    v_res := public.admin_apagar_dados_do_modulo('aa000000-0000-0000-0000-0000000000a1', 'financeiro');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  SELECT (SELECT count(*) FROM public.fin_lancamentos            WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1')
       + (SELECT count(*) FROM public.fin_contas_movimento       WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1')
       + (SELECT count(*) FROM public.fin_contas_identificadoras WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1')
       + (SELECT count(*) FROM public.fin_fechamentos            WHERE tenant_id='aa000000-0000-0000-0000-0000000000a1')
    INTO v_sobrou_a;

  SELECT count(*) INTO v_sobrou_b FROM public.fin_lancamentos WHERE tenant_id='bb000000-0000-0000-0000-0000000000b1';

  INSERT INTO public.resultado_teste_financeiro VALUES (
    14, CASE WHEN v_erro='nenhum' AND v_sobrou_a = 0 AND v_sobrou_b = 1 THEN 'PASSOU' ELSE 'FALHOU' END, 'RN-28',
    'Botao do Desenvolvedor apaga a empresa A inteira e nao toca na B',
    format('erro=%s; retorno=%s; sobrou na A=%s; sobrou na B=%s', v_erro, v_res::text, v_sobrou_a, v_sobrou_b));
END;
$$;


-- ---------------------------------------------------------------------------
-- LIMPEZA FINAL
-- ---------------------------------------------------------------------------
DELETE FROM public.fin_lancamentos
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.fin_fechamentos
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.fin_contas_movimento
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.fin_contas_identificadoras
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.tenant_modules
 WHERE tenant_id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM public.audit_log
 WHERE registro_id IN (
   SELECT id::text FROM public.tenants
    WHERE id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1'));
DELETE FROM public.tenants
 WHERE id IN ('aa000000-0000-0000-0000-0000000000a1','bb000000-0000-0000-0000-0000000000b1');
DELETE FROM auth.users
 WHERE id IN ('a1000000-0000-0000-0000-0000000000a1',
              'b1000000-0000-0000-0000-0000000000b1',
              'd1000000-0000-0000-0000-0000000000d1',
              'e1000000-0000-0000-0000-0000000000e1');


-- ---------------------------------------------------------------------------
-- O RELATÓRIO — último comando de propósito
-- ---------------------------------------------------------------------------
SELECT n AS "#", veredito, regra AS "regra", teste AS "o que foi verificado", detalhe
  FROM public.resultado_teste_financeiro ORDER BY n;
