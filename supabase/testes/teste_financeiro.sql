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
-- 🚦 PORTEIRO: o módulo está instalado E COM PRIVILÉGIO?
--
-- ⚠️ POR QUE ISTO EXISTE. Em 13/09/2026 este arquivo morreu com
-- `42501: permission denied for function fin_gravar_lancamento` no meio da
-- preparação. O erro é verdadeiro, mas não diz o que fazer — e quando um
-- arquivo de teste estoura, o `SELECT` do fim nunca roda e NENHUMA linha
-- aparece: some inclusive o resultado dos testes que já tinham passado.
--
-- A causa era um `REVOKE` amplo da plataforma reaplicado por cima do módulo.
-- O porteiro abaixo troca o erro críptico por uma instrução.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_alcanca int; v_esperado int;
BEGIN
  IF to_regprocedure('public.fin_gravar_lancamento(uuid,uuid,uuid,uuid,date,integer,text,text,text,bigint,text)') IS NULL THEN
    RAISE EXCEPTION E'O MODULO FINANCEIRO NAO ESTA INSTALADO NESTE BANCO.\n'
      '>>> RODE ANTES: supabase/criar-bd-financeiro/financeiro_01_schema.sql e depois o financeiro_02_seed.sql.';
  END IF;

  /**
   * ⚠️ O NUMERO ESPERADO E CONTADO, NUNCA ESCRITO À MÃO.
   * Este bloco já dizia "de 16" fixo, e em 13/09/2026 o módulo ganhou duas
   * funções de importação: o teste passou a acusar "18 de 16" e a FALHAR — por
   * estar certo o código e errado o teste. Teste com número mágico envelhece
   * sozinho e, pior, ensina a ignorar a cor vermelha.
   */
  SELECT count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')),
         count(*)
    INTO v_alcanca, v_esperado
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname LIKE 'fin\_%'
     AND p.proname <> 'fin_apagar_dados_da_empresa';

  IF v_alcanca < v_esperado THEN
    RAISE EXCEPTION E'AS FUNCOES DO MODULO PERDERAM O GRANT DE EXECUCAO (o app alcanca % de %).\n'
      'ISTO NAO E DEFEITO DO MODULO: alguem reaplicou um REVOKE amplo da plataforma por cima dele.\n'
      '>>> RODE DE NOVO: supabase/criar-bd-financeiro/financeiro_01_schema.sql (idempotente, nao apaga dado).',
      v_alcanca, v_esperado;
  END IF;
END;
$$;

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


-- ===========================================================================
-- TESTE 15 — A SEGUNDA TRANCA: nenhuma função `fin_*` responde ao ANÔNIMO
--
-- ⚠️ ESTE TESTE NASCEU DE UM DEFEITO REAL (2026-09-13). As 17 funções do
-- módulo estavam alcançáveis pelo papel `anon`, porque no PostgreSQL **toda
-- função nasce com EXECUTE concedido a PUBLIC** e o schema só escrevia
-- `GRANT ... TO authenticated` — que não tira nada de ninguém. A pior delas era
-- `fin_apagar_dados_da_empresa`, que apaga o financeiro inteiro de uma empresa.
-- Não houve vazamento (as funções conferem `fin_pode()` / `is_superuser()`, que
-- dependem de `auth.uid()`), mas a regra da plataforma são DUAS trancas.
-- ===========================================================================
DO $$
DECLARE v_abertas int; v_quais text;
BEGIN
  SELECT count(*), COALESCE(string_agg(p.proname, ', ' ORDER BY p.proname), '—')
    INTO v_abertas, v_quais
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname LIKE 'fin\_%'
     AND has_function_privilege('anon', p.oid, 'EXECUTE');

  INSERT INTO public.resultado_teste_financeiro VALUES (
    15, CASE WHEN v_abertas = 0 THEN 'PASSOU' ELSE 'FALHOU' END, 'SEGUNDA TRANCA',
    'Nenhuma funcao fin_* responde ao papel anon (sem login)',
    format('%s funcao(oes) abertas ao anonimo: %s', v_abertas, v_quais));
END;
$$;


-- ===========================================================================
-- TESTE 16 — O CAMINHO FELIZ DO PRIVILÉGIO: o app ALCANÇA as 16 funções
--
-- ⚠️ ESTE É O TESTE QUE FALTAVA, E A FALTA CUSTOU UMA MANHÃ. Em 12/09/2026 o
-- `plataforma_01_schema.sql` foi reaplicado (gesto correto e recomendado, pois
-- o arquivo é idempotente) e a linha
-- `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public …` arrancou o EXECUTE das
-- funções do MÓDULO. Nada avisou: as tabelas, os dados e as policies
-- continuaram lá. O sintoma apareceu só na primeira gravação, como
-- `42501: permission denied for function fin_gravar_lancamento`, e parecia
-- defeito do módulo.
--
-- É a mesma lição do degrau 7-b: os testes provavam as RECUSAS e nenhum
-- provava que alguém CONSEGUE. Um teste de trava que não tem o par do caminho
-- feliz aprova um sistema trancado por fora.
--
-- ⚠️ `fin_apagar_dados_da_empresa` FICA DE FORA DE PROPÓSITO: ela é chamada de
-- dentro de `admin_apagar_dados_do_modulo` e NÃO deve responder ao cliente.
--
-- ⚠️ O TOTAL É CONTADO, NUNCA ESCRITO À MÃO. Este teste dizia "as 16 funções",
-- com o 16 fixo. Em 13/09/2026 o módulo ganhou duas funções de importação e ele
-- passou a acusar "18 de 16" e a FALHAR — com o código certo e o teste errado.
-- Teste com número mágico envelhece sozinho, e o pior efeito não é falhar: é
-- ensinar quem lê a ignorar a cor vermelha.
-- ===========================================================================
DO $$
DECLARE v_alcanca int; v_esperado int; v_faltando text;
BEGIN
  SELECT count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')),
         count(*),
         COALESCE(string_agg(p.proname, ', ' ORDER BY p.proname)
                  FILTER (WHERE NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')), '—')
    INTO v_alcanca, v_esperado, v_faltando
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname LIKE 'fin\_%'
     AND p.proname <> 'fin_apagar_dados_da_empresa';

  INSERT INTO public.resultado_teste_financeiro VALUES (
    16, CASE WHEN v_alcanca = v_esperado AND v_esperado > 0 THEN 'PASSOU' ELSE 'FALHOU' END, 'CAMINHO FELIZ',
    'O app (authenticated) alcanca TODAS as funcoes de cliente do modulo',
    format('alcanca %s de %s; sem EXECUTE: %s%s', v_alcanca, v_esperado, v_faltando,
           CASE WHEN v_alcanca = v_esperado THEN ''
                ELSE '  >>> RODE DE NOVO O financeiro_01_schema.sql: alguem reaplicou um REVOKE amplo por cima do modulo.' END));
END;
$$;


-- ===========================================================================
-- TESTE 17 — IMPORTAÇÃO EM LOTE: as três espécies de duplicata (13/09/2026)
--
-- O que este teste prova, de uma vez:
--   • o mesmo nome REPETIDO NO ARQUIVO entra uma vez só;
--   • o mesmo nome ESCRITO DIFERENTE (acento, caixa, espaço) é a mesma coisa —
--     porque a comparação usa `fin_normalizar`, a mesma do índice único (RN-02);
--   • o nome que JÁ EXISTE no banco é ignorado, não derruba a importação;
--   • linha vazia, só espaço e NULL são descartadas;
--   • e o relatório devolvido bate com o que realmente entrou na tabela.
--
-- ⚠️ O ÚLTIMO ITEM É O QUE IMPORTA MAIS. Um relatório que diz "criados: 6" e um
-- banco com 5 linhas é pior que erro nenhum: a pessoa fecha a tela confiando.
-- ===========================================================================
DO $$
DECLARE
  v_res json; v_erro text := 'nenhum'; v_no_banco int;
BEGIN
  /**
   * ⚠️ ESTE TESTE CRIA A PRÓPRIA DUPLICATA, E NÃO REAPROVEITA A DO TESTE 2.
   *
   * A primeira versão contava com o "BANCO ITAU" gravado no teste 2 — e falhou:
   * o teste 14, que roda no meio, aciona o botão "apagar os dados desta
   * empresa" e leva TODOS os cadastros da EMPRESA A junto. O relatório voltou
   * dizendo que "BANCO ITAÚ" tinha sido criado, o que estava correto — não
   * havia mais nada lá.
   *
   * A lição vale além deste arquivo: **teste que depende do estado deixado por
   * outro teste quebra quando alguém insere um terceiro no meio** — e quebra
   * apontando para o lugar errado. Cada teste monta o que precisa.
   */
  INSERT INTO public.fin_contas_movimento (tenant_id, nome, tipo, criado_por)
  VALUES ('aa000000-0000-0000-0000-0000000000a1', 'BANCO ITAU', 'BANCO',
          'a1000000-0000-0000-0000-0000000000a1')
  ON CONFLICT DO NOTHING;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    v_res := public.fin_importar_contas_movimento(
      'aa000000-0000-0000-0000-0000000000a1', 'BANCO',
      ARRAY['Banco do Brasil','  BRADESCO  ','banco do brasil','Banco Itaú',
            '','   ', NULL, 'Nubank']);
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  SELECT count(*) INTO v_no_banco
    FROM public.fin_contas_movimento
   WHERE tenant_id = 'aa000000-0000-0000-0000-0000000000a1'
     AND nome_normalizado IN (public.fin_normalizar('BANCO DO BRASIL'),
                              public.fin_normalizar('BRADESCO'),
                              public.fin_normalizar('NUBANK'));

  INSERT INTO public.resultado_teste_financeiro VALUES (
    17,
    CASE WHEN v_erro = 'nenhum'
          AND (v_res->>'criados')::int = 3
          AND (v_res->>'ja_existiam')::int = 1
          AND (v_res->>'repetidos_no_arquivo')::int = 1
          AND (v_res->>'vazios')::int = 3
          AND v_no_banco = 3
         THEN 'PASSOU' ELSE 'FALHOU' END,
    'IMPORTACAO',
    'Lote ignora repetido no arquivo, ja existente e vazio; e o relatorio bate com a tabela',
    format('erro=%s; retorno=%s; realmente no banco=%s (esperado 3)', v_erro, v_res::text, v_no_banco));
END;
$$;


-- ===========================================================================
-- TESTE 18 — A IMPORTAÇÃO NÃO CRIA A CATEGORIA DO SISTEMA (RN-30)
--
-- ⚠️ ESTE TESTE EXISTE PARA IMPEDIR UM DEFEITO DE EFEITO TARDIO. A categoria
-- "TRANSFERÊNCIA ENTRE CONTAS" é criada pelo BANCO, com `is_sistema = true`, na
-- primeira transferência da empresa. Se uma importação a criasse antes, como
-- categoria comum, a primeira transferência tentaria inserir a dela e bateria
-- no índice único — **a transferência falharia para sempre**, com um erro que
-- não menciona importação nenhuma. O estrago apareceria dias depois do gesto
-- que o causou.
-- ===========================================================================
DO $$
DECLARE
  v_res json; v_erro text := 'nenhum'; v_criou int; v_transf json;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    v_res := public.fin_importar_identificadoras(
      'aa000000-0000-0000-0000-0000000000a1', 'DESPESA',
      ARRAY['Transferência entre contas','TRANSFERENCIA ENTRE CONTAS','Internet']);
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  -- Nenhuma categoria COMUM com o nome reservado pode ter nascido.
  SELECT count(*) INTO v_criou
    FROM public.fin_contas_identificadoras
   WHERE tenant_id = 'aa000000-0000-0000-0000-0000000000a1'
     AND nome_normalizado = public.fin_normalizar('TRANSFERENCIA ENTRE CONTAS')
     AND is_sistema = false;

  INSERT INTO public.resultado_teste_financeiro VALUES (
    18,
    CASE WHEN v_erro = 'nenhum'
          AND (v_res->>'reservados')::int = 1
          AND (v_res->>'criados')::int = 1
          AND v_criou = 0
         THEN 'PASSOU' ELSE 'FALHOU' END,
    'RN-30',
    'Importacao recusa o nome reservado da transferencia e nao cria categoria comum com ele',
    format('erro=%s; retorno=%s; categorias comuns com o nome reservado=%s (tem de ser 0)',
           v_erro, v_res::text, v_criou));
END;
$$;


-- ===========================================================================
-- TESTE 19 — EDITAR UM LANÇAMENTO MOVENDO A ORDEM, COM VOLUME (RN-12, RN-22)
--
-- ⚠️ O TESTE 8 JÁ COBRIA A ORDEM, MAS SÓ NA CRIAÇÃO E COM TRÊS LINHAS. A
-- edição é outro caminho dentro da mesma função: ela precisa deslocar os
-- vizinhos E se excluir do deslocamento, senão empurraria a si mesma. Com três
-- linhas, um erro de um degrau passa despercebido; com dez, ele aparece.
--
-- ⚠️ O TESTE MONTA O PRÓPRIO CENÁRIO, do zero. Depender do que outro teste
-- deixou foi o que quebrou o teste 17 em 13/09 — o teste 14, que roda no meio,
-- aciona o botão de apagar os dados da empresa.
--
-- O QUE SE PROVA AQUI:
--   1. as dez ordens continuam sendo exatamente 1..10 — sem repetir e sem buraco;
--   2. o lançamento editado ficou na ordem pedida (3);
--   3. quem estava na 3 desceu para a 4;
--   4. `criado_por` NÃO mudou na edição (RN-22).
-- ===========================================================================
DO $$
DECLARE
  v_cm uuid; v_ci uuid; v_erro text := 'nenhum';
  v_ordens int[]; v_alvo uuid; v_ordem_alvo int; v_ordem_vizinho int;
  v_vizinho uuid; v_criador_antes uuid; v_criador_depois uuid;
  v_i int;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    v_cm := (public.fin_gravar_conta_movimento(
               'aa000000-0000-0000-0000-0000000000a1', NULL, 'CONTA DO TESTE 19', 'BANCO', 0, true)->>'id')::uuid;
    v_ci := (public.fin_gravar_identificadora(
               'aa000000-0000-0000-0000-0000000000a1', NULL, 'CATEGORIA DO TESTE 19', 'DESPESA', true)->>'id')::uuid;

    -- Dez lançamentos no mesmo dia, ordens 1 a 10.
    FOR v_i IN 1..10 LOOP
      PERFORM public.fin_gravar_lancamento(
        'aa000000-0000-0000-0000-0000000000a1', NULL, v_cm, v_ci, DATE '2026-09-20',
        v_i, 'SAIDA', 'PROPRIO', 'CAIXA', v_i * 100, 'LINHA ' || v_i);
    END LOOP;
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;

  -- O alvo é o ÚLTIMO (ordem 10); o vizinho é quem ocupa a ordem 3 hoje.
  SELECT id, criado_por INTO v_alvo, v_criador_antes
    FROM public.fin_lancamentos
   WHERE conta_movimento_id = v_cm AND data_movimento = DATE '2026-09-20' AND ordem_extrato = 10;
  SELECT id INTO v_vizinho
    FROM public.fin_lancamentos
   WHERE conta_movimento_id = v_cm AND data_movimento = DATE '2026-09-20' AND ordem_extrato = 3;

  BEGIN
    -- A EDIÇÃO: o mesmo lançamento, agora pedindo a ordem 3 e outro valor.
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
    PERFORM public.fin_gravar_lancamento(
      'aa000000-0000-0000-0000-0000000000a1', v_alvo, v_cm, v_ci, DATE '2026-09-20',
      3, 'SAIDA', 'PROPRIO', 'CAIXA', 777, 'LINHA 10 EDITADA');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  SELECT array_agg(ordem_extrato ORDER BY ordem_extrato) INTO v_ordens
    FROM public.fin_lancamentos
   WHERE conta_movimento_id = v_cm AND data_movimento = DATE '2026-09-20';

  SELECT ordem_extrato, criado_por INTO v_ordem_alvo, v_criador_depois
    FROM public.fin_lancamentos WHERE id = v_alvo;
  SELECT ordem_extrato INTO v_ordem_vizinho
    FROM public.fin_lancamentos WHERE id = v_vizinho;

  INSERT INTO public.resultado_teste_financeiro VALUES (
    19,
    CASE WHEN v_erro = 'nenhum'
          AND v_ordens = ARRAY[1,2,3,4,5,6,7,8,9,10]
          AND v_ordem_alvo = 3
          AND v_ordem_vizinho = 4
          AND v_criador_depois = v_criador_antes
         THEN 'PASSOU' ELSE 'FALHOU' END,
    'RN-12/RN-22',
    'Editar movendo a ordem desloca os vizinhos, nao duplica nem deixa buraco, e nao troca o autor',
    format('erro=%s; ordens=%s (esperado 1..10); editado na ordem %s (esperado 3); vizinho na %s (esperado 4); autor preservado=%s',
           v_erro, v_ordens::text, v_ordem_alvo, v_ordem_vizinho, (v_criador_depois = v_criador_antes)));
END;
$$;


-- ===========================================================================
-- TESTE 20 — A BUSCA POR TEXTO NÃO DEVOLVE CADASTRO DESATIVADO (RN-06)
--
-- ⚠️ ESTE TESTE NASCEU DE UM FURO REAL, ENCONTRADO EM 14/09/2026. A RN-06 diz
-- que conta desativada some das listas de lançamento novo. As LISTAS já
-- respeitavam; as funções de BUSCA, não — então o cadastro desativado não
-- aparecia ao abrir a lista e aparecia ao digitar o nome. E como
-- `fin_gravar_lancamento` confere existência e não situação, dava para lançar
-- numa conta desativada desde que se chegasse a ela digitando.
--
-- ⚠️ É TAMBÉM O PAR DO CAMINHO FELIZ: não basta provar que a inativa some, é
-- preciso provar que a ATIVA continua aparecendo. Uma trava que escondesse tudo
-- passaria num teste que só olhasse para a recusa — a lição que já se repetiu
-- quatro vezes neste projeto.
-- ===========================================================================
DO $$
DECLARE
  v_inativa uuid; v_ci_inativa uuid;
  v_erro text := 'nenhum';
  v_cm_achados text[]; v_ci_achados text[];
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  BEGIN
    PERFORM public.fin_gravar_conta_movimento(
      'aa000000-0000-0000-0000-0000000000a1', NULL, 'ZORRO ATIVA', 'BANCO', 0, true);
    v_inativa := (public.fin_gravar_conta_movimento(
      'aa000000-0000-0000-0000-0000000000a1', NULL, 'ZORRO INATIVA', 'BANCO', 0, true)->>'id')::uuid;
    -- Desativa a segunda DEPOIS de criada, como se faz pela tela.
    PERFORM public.fin_gravar_conta_movimento(
      'aa000000-0000-0000-0000-0000000000a1', v_inativa, 'ZORRO INATIVA', 'BANCO', 0, false);

    PERFORM public.fin_gravar_identificadora(
      'aa000000-0000-0000-0000-0000000000a1', NULL, 'ZORRO CATEGORIA ATIVA', 'DESPESA', true);
    v_ci_inativa := (public.fin_gravar_identificadora(
      'aa000000-0000-0000-0000-0000000000a1', NULL, 'ZORRO CATEGORIA INATIVA', 'DESPESA', true)->>'id')::uuid;
    PERFORM public.fin_gravar_identificadora(
      'aa000000-0000-0000-0000-0000000000a1', v_ci_inativa, 'ZORRO CATEGORIA INATIVA', 'DESPESA', false);

    -- A busca que a tela faz ao digitar. "zorro" minúsculo de propósito:
    -- `fin_normalizar` tem de dar conta da caixa e do acento.
    SELECT array_agg(nome ORDER BY nome) INTO v_cm_achados
      FROM public.fin_buscar_contas_movimento('aa000000-0000-0000-0000-0000000000a1', 'zorro');
    SELECT array_agg(nome ORDER BY nome) INTO v_ci_achados
      FROM public.fin_buscar_identificadoras('aa000000-0000-0000-0000-0000000000a1', 'zorro');
  EXCEPTION WHEN OTHERS THEN v_erro := SQLSTATE || ' ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{}', true);

  INSERT INTO public.resultado_teste_financeiro VALUES (
    20,
    CASE WHEN v_erro = 'nenhum'
          AND v_cm_achados = ARRAY['ZORRO ATIVA']
          AND v_ci_achados = ARRAY['ZORRO CATEGORIA ATIVA']
         THEN 'PASSOU' ELSE 'FALHOU' END,
    'RN-06',
    'A busca por texto traz a ATIVA e nao traz a DESATIVADA, nas duas especies de cadastro',
    format('erro=%s; contas achadas=%s (esperado {ZORRO ATIVA}); categorias achadas=%s (esperado {ZORRO CATEGORIA ATIVA})',
           v_erro, v_cm_achados::text, v_ci_achados::text));
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
