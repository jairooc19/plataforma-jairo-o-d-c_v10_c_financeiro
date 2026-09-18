-- ===========================================================================
-- 🔎 INVENTÁRIO DO MÓDULO CONTROLE FINANCEIRO — PJODC v10
-- Local: supabase/testes/inventario_financeiro.sql
-- ===========================================================================
--
-- PARA QUE SERVE: responder UMA pergunta — "o que está no banco é o que o
-- `financeiro_01_schema.sql` manda estar?". Ele NÃO testa regra de negócio;
-- quem faz isso é o `teste_financeiro.sql`, que é o irmão deste arquivo:
--
--   teste_financeiro.sql      → "as regras funcionam?"     ESCREVE no banco
--   inventario_financeiro.sql → "as peças estão todas lá?" SÓ LÊ
--
-- COMO USAR: limpe o SQL Editor (Ctrl+A) e cole este arquivo INTEIRO. Ele
-- devolve UMA tabela. Todas as linhas de veredito devem dizer OK. Quando
-- alguma disser DIVERGE, as linhas DETALHE apontam exatamente qual objeto é o
-- culpado — não é preciso rodar mais nada.
--
-- ⚠️ ELE NÃO ESCREVE NADA. Nenhum INSERT, nenhuma tabela de resultado, nenhum
-- objeto temporário: é um único SELECT sobre o catálogo do PostgreSQL. Pode
-- rodar em produção, a qualquer hora.
--
-- ⚠️ NÃO USA `RAISE NOTICE`. O SQL Editor do Supabase descarta mensagens do
-- servidor e mostraria "Success. No rows returned" — que parece aprovação e
-- não é. A lição do degrau 4.
--
-- QUANDO RODAR: depois de toda reaplicação do `financeiro_01_schema.sql`. É
-- nesse momento que nascem os defeitos que ele pega.
--
-- ---------------------------------------------------------------------------
-- ⚠️ SETE NÚMEROS E UMA LISTA AQUI SÃO ESCRITOS À MÃO. AO MUDAR O SCHEMA,
-- MUDE-OS JUNTO.
-- ---------------------------------------------------------------------------
--
-- São as linhas 1 a 5, a 9 e a 16: tabelas (5), funções (36), policies (5),
-- triggers (10), índices (19), funções alcançáveis pelo app (34) e chaves para a
-- plataforma (10) — mais a LISTA DE ASSINATURAS da linha 17, que entrou em
-- 17/09/2026. **Eles não podem ser deduzidos do catálogo** — deduzi-los
-- seria perguntar ao banco se o banco
-- concorda consigo mesmo, e a resposta seria sempre sim. Eles são a AFIRMAÇÃO
-- do `financeiro_01_schema.sql`, e é justamente a comparação entre a afirmação
-- e o banco que faz este arquivo valer alguma coisa.
--
-- Acrescentou uma função nova ao módulo? A linha 2 vai dizer DIVERGE, e está
-- certa: **atualize o número aqui no MESMO commit.** Um inventário que vive
-- dizendo DIVERGE por desatualização ensina a ignorar o vermelho — e aí ele
-- para de servir para qualquer coisa.
--
-- As outras nove linhas (6, 7, 8, 10 a 15) **não têm número escrito à mão**:
-- todas esperam ZERO, e o zero não envelhece. São as que continuam valendo
-- sozinhas para sempre.
--
-- ---------------------------------------------------------------------------
-- ⚠️ OS DOIS DEFEITOS REAIS QUE MOTIVARAM ESTE ARQUIVO
-- ---------------------------------------------------------------------------
--
-- 1. A `fin_transferir` DUPLICADA (14/09/2026). Quando ela ganhou os parâmetros
--    `p_ordem_origem` e `p_ordem_destino`, o `CREATE OR REPLACE` NÃO substituiu
--    a versão antiga: lista de parâmetros diferente cria uma SOBRECARGA.
--    Ficaram duas funções vivas, as duas com GRANT. O `teste_financeiro.sql`
--    passou 21/21 mesmo assim, porque chamava a nova.
--    → é a linha 7 daqui, e ela não precisa de número esperado nenhum.
--
-- 2. O SEED FALTANDO. Sem a linha do módulo em `platform_modules`, a
--    `fin_pode()` nega tudo e o sistema devolve `42501 Sem permissao` — uma
--    mensagem que não menciona catálogo nenhum, e que manda quem lê procurar
--    permissão no lugar errado.
--    → é a linha 6 daqui.
--
-- ---------------------------------------------------------------------------
-- ⚠️ POR QUE O PRIVILÉGIO NÃO É LIDO COM `has_function_privilege`
-- ---------------------------------------------------------------------------
--
-- Duas razões, as duas já custaram caro neste projeto:
--
-- a) NO POSTGRESQL, FUNÇÃO SEM GRANT NÃO ESTÁ FECHADA — ESTÁ ABERTA. Toda
--    função nasce executável por PUBLIC, e `anon` herda de PUBLIC. Ler "não
--    recebe GRANT" como "ninguém alcança" é o erro; por isso o cálculo abaixo
--    trata `proacl IS NULL` explicitamente como ABERTA A PUBLIC.
--
-- b) `has_function_privilege('anon', …)` ESTOURA se o papel `anon` não existir
--    (um PostgreSQL local sem o `00_supabase_falso.sql`, por exemplo), e o
--    arquivo inteiro morre — levando junto o resultado das linhas que já
--    tinham passado. A leitura por `aclexplode` + `JOIN` em `pg_roles` devolve
--    "ninguém" em vez de estourar.
-- ===========================================================================

WITH
-- ---------------------------------------------------------------------------
-- As peças do módulo, colhidas do catálogo
-- ---------------------------------------------------------------------------
tabelas AS (
  SELECT c.oid, c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'fin\_%'
),
funcoes AS (
  SELECT p.oid, p.proname, p.prosecdef, p.proconfig, p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname LIKE 'fin\_%'
),
politicas AS (
  SELECT pol.polname, pol.polroles, c.relname
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
   WHERE c.relname LIKE 'fin\_%'
),
gatilhos AS (
  SELECT t.tgname, c.relname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
   WHERE c.relname LIKE 'fin\_%' AND NOT t.tgisinternal
),
indices AS (
  SELECT ic.relname AS indice, c.relname AS tabela
    FROM pg_index i
    JOIN pg_class c  ON c.oid  = i.indrelid
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname LIKE 'fin\_%'
),
-- Quem alcança cada função. `proacl IS NULL` = ABERTA A PUBLIC (nota "a").
alcance AS (
  SELECT f.proname,
         (f.proacl IS NULL
          OR EXISTS (SELECT 1 FROM aclexplode(f.proacl) a
                      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')) AS por_public,
         (f.proacl IS NULL
          OR EXISTS (SELECT 1 FROM aclexplode(f.proacl) a
                      JOIN pg_roles r ON r.oid = a.grantee
                     WHERE r.rolname = 'anon' AND a.privilege_type = 'EXECUTE')) AS por_anon,
         (f.proacl IS NULL
          OR EXISTS (SELECT 1 FROM aclexplode(f.proacl) a
                      JOIN pg_roles r ON r.oid = a.grantee
                     WHERE r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE')) AS por_app
    FROM funcoes f
),
-- RN-29: chave estrangeira ENTRE tabelas do módulo tem de ser composta
-- `(tenant_id, id)`. Simples, um registro de uma empresa apontaria para o
-- cadastro de outra. As chaves que apontam para a PLATAFORMA (`tenants`,
-- `users`) são simples de propósito e ficam de fora deste recorte.
fks_do_modulo AS (
  SELECT con.conname, orig.relname AS de, dest.relname AS para,
         COALESCE(array_length(con.conkey, 1), 0) AS colunas
    FROM pg_constraint con
    JOIN pg_class orig ON orig.oid = con.conrelid
    JOIN pg_class dest ON dest.oid = con.confrelid
   WHERE con.contype = 'f'
     AND orig.relname LIKE 'fin\_%'
     AND dest.relname LIKE 'fin\_%'
),
-- ⚠️ AS CHAVES DO MÓDULO PARA A PLATAFORMA — a linha 16, e ela existe por um
-- defeito MEDIDO em 16/09/2026. Rodar o `plataforma_00_reset.sql` com o módulo
-- ainda instalado derruba `tenants` e `users` com CASCADE: as tabelas `fin_*`
-- SOBREVIVEM (o reset é restrito ao CORE, de propósito) mas as 8 chaves delas
-- para a plataforma são destruídas em silêncio. E reaplicar o
-- `financeiro_01_schema.sql` NÃO as traz de volta: `CREATE TABLE IF NOT EXISTS`
-- vê a tabela de pé e pula o bloco inteiro, chaves inclusas.
--
-- O estrago é permanente e mudo: apagar uma empresa passaria a deixar
-- lançamentos órfãos para sempre, sem ninguém reclamar. Esta linha é o único
-- lugar do projeto que percebe.
fks_para_a_plataforma AS (
  SELECT con.conname, orig.relname AS de, dest.relname AS para
    FROM pg_constraint con
    JOIN pg_class orig ON orig.oid = con.conrelid
    JOIN pg_class dest ON dest.oid = con.confrelid
   WHERE con.contype = 'f'
     AND orig.relname LIKE 'fin\_%'
     AND dest.relname NOT LIKE 'fin\_%'
),
-- As duas funções que NÃO podem ter GRANT: são chamadas de dentro de outras
-- `SECURITY DEFINER` e não precisam dele. Expostas, deixariam embaralhar o
-- extrato alheio e apagar os dados de uma empresa sem checagem de permissão.
internas AS (
  SELECT unnest(ARRAY['fin_abrir_espaco_na_ordem', 'fin_apagar_dados_da_empresa']) AS proname
),

-- ---------------------------------------------------------------------------
-- O PLACAR
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- A LISTA DE ASSINATURAS QUE O SCHEMA AFIRMA CRIAR — 36 linhas (18/09/2026)
-- ---------------------------------------------------------------------------
-- ⚠️ AO MUDAR A ASSINATURA DE UMA FUNÇÃO, MUDE A LINHA CORRESPONDENTE AQUI.
-- É de propósito que isto dê trabalho: assinatura de função é contrato, e
-- contrato que muda sozinho não é contrato. Para regerar a lista a partir de um
-- banco que você acabou de conferir à mão:
--
--   SELECT '  (''' || p.proname || ''', ''' ||
--          pg_get_function_identity_arguments(p.oid) || '''),'
--     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname LIKE 'fin\_%'
--    ORDER BY p.proname;
assinaturas_esperadas (nome, args) AS (
  VALUES
  ('fin_abrir_espaco_na_ordem', 'p_conta_movimento_id uuid, p_data date, p_ordem integer, p_excluir_id uuid'),
  ('fin_apagar_dados_da_empresa', 'p_tenant_id uuid'),
  ('fin_buscar_contas_movimento', 'p_tenant_id uuid, p_texto text'),
  ('fin_buscar_identificadoras', 'p_tenant_id uuid, p_texto text'),
  ('fin_competencias_orcadas', 'p_tenant_id uuid, p_de date, p_ate date, p_conta_identificadora_id uuid'),
  ('fin_config_dinheiro', 'p_tenant_id uuid'),
  ('fin_copiar_orcamento', 'p_tenant_id uuid, p_origem date, p_destino date, p_substituir boolean'),
  ('fin_dinheiro_do_periodo', 'p_tenant_id uuid, p_competencia date'),
  ('fin_excluir_lancamento', 'p_tenant_id uuid, p_id uuid'),
  ('fin_excluir_orcamento', 'p_tenant_id uuid, p_id uuid'),
  ('fin_excluir_lancamentos_por_periodo', 'p_tenant_id uuid, p_conta_movimento_id uuid, p_data_inicial date, p_data_final date, p_simular boolean, p_ids uuid[]'),
  ('fin_extrato', 'p_tenant_id uuid, p_conta_movimento_id uuid, p_data_inicial date, p_data_final date'),
  ('fin_extrato_consolidado', 'p_tenant_id uuid, p_conta_movimento_ids uuid[], p_data_inicial date, p_data_final date'),
  ('fin_extrato_identificadora', 'p_tenant_id uuid, p_conta_identificadora_id uuid, p_data_inicial date, p_data_final date'),
  ('fin_fechar_periodo', 'p_tenant_id uuid, p_conta_movimento_id uuid, p_fechado_ate date, p_observacao text'),
  ('fin_gravar_conta_movimento', 'p_tenant_id uuid, p_id uuid, p_nome text, p_tipo text, p_saldo_abertura_centavos bigint, p_is_active boolean'),
  ('fin_gravar_identificadora', 'p_tenant_id uuid, p_id uuid, p_nome text, p_tipo text, p_is_active boolean'),
  ('fin_gravar_lancamento', 'p_tenant_id uuid, p_id uuid, p_conta_movimento_id uuid, p_conta_identificadora_id uuid, p_data_movimento date, p_ordem_extrato integer, p_tipo_movimento text, p_propriedade text, p_regime text, p_valor_centavos bigint, p_historico text'),
  ('fin_gravar_orcamento', 'p_tenant_id uuid, p_id uuid, p_competencia date, p_conta_identificadora_id uuid, p_valor_centavos bigint, p_observacao text'),
  ('fin_historico_fechamentos', 'p_tenant_id uuid, p_limite integer'),
  ('fin_importar_contas_movimento', 'p_tenant_id uuid, p_tipo text, p_nomes text[]'),
  ('fin_importar_identificadoras', 'p_tenant_id uuid, p_tipo text, p_nomes text[]'),
  ('fin_limpar_lixeira', 'p_tenant_id uuid, p_audit_ids bigint[], p_simular boolean'),
  ('fin_listar_exclusoes', 'p_tenant_id uuid, p_desde timestamp with time zone, p_limite integer'),
  ('fin_listar_orcamento', 'p_tenant_id uuid, p_competencia date'),
  ('fin_marcar_conferido', 'p_tenant_id uuid, p_id uuid, p_conferido boolean'),
  ('fin_movimentos_mensais_identificadora', 'p_tenant_id uuid, p_ano integer'),
  ('fin_normalizar', 'p_texto text'),
  ('fin_periodo_fechado', 'p_tenant_id uuid, p_conta_id uuid, p_data date'),
  ('fin_pode', 'p_tenant_id uuid, p_permissao text'),
  ('fin_proxima_ordem', 'p_conta_id uuid, p_data date'),
  ('fin_reabrir_periodo', 'p_tenant_id uuid, p_conta_movimento_id uuid'),
  ('fin_restaurar_lancamento', 'p_tenant_id uuid, p_audit_id bigint'),
  ('fin_saldo_atual', 'p_tenant_id uuid, p_conta_movimento_id uuid'),
  ('fin_saldos_mensais_movimento', 'p_tenant_id uuid, p_ano integer'),
  ('fin_transferir', 'p_tenant_id uuid, p_conta_origem_id uuid, p_conta_destino_id uuid, p_data date, p_valor_centavos bigint, p_historico text, p_ordem_origem integer, p_ordem_destino integer')
),

placar AS (
  SELECT 1 AS n, 'CONTAGEM' AS bloco,
         'Tabelas do modulo (fin_*)' AS o_que_foi_conferido,
         '5' AS esperado, (SELECT count(*)::text FROM tabelas) AS encontrado
  UNION ALL
  SELECT 2, 'CONTAGEM', 'Funcoes do modulo (fin_*)',
         '36', (SELECT count(*)::text FROM funcoes)
  UNION ALL
  SELECT 3, 'CONTAGEM', 'Policies de RLS nas tabelas do modulo',
         '5', (SELECT count(*)::text FROM politicas)
  UNION ALL
  SELECT 4, 'CONTAGEM', 'Triggers nas tabelas do modulo',
         '10', (SELECT count(*)::text FROM gatilhos)
  UNION ALL
  SELECT 5, 'CONTAGEM', 'Indices nas tabelas do modulo (chaves primarias incluidas)',
         '19', (SELECT count(*)::text FROM indices)
  UNION ALL
  SELECT 6, 'CATALOGO', 'Linha do modulo em platform_modules (sem ela, fin_pode() nega tudo)',
         '1', (SELECT count(*)::text FROM public.platform_modules WHERE id = 'financeiro')
  UNION ALL
  SELECT 7, 'SOBRECARGA', 'Nomes de funcao com mais de uma assinatura viva',
         '0', (SELECT count(*)::text FROM (
                 SELECT proname FROM funcoes GROUP BY proname HAVING count(*) > 1) x)
  UNION ALL
  SELECT 8, 'SEGUNDA TRANCA', 'Funcoes alcancaveis pelo anonimo (sem login)',
         '0', (SELECT count(*)::text FROM alcance WHERE por_anon OR por_public)
  UNION ALL
  SELECT 9, 'CAMINHO FELIZ', 'Funcoes de cliente alcancaveis pelo app (authenticated)',
         '34', (SELECT count(*)::text FROM alcance WHERE por_app)
  UNION ALL
  SELECT 10, 'PORTA INTERNA', 'Funcoes internas que receberam GRANT indevido',
         '0', (SELECT count(*)::text FROM alcance a JOIN internas i USING (proname) WHERE a.por_app)
  UNION ALL
  SELECT 11, 'RLS', 'Tabelas do modulo SEM row level security ligado',
         '0', (SELECT count(*)::text FROM tabelas WHERE NOT relrowsecurity)
  UNION ALL
  SELECT 12, 'RLS', 'Tabelas com RLS ligado e NENHUMA policy (ninguem le nada)',
         '0', (SELECT count(*)::text FROM tabelas t
                WHERE t.relrowsecurity
                  AND NOT EXISTS (SELECT 1 FROM politicas p WHERE p.relname = t.relname))
  UNION ALL
  SELECT 13, 'RLS', 'Policies escritas sem a clausula TO (o padrao e PUBLIC)',
         '0', (SELECT count(*)::text FROM politicas WHERE polroles = '{0}')
  UNION ALL
  SELECT 14, 'SEARCH_PATH', 'Funcoes SECURITY DEFINER sem SET search_path',
         '0', (SELECT count(*)::text FROM funcoes
                WHERE prosecdef
                  AND (proconfig IS NULL
                       OR NOT EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search\_path=%')))
  UNION ALL
  SELECT 15, 'RN-29', 'Chaves estrangeiras SIMPLES entre tabelas do modulo',
         '0', (SELECT count(*)::text FROM fks_do_modulo WHERE colunas < 2)
  UNION ALL
  SELECT 16, 'AMARRAS', 'Chaves das tabelas do modulo para a plataforma (tenants/users)',
         '10', (SELECT count(*)::text FROM fks_para_a_plataforma)
  UNION ALL
  -- -------------------------------------------------------------------------
  -- 17 — ASSINATURA (17/09/2026)
  -- -------------------------------------------------------------------------
  -- ⚠️ POR QUE A CONTAGEM DA LINHA 2 NÃO BASTA. Contar funções pega função que
  -- SUMIU e função que SOBROU. Não pega a que MUDOU DE FORMA: trocar um
  -- parâmetro deixa o total em 24 e o inventário diz OK.
  --
  -- E essa é exatamente a mudança mais perigosa do módulo. Em 14/09/2026 a
  -- `fin_transferir` ganhou dois parâmetros e o `CREATE OR REPLACE` criou uma
  -- SOBRECARGA em vez de substituir — a contagem subiu e a linha 7 pegou. Mas
  -- no caso oposto (a antiga é derrubada e a nova nasce com a assinatura
  -- errada), a contagem não muda e NADA acusaria.
  --
  -- Esta linha compara a lista INTEIRA de assinaturas com a que o
  -- `financeiro_01_schema.sql` afirma criar. É a mesma filosofia dos outros
  -- números escritos à mão: a comparação entre a AFIRMAÇÃO e o banco.
  SELECT 17, 'ASSINATURA', 'Funcoes com assinatura diferente da que o schema declara',
         '0', (SELECT count(*)::text FROM (
                 SELECT f.proname, pg_get_function_identity_arguments(f.oid) AS args
                   FROM funcoes f
                 EXCEPT
                 SELECT e.nome, e.args FROM assinaturas_esperadas e) x)
),


-- ---------------------------------------------------------------------------
-- O DETALHE — só aparece quando há culpado. Nenhuma linha DETALHE é boa notícia.
-- ---------------------------------------------------------------------------
detalhe AS (
  -- 17/09/2026 — o culpado da linha 17, com a assinatura que o banco tem e a
  -- que o schema esperava. Sem isto, "1 funcao diverge" manda procurar em 24.
  SELECT 117 AS n, 'ASSINATURA' AS bloco,
         'Assinatura fora do contrato: ' || f.proname AS o_que_foi_conferido,
         COALESCE((SELECT e.args FROM assinaturas_esperadas e WHERE e.nome = f.proname),
                  'NAO DEVERIA EXISTIR') AS esperado,
         pg_get_function_identity_arguments(f.oid) AS encontrado
    FROM funcoes f
   WHERE NOT EXISTS (
     SELECT 1 FROM assinaturas_esperadas e
      WHERE e.nome = f.proname
        AND e.args = pg_get_function_identity_arguments(f.oid))
  UNION ALL
  -- E o contrário: o schema declara uma funcao que o banco NAO tem.
  SELECT 118, 'ASSINATURA', 'Funcao declarada pelo schema e AUSENTE no banco: ' || e.nome,
         e.args, 'nao existe'
    FROM assinaturas_esperadas e
   WHERE NOT EXISTS (
     SELECT 1 FROM funcoes f
      WHERE f.proname = e.nome
        AND pg_get_function_identity_arguments(f.oid) = e.args)
  UNION ALL
  SELECT 107 AS n, 'SOBRECARGA' AS bloco,
         'Funcao com assinatura repetida: ' || proname AS o_que_foi_conferido,
         'uma so' AS esperado, count(*)::text || ' vivas' AS encontrado
    FROM funcoes GROUP BY proname HAVING count(*) > 1
  UNION ALL
  SELECT 108, 'SEGUNDA TRANCA', 'Aberta ao anonimo: ' || proname, 'fechada', 'ABERTA'
    FROM alcance WHERE por_anon OR por_public
  UNION ALL
  SELECT 109, 'CAMINHO FELIZ', 'Funcao de cliente SEM alcance do app: ' || a.proname,
         'alcancavel', 'sem EXECUTE'
    FROM alcance a
   WHERE NOT a.por_app
     AND a.proname NOT IN (SELECT proname FROM internas)
  UNION ALL
  SELECT 110, 'PORTA INTERNA', 'Funcao interna exposta: ' || a.proname, 'sem GRANT', 'COM GRANT'
    FROM alcance a JOIN internas i USING (proname) WHERE a.por_app
  UNION ALL
  SELECT 111, 'RLS', 'Tabela sem RLS: ' || relname, 'ligado', 'DESLIGADO'
    FROM tabelas WHERE NOT relrowsecurity
  UNION ALL
  SELECT 112, 'RLS', 'Tabela com RLS e sem policy: ' || t.relname, 'ao menos uma', 'nenhuma'
    FROM tabelas t
   WHERE t.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM politicas p WHERE p.relname = t.relname)
  UNION ALL
  SELECT 113, 'RLS', 'Policy sem TO: ' || polname || ' (' || relname || ')',
         'TO explicito', 'PUBLIC'
    FROM politicas WHERE polroles = '{0}'
  UNION ALL
  SELECT 114, 'SEARCH_PATH', 'Definer sem search_path: ' || proname, 'SET search_path', 'ausente'
    FROM funcoes
   WHERE prosecdef
     AND (proconfig IS NULL
          OR NOT EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search\_path=%'))
  UNION ALL
  SELECT 116, 'AMARRAS', 'Tabela do modulo SEM chave para tenants: ' || t.relname,
         'tem chave', 'SOLTA'
    FROM tabelas t
   WHERE NOT EXISTS (SELECT 1 FROM fks_para_a_plataforma f
                      WHERE f.de = t.relname AND f.para = 'tenants')
  UNION ALL
  SELECT 115, 'RN-29', 'Chave simples entre tabelas do modulo: ' || conname
         || ' (' || de || ' -> ' || para || ')', '2 colunas', colunas::text || ' coluna'
    FROM fks_do_modulo WHERE colunas < 2
),

tudo AS (
  SELECT n, bloco, o_que_foi_conferido, esperado, encontrado,
         CASE WHEN esperado = encontrado THEN 'OK' ELSE 'DIVERGE' END AS veredito
    FROM placar
  UNION ALL
  SELECT n, bloco, o_que_foi_conferido, esperado, encontrado, 'DETALHE'
    FROM detalhe
)

-- ⚠️ A ORDENAÇÃO VEM DE UMA COLUNA, NÃO DE UMA EXPRESSÃO. `ORDER BY` com
-- expressão depois de um `UNION` não compila no PostgreSQL — por isso cada
-- ramo carrega o próprio `n`.
SELECT n AS "#", bloco, o_que_foi_conferido AS "o que foi conferido",
       esperado, encontrado, veredito
  FROM tudo
 ORDER BY n, o_que_foi_conferido;
