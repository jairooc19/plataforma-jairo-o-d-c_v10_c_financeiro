-- ===========================================================================
-- 💰 MÓDULO CONTROLE FINANCEIRO — SCHEMA (PJODC v10)
-- Local: supabase/criar-bd-financeiro/financeiro_01_schema.sql
-- ===========================================================================
--
-- Especificação: `_estudos/modulo-financeiro-especificacao.html` (aprovada em
-- 12/09/2026). As regras citadas como RN-xx estão na seção 17 dela.
--
-- ORDEM DE EXECUÇÃO:
--   1) financeiro_00_reset.sql   ← só para demolir; dispensável em banco limpo
--   2) financeiro_01_schema.sql  ← este arquivo
--   3) financeiro_02_seed.sql    ← grava o módulo no catálogo da plataforma
--   4) supabase/testes/teste_financeiro.sql  ← prova as travas
--
-- ⚠️ ESTE ARQUIVO DEPENDE DA PLATAFORMA. Ele referencia `tenants`, `users`,
-- `tenant_members` e usa `check_is_tenant_member`, `check_is_tenant_owner` e
-- `modulo_contratado`. Rode `plataforma_01_schema.sql` antes.
--
-- ⚠️ E NÃO ALTERA NADA DA PLATAFORMA (regra R5 do `MODULOS.md`): só cria
-- objetos com o prefixo `fin_` e aponta para a plataforma por chave
-- estrangeira. Desplugar o módulo é rodar o `financeiro_00_reset.sql` e apagar
-- as 5 pastas.
--
-- O QUE ESTE ARQUIVO CRIA
--   4 tabelas · 16 funções · 4 RLS ENABLE · 8 policies · 9 triggers
-- ===========================================================================


-- ===========================================================================
-- 1. FUNÇÃO DE APOIO — NORMALIZAÇÃO DE NOME
-- ===========================================================================

-- ⚠️ POR QUE ESTA FUNÇÃO EXISTE, EM VEZ DE USAR `unaccent()` DIRETO: o índice
-- único que garante "não grava nome repetido" (RN-02) precisa comparar nomes
-- SEM acento e SEM diferença de caixa. Mas o PostgreSQL só aceita função
-- IMMUTABLE em índice e em coluna gerada — e `unaccent(text)` é declarada
-- STABLE, porque depende do dicionário em uso.
--
-- A saída é passar o dicionário explicitamente: `unaccent(regdictionary, text)`
-- É IMMUTABLE. Esta função apenas amarra o dicionário e sobe o texto para
-- maiúsculas. Sem ela, "ÁGUA" e "AGUA" seriam dois cadastros diferentes.
CREATE OR REPLACE FUNCTION public.fin_normalizar(p_texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(btrim(public.unaccent('public.unaccent'::regdictionary, coalesce(p_texto, ''))));
$$;


-- ===========================================================================
-- 2. TABELAS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 2.1 CONTAS MOVIMENTO — onde o dinheiro está
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_contas_movimento (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    nome       text NOT NULL CHECK (btrim(nome) <> ''),          -- RN-01
    -- Coluna gerada: é ela que o índice único usa (RN-02).
    nome_normalizado text GENERATED ALWAYS AS (public.fin_normalizar(nome)) STORED,

    tipo       text NOT NULL CHECK (tipo IN ('CAIXA', 'BANCO', 'OUTRAS')),

    -- ⚠️ PODE SER NEGATIVO, de propósito (RN-08): conta corrente no vermelho é
    -- um saldo de abertura legítimo. Por isso NÃO há CHECK de sinal aqui — ao
    -- contrário do valor do lançamento, que é sempre positivo (RN-15).
    saldo_abertura_centavos bigint NOT NULL DEFAULT 0,

    is_active  boolean NOT NULL DEFAULT true,                    -- RN-06
    criado_por uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- RN-02: único por empresa, ignorando acento e caixa
    CONSTRAINT fin_contas_movimento_nome_unico UNIQUE (tenant_id, nome_normalizado),
    -- ⚠️ ALVO DA CHAVE COMPOSTA (RN-29). Sem este UNIQUE, a FK composta de
    -- `fin_lancamentos` não pode existir.
    CONSTRAINT fin_contas_movimento_tenant_id_unico UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_fin_cm_tenant_ativo
    ON public.fin_contas_movimento (tenant_id, is_active, nome);

-- ---------------------------------------------------------------------------
-- 2.2 CONTAS IDENTIFICADORAS — por que o dinheiro se moveu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_contas_identificadoras (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    nome       text NOT NULL CHECK (btrim(nome) <> ''),
    nome_normalizado text GENERATED ALWAYS AS (public.fin_normalizar(nome)) STORED,

    tipo       text NOT NULL CHECK (tipo IN ('DESPESA', 'RECEITA', 'OUTRAS')),
    is_active  boolean NOT NULL DEFAULT true,

    -- ⚠️ RN-30: a categoria "TRANSFERÊNCIA ENTRE CONTAS" é criada pelo sistema
    -- e não pode ser renomeada, ter o tipo alterado, ser desativada nem
    -- excluída. Se pudesse, bastaria mudá-la para DESPESA para inflar todos os
    -- relatórios, ou desativá-la para quebrar a próxima transferência.
    is_sistema boolean NOT NULL DEFAULT false,

    criado_por uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fin_contas_ident_nome_unico UNIQUE (tenant_id, nome_normalizado),
    CONSTRAINT fin_contas_ident_tenant_id_unico UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_fin_ci_tenant_ativo
    ON public.fin_contas_identificadoras (tenant_id, is_active, nome);

-- ---------------------------------------------------------------------------
-- 2.3 LANÇAMENTOS — o movimento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_lancamentos (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    conta_movimento_id      uuid NOT NULL,
    conta_identificadora_id uuid NOT NULL,

    -- ⚠️ A "FOTOGRAFIA" DOS TIPOS (RN-10). O tipo é gravado aqui, e não lido do
    -- cadastro na hora de mostrar. Isso mantém relatórios antigos estáveis — e
    -- a RN-07 (não alterar o tipo de um cadastro que já tem lançamento) garante
    -- que a fotografia nunca discorde do cadastro.
    tipo_conta_movimento      text NOT NULL CHECK (tipo_conta_movimento IN ('CAIXA', 'BANCO', 'OUTRAS')),
    tipo_conta_identificadora text NOT NULL CHECK (tipo_conta_identificadora IN ('DESPESA', 'RECEITA', 'OUTRAS')),

    -- ⚠️ `date`, NUNCA `timestamptz`: é data de calendário. Com `timestamptz`,
    -- um lançamento de 01/09 vira 31/08 conforme o fuso de quem lê.
    data_movimento date NOT NULL,

    ordem_extrato  integer NULL CHECK (ordem_extrato IS NULL OR ordem_extrato > 0),

    tipo_movimento text NOT NULL CHECK (tipo_movimento IN ('ENTRADA', 'SAIDA')),
    propriedade    text NOT NULL CHECK (propriedade IN ('PROPRIO', 'TERCEIROS')),
    regime         text NOT NULL CHECK (regime IN ('CAIXA', 'COMPETENCIA')),

    -- ⚠️ CENTAVOS INTEIROS, SEMPRE POSITIVO (RN-15). O sinal vem do
    -- `tipo_movimento`. Duas razões: ponto flutuante erra ao somar 300 linhas
    -- (0.1 + 0.2 <> 0.3), e "SAÍDA de -100" seria ambíguo.
    valor_centavos bigint NOT NULL CHECK (valor_centavos > 0),

    historico text NULL CHECK (historico IS NULL OR length(historico) <= 200),
    conferido boolean NOT NULL DEFAULT false,                    -- RN-20

    -- As duas pernas de uma transferência compartilham este identificador.
    transferencia_id uuid NULL,

    criado_por uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,  -- RN-22
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- ⚠️ CHAVES COMPOSTAS (RN-29) — incluem o `tenant_id`. É isto que impede um
    -- lançamento da matriz apontar para a conta da filial. Provado em
    -- `supabase/testes/ambiente-local/prova-chave-composta.sql`: a trava vale
    -- também no UPDATE que tente trocar só a empresa.
    CONSTRAINT fin_lanc_conta_movimento_fk
      FOREIGN KEY (tenant_id, conta_movimento_id)
      REFERENCES public.fin_contas_movimento (tenant_id, id) ON DELETE RESTRICT,

    CONSTRAINT fin_lanc_conta_identificadora_fk
      FOREIGN KEY (tenant_id, conta_identificadora_id)
      REFERENCES public.fin_contas_identificadoras (tenant_id, id) ON DELETE RESTRICT
);

-- O índice do extrato: empresa → conta → data → ordem. É a consulta mais usada.
CREATE INDEX IF NOT EXISTS idx_fin_lanc_extrato
    ON public.fin_lancamentos (tenant_id, conta_movimento_id, data_movimento, ordem_extrato);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_periodo
    ON public.fin_lancamentos (tenant_id, data_movimento);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_identificadora
    ON public.fin_lancamentos (tenant_id, conta_identificadora_id);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_usuario
    ON public.fin_lancamentos (tenant_id, criado_por);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_transferencia
    ON public.fin_lancamentos (transferencia_id) WHERE transferencia_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2.4 FECHAMENTOS — uma linha por conta (RN-24)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_fechamentos (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    conta_movimento_id uuid NOT NULL,
    fechado_ate date NOT NULL,
    fechado_por uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    observacao  text NULL CHECK (observacao IS NULL OR length(observacao) <= 200),

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fin_fechamentos_conta_unica UNIQUE (tenant_id, conta_movimento_id),
    CONSTRAINT fin_fechamentos_conta_fk
      FOREIGN KEY (tenant_id, conta_movimento_id)
      REFERENCES public.fin_contas_movimento (tenant_id, id) ON DELETE CASCADE
);


-- ===========================================================================
-- 3. ROW LEVEL SECURITY
-- ===========================================================================
ALTER TABLE public.fin_contas_movimento      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_contas_identificadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_lancamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_fechamentos           ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- 4. FUNÇÕES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 4.1 A PERMISSÃO — chamada por todas as outras (RN-25)
-- ---------------------------------------------------------------------------
--
-- ⚠️ ESCONDER BOTÃO NÃO É CONTROLE DE ACESSO. Toda função que grava começa
-- perguntando aqui. A tela apenas reflete o que o banco permitiria.
--
-- Regra: o Proprietário tem tudo (desde que a empresa tenha contratado o
-- módulo); o Dependente tem exatamente o que estiver em
-- `module_configs->'financeiro'->'permissoes'`.
CREATE OR REPLACE FUNCTION public.fin_pode(p_tenant_id uuid, p_permissao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.modulo_contratado(p_tenant_id, 'financeiro')
     AND EXISTS (
       SELECT 1
         FROM public.tenant_members m
        WHERE m.tenant_id = p_tenant_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
          AND (
                m.role = 'OWNER'
             OR (
                  'financeiro' = ANY(m.allowed_modules)
                  AND COALESCE((m.module_configs -> 'financeiro' ->> 'ativo')::boolean, false)
                  AND (m.module_configs -> 'financeiro' -> 'permissoes') ? p_permissao
                )
              )
     );
$$;

-- ---------------------------------------------------------------------------
-- 4.2 PERÍODO FECHADO? (RN-24)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_periodo_fechado(p_conta_id uuid, p_data date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fin_fechamentos f
     WHERE f.conta_movimento_id = p_conta_id
       AND p_data <= f.fechado_ate
  );
$$;

-- ---------------------------------------------------------------------------
-- 4.3 A PRÓXIMA ORDEM LIVRE DO DIA (RN-11)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_proxima_ordem(p_conta_id uuid, p_data date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(l.ordem_extrato), 0) + 1
    FROM public.fin_lancamentos l
   WHERE l.conta_movimento_id = p_conta_id
     AND l.data_movimento = p_data;
$$;

-- ---------------------------------------------------------------------------
-- 4.4 BUSCA DE CADASTROS — até 4 sugestões, em qualquer posição, sem acento
-- ---------------------------------------------------------------------------
-- ⚠️ SÓ CADASTROS ATIVOS (RN-06), E A FALTA DISSO ERA UM FURO REAL (14/09/2026).
-- A RN-06 diz: "conta desativada some das listas de lançamento novo, mas
-- continua no histórico e no extrato". As LISTAS da tela já respeitavam — elas
-- consultam a tabela com `is_active = true`. Estas duas funções, não: sem o
-- filtro, um cadastro desativado NÃO aparecia ao abrir a lista e APARECIA ao
-- digitar o nome. E `fin_gravar_lancamento` confere existência, não situação —
-- ou seja, dava para lançar numa conta desativada desde que se chegasse a ela
-- digitando.
--
-- ⚠️ O `ORDER BY c.is_active DESC` FICA, e não é sobra: ele não custa nada e
-- documenta a intenção de que ativo vem primeiro, caso um dia o filtro precise
-- virar parâmetro (uma tela de MANUTENÇÃO de cadastros, por exemplo, quereria
-- ver os dois).
--
-- ⚠️ O LANÇAMENTO ANTIGO NÃO É AFETADO. O extrato e a pesquisa leem a tabela
-- direto; quem desativa uma conta continua vendo tudo o que ela já movimentou.
CREATE OR REPLACE FUNCTION public.fin_buscar_contas_movimento(p_tenant_id uuid, p_texto text)
RETURNS TABLE (id uuid, nome text, tipo text, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'cm_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver contas movimento.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT c.id, c.nome, c.tipo, c.is_active
      FROM public.fin_contas_movimento c
     WHERE c.tenant_id = p_tenant_id
       AND c.is_active = true                                   -- RN-06
       AND c.nome_normalizado LIKE '%' || public.fin_normalizar(p_texto) || '%'
     ORDER BY c.is_active DESC, c.nome
     LIMIT 4;
END;
$$;

CREATE OR REPLACE FUNCTION public.fin_buscar_identificadoras(p_tenant_id uuid, p_texto text)
RETURNS TABLE (id uuid, nome text, tipo text, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'ci_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver contas identificadoras.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT c.id, c.nome, c.tipo, c.is_active
      FROM public.fin_contas_identificadoras c
     WHERE c.tenant_id = p_tenant_id
       AND c.is_active = true                                   -- RN-06
       AND c.nome_normalizado LIKE '%' || public.fin_normalizar(p_texto) || '%'
     ORDER BY c.is_active DESC, c.nome
     LIMIT 4;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.5 GRAVAR CONTA MOVIMENTO (RN-01, 02, 07, 25)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_gravar_conta_movimento(
  p_tenant_id uuid,
  p_id        uuid,          -- null = nova
  p_nome      text,
  p_tipo      text,
  p_saldo_abertura_centavos bigint DEFAULT 0,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id       uuid;
  v_tipo_old text;
  v_tem_lanc boolean;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'cm_gravar') THEN
    RAISE EXCEPTION 'Sem permissao para gravar contas movimento.' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.fin_contas_movimento
           (tenant_id, nome, tipo, saldo_abertura_centavos, is_active, criado_por)
    VALUES (p_tenant_id, upper(btrim(p_nome)), p_tipo, COALESCE(p_saldo_abertura_centavos, 0),
            COALESCE(p_is_active, true), auth.uid())
    RETURNING id INTO v_id;

  ELSE
    SELECT tipo INTO v_tipo_old
      FROM public.fin_contas_movimento
     WHERE id = p_id AND tenant_id = p_tenant_id;

    IF v_tipo_old IS NULL THEN
      RAISE EXCEPTION 'Conta movimento nao encontrada nesta empresa.' USING ERRCODE = '23503';
    END IF;

    -- RN-07: o tipo não muda se já houver lançamento — é o que mantém a
    -- "fotografia" gravada nos lançamentos sempre igual ao cadastro.
    IF v_tipo_old IS DISTINCT FROM p_tipo THEN
      SELECT EXISTS (SELECT 1 FROM public.fin_lancamentos WHERE conta_movimento_id = p_id)
        INTO v_tem_lanc;
      IF v_tem_lanc THEN
        RAISE EXCEPTION 'Nao e possivel alterar o tipo: ja existem lancamentos com este cadastro. Desative este e crie outro com o tipo correto.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    UPDATE public.fin_contas_movimento
       SET nome = upper(btrim(p_nome)),
           tipo = p_tipo,
           saldo_abertura_centavos = COALESCE(p_saldo_abertura_centavos, saldo_abertura_centavos),
           is_active = COALESCE(p_is_active, is_active)
     WHERE id = p_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_id;
  END IF;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.6 GRAVAR CONTA IDENTIFICADORA (RN-01, 02, 07, 25, 30)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_gravar_identificadora(
  p_tenant_id uuid,
  p_id        uuid,
  p_nome      text,
  p_tipo      text,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_tipo_old  text;
  v_sistema   boolean;
  v_tem_lanc  boolean;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'ci_gravar') THEN
    RAISE EXCEPTION 'Sem permissao para gravar contas identificadoras.' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.fin_contas_identificadoras
           (tenant_id, nome, tipo, is_active, criado_por)
    VALUES (p_tenant_id, upper(btrim(p_nome)), p_tipo, COALESCE(p_is_active, true), auth.uid())
    RETURNING id INTO v_id;

  ELSE
    SELECT tipo, is_sistema INTO v_tipo_old, v_sistema
      FROM public.fin_contas_identificadoras
     WHERE id = p_id AND tenant_id = p_tenant_id;

    IF v_tipo_old IS NULL THEN
      RAISE EXCEPTION 'Conta identificadora nao encontrada nesta empresa.' USING ERRCODE = '23503';
    END IF;

    -- RN-30: a categoria do sistema não se mexe.
    IF v_sistema THEN
      RAISE EXCEPTION 'Esta categoria e do sistema e nao pode ser alterada.' USING ERRCODE = '42501';
    END IF;

    IF v_tipo_old IS DISTINCT FROM p_tipo THEN
      SELECT EXISTS (SELECT 1 FROM public.fin_lancamentos WHERE conta_identificadora_id = p_id)
        INTO v_tem_lanc;
      IF v_tem_lanc THEN
        RAISE EXCEPTION 'Nao e possivel alterar o tipo: ja existem lancamentos com este cadastro. Desative este e crie outro com o tipo correto.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    UPDATE public.fin_contas_identificadoras
       SET nome = upper(btrim(p_nome)),
           tipo = p_tipo,
           is_active = COALESCE(p_is_active, is_active)
     WHERE id = p_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_id;
  END IF;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.6-b IMPORTAR CADASTROS EM LOTE (13/09/2026 — a coluna "A" de um CSV/TSV)
-- ---------------------------------------------------------------------------
--
-- ⚠️ POR QUE ISTO É UMA FUNÇÃO DE BANCO, E NÃO UM LAÇO NA TELA.
-- A tela poderia chamar `fin_gravar_conta_movimento` uma vez por linha. Com um
-- arquivo de 300 nomes isso são 300 idas e voltas à internet — lento, e pior:
-- se a conexão cair na linha 180, metade entrou e ninguém sabe qual metade.
-- Aqui é UMA chamada, e o banco devolve o relatório completo do que fez.
--
-- ⚠️ E POR QUE NÃO É "TUDO OU NADA".
-- Importar 300 cadastros não é uma operação transacional única: cada nome é
-- independente. Recusar as 300 porque 4 já existiam seria hostil. O desenho é
-- **ignorar** o que não pode entrar e **dizer exatamente o que ignorou**.
--
-- ⚠️ SÃO TRÊS ESPÉCIES DE DUPLICATA, E AS TRÊS SÃO TRATADAS:
--   1. o mesmo nome repetido DENTRO do arquivo   → entra uma vez só;
--   2. o nome já cadastrado NO BANCO             → ignorado;
--   3. o mesmo nome escrito diferente            → ver abaixo.
--
-- ⚠️ "ESCRITO DIFERENTE" TAMBÉM É DUPLICATA. A comparação usa
-- `fin_normalizar` — a MESMA função que alimenta a coluna `nome_normalizado` e
-- o índice único (RN-02). Ela tira acento, corta espaços das pontas e passa a
-- maiúsculas. Então "Banco Itaú", " BANCO ITAU " e "banco itau" são o mesmo
-- cadastro. Comparar por igualdade crua deixaria os três passarem pelo filtro e
-- o índice único derrubaria a instrução inteira no fim, sem relatório nenhum.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_importar_contas_movimento(
  p_tenant_id uuid,
  p_tipo      text,
  p_nomes     text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recebidos   integer := COALESCE(array_length(p_nomes, 1), 0);
  v_criados     text[]  := '{}';
  v_existiam    text[]  := '{}';
  v_unicos      integer := 0;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'cm_gravar') THEN
    RAISE EXCEPTION 'Sem permissao para gravar contas movimento.' USING ERRCODE = '42501';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('CAIXA', 'BANCO', 'OUTRAS') THEN
    RAISE EXCEPTION 'Tipo invalido para conta movimento: %. Use CAIXA, BANCO ou OUTRAS.', p_tipo
      USING ERRCODE = '23514';
  END IF;

  -- ⚠️ TETO DE SEGURANÇA. Um arquivo colado por engano (um extrato inteiro, por
  -- exemplo) travaria a transação e o navegador junto. 5.000 é generoso para
  -- cadastro e pequeno para acidente.
  IF v_recebidos > 5000 THEN
    RAISE EXCEPTION 'Importacao limitada a 5000 linhas por vez (recebidas %).', v_recebidos
      USING ERRCODE = '22023';
  END IF;

  IF v_recebidos = 0 THEN
    RETURN json_build_object('success', true, 'recebidos', 0, 'criados', 0,
                             'ja_existiam', 0, 'repetidos_no_arquivo', 0, 'vazios', 0,
                             'nomes_criados', '[]'::json, 'nomes_ja_existiam', '[]'::json);
  END IF;

  -- Uma passagem só: limpa, tira repetidos internos (mantendo a PRIMEIRA
  -- ocorrência, que é a ordem em que a pessoa vê na prévia), separa o que já
  -- existe do que é novo, e insere os novos.
  WITH bruto AS (
    SELECT t.ord,
           upper(btrim(t.n))          AS nome,
           public.fin_normalizar(t.n) AS chave
      FROM unnest(p_nomes) WITH ORDINALITY AS t(n, ord)
  ),
  validos AS (
    SELECT * FROM bruto WHERE chave <> ''
  ),
  -- ⚠️ `DISTINCT ON` exige que o `ORDER BY` comece pela mesma expressão. O
  -- `ord` em segundo lugar é o que garante "fica a primeira ocorrência".
  unicos AS (
    SELECT DISTINCT ON (chave) ord, nome, chave
      FROM validos
     ORDER BY chave, ord
  ),
  ja_existentes AS (
    SELECT u.* FROM unicos u
     WHERE EXISTS (SELECT 1 FROM public.fin_contas_movimento c
                    WHERE c.tenant_id = p_tenant_id AND c.nome_normalizado = u.chave)
  ),
  novos AS (
    SELECT u.* FROM unicos u
     WHERE NOT EXISTS (SELECT 1 FROM public.fin_contas_movimento c
                        WHERE c.tenant_id = p_tenant_id AND c.nome_normalizado = u.chave)
  ),
  inseridos AS (
    INSERT INTO public.fin_contas_movimento
           (tenant_id, nome, tipo, saldo_abertura_centavos, is_active, criado_por)
    SELECT p_tenant_id, n.nome, p_tipo, 0, true, auth.uid()
      FROM novos n
    RETURNING nome
  )
  SELECT COALESCE((SELECT array_agg(nome ORDER BY nome) FROM inseridos), '{}'),
         COALESCE((SELECT array_agg(nome ORDER BY nome) FROM ja_existentes), '{}'),
         (SELECT count(*) FROM unicos)
    INTO v_criados, v_existiam, v_unicos;

  RETURN json_build_object(
    'success', true,
    'recebidos', v_recebidos,
    'criados', COALESCE(array_length(v_criados, 1), 0),
    'ja_existiam', COALESCE(array_length(v_existiam, 1), 0),
    -- Repetidos no arquivo = linhas com conteúdo menos nomes distintos.
    'repetidos_no_arquivo', GREATEST(
        (SELECT count(*) FROM unnest(p_nomes) AS n WHERE public.fin_normalizar(n) <> '')::integer - v_unicos, 0),
    'vazios', v_recebidos
        - (SELECT count(*) FROM unnest(p_nomes) AS n WHERE public.fin_normalizar(n) <> '')::integer,
    'nomes_criados', to_json(v_criados),
    'nomes_ja_existiam', to_json(v_existiam)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.6-c IMPORTAR CONTAS IDENTIFICADORAS EM LOTE
-- ---------------------------------------------------------------------------
--
-- Gêmea da anterior, com UMA diferença que não é detalhe:
--
-- ⚠️ O NOME "TRANSFERÊNCIA ENTRE CONTAS" É RESERVADO E FICA DE FORA.
-- Essa categoria é criada pelo próprio banco, com `is_sistema = true`, na
-- primeira transferência da empresa (RN-30). Se uma importação a criasse antes,
-- como categoria comum, a primeira transferência tentaria inserir a dela e
-- bateria no índice único — **a transferência falharia para sempre**, com um
-- erro que não diz nada sobre importação. Melhor recusar o nome aqui, onde a
-- causa é visível, e contar isso no relatório.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_importar_identificadoras(
  p_tenant_id uuid,
  p_tipo      text,
  p_nomes     text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recebidos  integer := COALESCE(array_length(p_nomes, 1), 0);
  v_criados    text[]  := '{}';
  v_existiam   text[]  := '{}';
  v_reservados text[]  := '{}';
  v_unicos     integer := 0;
  v_reservado  text    := public.fin_normalizar('TRANSFERENCIA ENTRE CONTAS');
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'ci_gravar') THEN
    RAISE EXCEPTION 'Sem permissao para gravar contas identificadoras.' USING ERRCODE = '42501';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('DESPESA', 'RECEITA', 'OUTRAS') THEN
    RAISE EXCEPTION 'Tipo invalido para conta identificadora: %. Use DESPESA, RECEITA ou OUTRAS.', p_tipo
      USING ERRCODE = '23514';
  END IF;

  IF v_recebidos > 5000 THEN
    RAISE EXCEPTION 'Importacao limitada a 5000 linhas por vez (recebidas %).', v_recebidos
      USING ERRCODE = '22023';
  END IF;

  IF v_recebidos = 0 THEN
    RETURN json_build_object('success', true, 'recebidos', 0, 'criados', 0,
                             'ja_existiam', 0, 'repetidos_no_arquivo', 0, 'vazios', 0,
                             'reservados', 0,
                             'nomes_criados', '[]'::json, 'nomes_ja_existiam', '[]'::json,
                             'nomes_reservados', '[]'::json);
  END IF;

  WITH bruto AS (
    SELECT t.ord,
           upper(btrim(t.n))          AS nome,
           public.fin_normalizar(t.n) AS chave
      FROM unnest(p_nomes) WITH ORDINALITY AS t(n, ord)
  ),
  validos AS (
    SELECT * FROM bruto WHERE chave <> ''
  ),
  unicos AS (
    SELECT DISTINCT ON (chave) ord, nome, chave
      FROM validos
     ORDER BY chave, ord
  ),
  reservados AS (
    SELECT u.* FROM unicos u WHERE u.chave = v_reservado
  ),
  candidatos AS (
    SELECT u.* FROM unicos u WHERE u.chave <> v_reservado
  ),
  ja_existentes AS (
    SELECT c.* FROM candidatos c
     WHERE EXISTS (SELECT 1 FROM public.fin_contas_identificadoras x
                    WHERE x.tenant_id = p_tenant_id AND x.nome_normalizado = c.chave)
  ),
  novos AS (
    SELECT c.* FROM candidatos c
     WHERE NOT EXISTS (SELECT 1 FROM public.fin_contas_identificadoras x
                        WHERE x.tenant_id = p_tenant_id AND x.nome_normalizado = c.chave)
  ),
  inseridos AS (
    INSERT INTO public.fin_contas_identificadoras
           (tenant_id, nome, tipo, is_active, criado_por)
    SELECT p_tenant_id, n.nome, p_tipo, true, auth.uid()
      FROM novos n
    RETURNING nome
  )
  SELECT COALESCE((SELECT array_agg(nome ORDER BY nome) FROM inseridos), '{}'),
         COALESCE((SELECT array_agg(nome ORDER BY nome) FROM ja_existentes), '{}'),
         COALESCE((SELECT array_agg(nome ORDER BY nome) FROM reservados), '{}'),
         (SELECT count(*) FROM unicos)
    INTO v_criados, v_existiam, v_reservados, v_unicos;

  RETURN json_build_object(
    'success', true,
    'recebidos', v_recebidos,
    'criados', COALESCE(array_length(v_criados, 1), 0),
    'ja_existiam', COALESCE(array_length(v_existiam, 1), 0),
    'reservados', COALESCE(array_length(v_reservados, 1), 0),
    'repetidos_no_arquivo', GREATEST(
        (SELECT count(*) FROM unnest(p_nomes) AS n WHERE public.fin_normalizar(n) <> '')::integer - v_unicos, 0),
    'vazios', v_recebidos
        - (SELECT count(*) FROM unnest(p_nomes) AS n WHERE public.fin_normalizar(n) <> '')::integer,
    'nomes_criados', to_json(v_criados),
    'nomes_ja_existiam', to_json(v_existiam),
    'nomes_reservados', to_json(v_reservados)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.7 GRAVAR LANÇAMENTO (RN-10, 11, 12, 15, 22, 24, 25, 29)
-- ---------------------------------------------------------------------------
--
-- ⚠️ É UMA FUNÇÃO SÓ porque a gravação é multi-passo: validar permissão,
-- conferir período fechado, ler os tipos das contas (a fotografia) e, se a
-- ordem informada já existir no dia, DESLOCAR os seguintes. Em chamadas
-- separadas, uma falha no meio deixaria o dia com duas ordens iguais.
CREATE OR REPLACE FUNCTION public.fin_gravar_lancamento(
  p_tenant_id uuid,
  p_id        uuid,          -- null = novo
  p_conta_movimento_id      uuid,
  p_conta_identificadora_id uuid,
  p_data_movimento date,
  p_ordem_extrato  integer,
  p_tipo_movimento text,
  p_propriedade    text,
  p_regime         text,
  p_valor_centavos bigint,
  p_historico      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_tipo_cm   text;
  v_tipo_ci   text;
  v_ordem     integer;
  v_criador   uuid;
  v_conta_old uuid;
  v_data_old  date;
  v_permissao text;
BEGIN
  -- 1) Permissão: criar é uma; editar depende de ser o autor ou não.
  IF p_id IS NULL THEN
    v_permissao := 'lc_criar';
    IF NOT public.fin_pode(p_tenant_id, v_permissao) THEN
      RAISE EXCEPTION 'Sem permissao para criar lancamento.' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT criado_por, conta_movimento_id, data_movimento
      INTO v_criador, v_conta_old, v_data_old
      FROM public.fin_lancamentos
     WHERE id = p_id AND tenant_id = p_tenant_id;

    IF v_criador IS NULL THEN
      RAISE EXCEPTION 'Lancamento nao encontrado nesta empresa.' USING ERRCODE = '23503';
    END IF;

    IF NOT (
      public.fin_pode(p_tenant_id, 'lc_editar_todos')
      OR (v_criador = auth.uid() AND public.fin_pode(p_tenant_id, 'lc_editar_proprios'))
    ) THEN
      RAISE EXCEPTION 'Sem permissao para editar este lancamento.' USING ERRCODE = '42501';
    END IF;

    -- RN-24: a data ANTIGA também não pode estar em período fechado, senão
    -- daria para tirar um lançamento de um mês fechado movendo-o de lugar.
    IF public.fin_periodo_fechado(v_conta_old, v_data_old) THEN
      RAISE EXCEPTION 'O periodo desta conta esta fechado ate a data do lancamento original.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2) Período fechado no destino (RN-24)
  IF public.fin_periodo_fechado(p_conta_movimento_id, p_data_movimento) THEN
    RAISE EXCEPTION 'O periodo desta conta esta fechado nesta data.' USING ERRCODE = '42501';
  END IF;

  -- 3) A fotografia dos tipos (RN-10). O SELECT já garante que as contas são
  --    desta empresa; a chave composta (RN-29) garante no INSERT também.
  SELECT tipo INTO v_tipo_cm FROM public.fin_contas_movimento
   WHERE id = p_conta_movimento_id AND tenant_id = p_tenant_id;
  SELECT tipo INTO v_tipo_ci FROM public.fin_contas_identificadoras
   WHERE id = p_conta_identificadora_id AND tenant_id = p_tenant_id;

  IF v_tipo_cm IS NULL OR v_tipo_ci IS NULL THEN
    RAISE EXCEPTION 'Conta movimento ou identificadora inexistente nesta empresa.' USING ERRCODE = '23503';
  END IF;

  -- 4) A ordem (RN-11 e RN-12)
  v_ordem := p_ordem_extrato;
  IF v_ordem IS NOT NULL THEN
    -- Se a ordem já existe no dia, os seguintes descem um degrau.
    IF EXISTS (
      SELECT 1 FROM public.fin_lancamentos
       WHERE conta_movimento_id = p_conta_movimento_id
         AND data_movimento = p_data_movimento
         AND ordem_extrato = v_ordem
         AND (p_id IS NULL OR id <> p_id)
    ) THEN
      UPDATE public.fin_lancamentos
         SET ordem_extrato = ordem_extrato + 1
       WHERE conta_movimento_id = p_conta_movimento_id
         AND data_movimento = p_data_movimento
         AND ordem_extrato >= v_ordem
         AND (p_id IS NULL OR id <> p_id);
    END IF;
  END IF;

  -- 5) Grava
  IF p_id IS NULL THEN
    INSERT INTO public.fin_lancamentos (
      tenant_id, conta_movimento_id, conta_identificadora_id,
      tipo_conta_movimento, tipo_conta_identificadora,
      data_movimento, ordem_extrato, tipo_movimento, propriedade, regime,
      valor_centavos, historico, criado_por
    ) VALUES (
      p_tenant_id, p_conta_movimento_id, p_conta_identificadora_id,
      v_tipo_cm, v_tipo_ci,
      p_data_movimento, v_ordem, p_tipo_movimento, p_propriedade, p_regime,
      p_valor_centavos, NULLIF(upper(btrim(COALESCE(p_historico, ''))), ''), auth.uid()
    )
    RETURNING id INTO v_id;
  ELSE
    -- RN-22: `criado_por` NUNCA é alterado — nem aqui, nem em lugar nenhum.
    UPDATE public.fin_lancamentos
       SET conta_movimento_id      = p_conta_movimento_id,
           conta_identificadora_id = p_conta_identificadora_id,
           tipo_conta_movimento      = v_tipo_cm,
           tipo_conta_identificadora = v_tipo_ci,
           data_movimento = p_data_movimento,
           ordem_extrato  = v_ordem,
           tipo_movimento = p_tipo_movimento,
           propriedade    = p_propriedade,
           regime         = p_regime,
           valor_centavos = p_valor_centavos,
           historico      = NULLIF(upper(btrim(COALESCE(p_historico, ''))), '')
     WHERE id = p_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_id;
  END IF;

  RETURN json_build_object('success', true, 'id', v_id, 'ordem', v_ordem);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.8 EXCLUIR LANÇAMENTO (RN-23, 24, 25, 26)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_excluir_lancamento(p_tenant_id uuid, p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_criador  uuid;
  v_conta    uuid;
  v_data     date;
  v_transf   uuid;
  v_apagados integer;
BEGIN
  SELECT criado_por, conta_movimento_id, data_movimento, transferencia_id
    INTO v_criador, v_conta, v_data, v_transf
    FROM public.fin_lancamentos
   WHERE id = p_id AND tenant_id = p_tenant_id;

  IF v_criador IS NULL THEN
    RAISE EXCEPTION 'Lancamento nao encontrado nesta empresa.' USING ERRCODE = '23503';
  END IF;

  IF NOT (
    public.fin_pode(p_tenant_id, 'lc_excluir_todos')
    OR (v_criador = auth.uid() AND public.fin_pode(p_tenant_id, 'lc_excluir_proprios'))
  ) THEN
    RAISE EXCEPTION 'Sem permissao para excluir este lancamento.' USING ERRCODE = '42501';
  END IF;

  IF public.fin_periodo_fechado(v_conta, v_data) THEN
    RAISE EXCEPTION 'O periodo desta conta esta fechado nesta data.' USING ERRCODE = '42501';
  END IF;

  IF v_transf IS NOT NULL THEN
    -- ⚠️ AS DUAS PERNAS SAEM JUNTAS. Apagar só uma deixaria o saldo de uma das
    -- contas errado para sempre — o descontrole que a transferência evita.
    -- Antes, confere o fechamento da OUTRA perna também.
    IF EXISTS (
      SELECT 1 FROM public.fin_lancamentos l
       WHERE l.transferencia_id = v_transf
         AND public.fin_periodo_fechado(l.conta_movimento_id, l.data_movimento)
    ) THEN
      RAISE EXCEPTION 'Uma das contas da transferencia esta com o periodo fechado.' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.fin_lancamentos WHERE transferencia_id = v_transf;
    GET DIAGNOSTICS v_apagados = ROW_COUNT;
  ELSE
    DELETE FROM public.fin_lancamentos WHERE id = p_id;
    GET DIAGNOSTICS v_apagados = ROW_COUNT;
  END IF;

  RETURN json_build_object('success', true, 'apagados', v_apagados, 'era_transferencia', v_transf IS NOT NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.9 TRANSFERÊNCIA ENTRE CONTAS (RN-23, 24, 25, 30, 31)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_transferir(
  p_tenant_id uuid,
  p_conta_origem_id  uuid,
  p_conta_destino_id uuid,
  p_data date,
  p_valor_centavos bigint,
  p_historico text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categoria uuid;
  v_transf    uuid := gen_random_uuid();
  v_hist      text;
  v_tipo_org  text;
  v_tipo_dst  text;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'transferencia') THEN
    RAISE EXCEPTION 'Sem permissao para transferir entre contas.' USING ERRCODE = '42501';
  END IF;

  IF p_conta_origem_id = p_conta_destino_id THEN
    RAISE EXCEPTION 'A conta de destino deve ser diferente da conta de origem.' USING ERRCODE = '23514';
  END IF;

  IF p_valor_centavos IS NULL OR p_valor_centavos <= 0 THEN
    RAISE EXCEPTION 'O valor deve ser maior que zero.' USING ERRCODE = '23514';
  END IF;

  -- RN-24 nas DUAS contas
  IF public.fin_periodo_fechado(p_conta_origem_id, p_data)
     OR public.fin_periodo_fechado(p_conta_destino_id, p_data) THEN
    RAISE EXCEPTION 'Uma das contas esta com o periodo fechado nesta data.' USING ERRCODE = '42501';
  END IF;

  SELECT tipo INTO v_tipo_org FROM public.fin_contas_movimento
   WHERE id = p_conta_origem_id AND tenant_id = p_tenant_id;
  SELECT tipo INTO v_tipo_dst FROM public.fin_contas_movimento
   WHERE id = p_conta_destino_id AND tenant_id = p_tenant_id;

  IF v_tipo_org IS NULL OR v_tipo_dst IS NULL THEN
    RAISE EXCEPTION 'Conta de origem ou destino inexistente nesta empresa.' USING ERRCODE = '23503';
  END IF;

  -- RN-30: a categoria do sistema, criada na primeira transferência da empresa.
  SELECT id INTO v_categoria
    FROM public.fin_contas_identificadoras
   WHERE tenant_id = p_tenant_id AND is_sistema = true
     AND nome_normalizado = public.fin_normalizar('TRANSFERENCIA ENTRE CONTAS');

  IF v_categoria IS NULL THEN
    INSERT INTO public.fin_contas_identificadoras (tenant_id, nome, tipo, is_sistema, criado_por)
    VALUES (p_tenant_id, 'TRANSFERÊNCIA ENTRE CONTAS', 'OUTRAS', true, auth.uid())
    RETURNING id INTO v_categoria;
  END IF;

  v_hist := NULLIF(upper(btrim(COALESCE(p_historico, ''))), '');

  -- ⚠️ AS DUAS PERNAS NUMA TRANSAÇÃO SÓ. E com PROPRIO/CAIXA gravados pelo
  -- sistema (RN-31): a tela não pergunta, e com regime CAIXA a transferência
  -- entra no extrato pela regra geral (RN-19), mantendo o saldo batendo.
  INSERT INTO public.fin_lancamentos (
    tenant_id, conta_movimento_id, conta_identificadora_id,
    tipo_conta_movimento, tipo_conta_identificadora,
    data_movimento, ordem_extrato, tipo_movimento, propriedade, regime,
    valor_centavos, historico, transferencia_id, criado_por
  ) VALUES (
    p_tenant_id, p_conta_origem_id, v_categoria,
    v_tipo_org, 'OUTRAS',
    p_data, public.fin_proxima_ordem(p_conta_origem_id, p_data),
    'SAIDA', 'PROPRIO', 'CAIXA',
    p_valor_centavos, v_hist, v_transf, auth.uid()
  );

  INSERT INTO public.fin_lancamentos (
    tenant_id, conta_movimento_id, conta_identificadora_id,
    tipo_conta_movimento, tipo_conta_identificadora,
    data_movimento, ordem_extrato, tipo_movimento, propriedade, regime,
    valor_centavos, historico, transferencia_id, criado_por
  ) VALUES (
    p_tenant_id, p_conta_destino_id, v_categoria,
    v_tipo_dst, 'OUTRAS',
    p_data, public.fin_proxima_ordem(p_conta_destino_id, p_data),
    'ENTRADA', 'PROPRIO', 'CAIXA',
    p_valor_centavos, v_hist, v_transf, auth.uid()
  );

  RETURN json_build_object('success', true, 'transferencia_id', v_transf, 'categoria_id', v_categoria);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.10 MARCAR COMO CONFERIDO (RN-20, 25)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_marcar_conferido(
  p_tenant_id uuid, p_id uuid, p_conferido boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_linhas integer;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'conciliar') THEN
    RAISE EXCEPTION 'Sem permissao para conciliar.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.fin_lancamentos
     SET conferido = COALESCE(p_conferido, false)
   WHERE id = p_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  RETURN json_build_object('success', v_linhas = 1);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.11 FECHAR E REABRIR PERÍODO (RN-24, 25)
-- ---------------------------------------------------------------------------
--
-- `p_conta_movimento_id` nulo = aplica a TODAS as contas ativas da empresa,
-- numa transação. Não existe "linha especial de todas": a consulta de
-- "esta data está fechada?" olha sempre a linha da conta, e pronto.
CREATE OR REPLACE FUNCTION public.fin_fechar_periodo(
  p_tenant_id uuid,
  p_conta_movimento_id uuid,   -- null = todas
  p_fechado_ate date,
  p_observacao text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_contas integer := 0;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'fechar_periodo') THEN
    RAISE EXCEPTION 'Sem permissao para fechar periodo.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.fin_fechamentos (tenant_id, conta_movimento_id, fechado_ate, fechado_por, observacao)
  SELECT c.tenant_id, c.id, p_fechado_ate, auth.uid(), NULLIF(btrim(COALESCE(p_observacao, '')), '')
    FROM public.fin_contas_movimento c
   WHERE c.tenant_id = p_tenant_id
     AND (p_conta_movimento_id IS NULL OR c.id = p_conta_movimento_id)
     AND (p_conta_movimento_id IS NOT NULL OR c.is_active = true)
  ON CONFLICT (tenant_id, conta_movimento_id)
  DO UPDATE SET fechado_ate = EXCLUDED.fechado_ate,
                fechado_por = EXCLUDED.fechado_por,
                observacao  = EXCLUDED.observacao,
                updated_at  = now();

  GET DIAGNOSTICS v_contas = ROW_COUNT;
  RETURN json_build_object('success', true, 'contas_fechadas', v_contas, 'fechado_ate', p_fechado_ate);
END;
$$;

CREATE OR REPLACE FUNCTION public.fin_reabrir_periodo(
  p_tenant_id uuid,
  p_conta_movimento_id uuid    -- null = todas
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_contas integer := 0;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'fechar_periodo') THEN
    RAISE EXCEPTION 'Sem permissao para reabrir periodo.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.fin_fechamentos
   WHERE tenant_id = p_tenant_id
     AND (p_conta_movimento_id IS NULL OR conta_movimento_id = p_conta_movimento_id);
  GET DIAGNOSTICS v_contas = ROW_COUNT;

  RETURN json_build_object('success', true, 'contas_reabertas', v_contas);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.12 O EXTRATO COM SALDO (RN-17, 19, 21)
-- ---------------------------------------------------------------------------
--
-- ⚠️ O SALDO É CALCULADO AQUI, NO BANCO, e não na tela. Motivo: tela, relatório
-- impresso e exportação TSV chamam esta mesma função — e mostram, portanto, o
-- MESMO saldo. Se a conta morasse na tela, cada consumidor teria a sua cópia da
-- lógica, e o dia em que uma fosse corrigida e a outra não, apareceriam dois
-- saldos para o mesmo mês.
--
-- ⚠️ SÓ REGIME CAIXA ENTRA (RN-19). Lançamento de competência não é dinheiro
-- que andou na conta; se entrasse, o saldo nunca bateria com o extrato do banco
-- — que é o propósito desta tela.
-- ⚠️ O `DROP` ABAIXO NÃO É DESCUIDO — É OBRIGATÓRIO, E FOI APRENDIDO NA MARRA.
-- Em 13/09/2026 esta função ganhou a coluna `usuario` no retorno. O
-- `CREATE OR REPLACE` **não consegue** mudar o RETURNS TABLE de uma função que
-- já existe: ele recusa com
--   "cannot change return type of existing function"
-- (no português do servidor: "não pode mudar o tipo de retorno da função
-- existente"), e a dica que ele dá é justamente "use DROP FUNCTION ... first".
--
-- Sem este DROP, quem já tinha o módulo instalado veria o arquivo inteiro
-- falhar nesta linha — e o schema pararia no meio, com metade aplicada.
--
-- É seguro: derrubar uma função não toca em uma única linha de dado. O `IF
-- EXISTS` cobre a instalação nova, onde ela ainda não existe.
--
-- ⚠️ A ASSINATURA DENTRO DO DROP É A ANTIGA (os parâmetros), não o retorno. No
-- PostgreSQL uma função é identificada pelos PARÂMETROS; o tipo de retorno não
-- faz parte do nome dela. Se um dia os parâmetros mudarem, este DROP precisa
-- listar os antigos, ou não encontra nada para derrubar.
DROP FUNCTION IF EXISTS public.fin_extrato(uuid, uuid, date, date);

CREATE OR REPLACE FUNCTION public.fin_extrato(
  p_tenant_id uuid,
  p_conta_movimento_id uuid,
  p_data_inicial date,
  p_data_final   date
)
RETURNS TABLE (
  linha_tipo       text,      -- INICIAL | LANCAMENTO | TOTAL
  lancamento_id    uuid,
  data_movimento   date,
  ordem_extrato    integer,
  identificadora   text,
  entrada_centavos bigint,
  saida_centavos   bigint,
  saldo_centavos   bigint,
  historico        text,
  conferido        boolean,
  -- 13/09/2026: quem lançou. Pedido do dono do projeto para a CONFERÊNCIA DA
  -- CONTA, que já tinha a coluna na tela de PESQUISAR e não aqui.
  --
  -- ⚠️ VEM DE UM `LEFT JOIN`, e o `LEFT` importa. `criado_por` aponta para
  -- `public.users`, cuja RLS só deixa cada um ver o próprio perfil (e o dono
  -- ver a equipe dele). Com `JOIN` simples, um Dependente veria as linhas dos
  -- colegas SUMIREM do extrato — e um extrato com linhas faltando é pior que
  -- um extrato sem a coluna: o saldo deixaria de bater com a soma visível.
  -- Com `LEFT JOIN`, a linha fica e a coluna vem vazia.
  --
  -- ⚠️ A FUNÇÃO É `SECURITY DEFINER`, então na prática ela lê `users` como dona
  -- do banco e enxerga todo mundo. O `LEFT` é a rede de segurança para o dia em
  -- que isso mudar.
  usuario          text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_inicial bigint;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'extrato_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver o extrato.' USING ERRCODE = '42501';
  END IF;

  IF p_data_inicial IS NULL OR p_data_final IS NULL THEN
    RAISE EXCEPTION 'Informe a data inicial e a data final.' USING ERRCODE = '22023';  -- RN-17
  END IF;

  -- Saldo inicial = abertura da conta + tudo o que é anterior ao período
  SELECT c.saldo_abertura_centavos
       + COALESCE((
           SELECT SUM(CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos
                           ELSE -l.valor_centavos END)
             FROM public.fin_lancamentos l
            WHERE l.conta_movimento_id = c.id
              AND l.regime = 'CAIXA'
              AND l.data_movimento < p_data_inicial
         ), 0)
    INTO v_saldo_inicial
    FROM public.fin_contas_movimento c
   WHERE c.id = p_conta_movimento_id AND c.tenant_id = p_tenant_id;

  IF v_saldo_inicial IS NULL THEN
    RAISE EXCEPTION 'Conta movimento inexistente nesta empresa.' USING ERRCODE = '23503';
  END IF;

  RETURN QUERY
  WITH movimento AS (
    SELECT l.id,
           l.data_movimento,
           l.ordem_extrato,
           ci.nome AS identificadora,
           CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos ELSE 0 END AS entrada,
           CASE WHEN l.tipo_movimento = 'SAIDA'   THEN l.valor_centavos ELSE 0 END AS saida,
           CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos
                ELSE -l.valor_centavos END AS delta,
           l.historico,
           l.conferido,
           l.created_at,
           u.email AS usuario
      FROM public.fin_lancamentos l
      JOIN public.fin_contas_identificadoras ci ON ci.id = l.conta_identificadora_id
      LEFT JOIN public.users u ON u.id = l.criado_por
     WHERE l.conta_movimento_id = p_conta_movimento_id
       AND l.tenant_id = p_tenant_id
       AND l.regime = 'CAIXA'
       AND l.data_movimento BETWEEN p_data_inicial AND p_data_final
  ),
  com_saldo AS (
    SELECT m.*,
           -- ⚠️ `::bigint` NÃO É ENFEITE. No PostgreSQL, `SUM()` sobre `bigint`
           -- devolve `numeric` — é assim de propósito, para que somar muitos
           -- valores grandes não estoure o tipo. Como as colunas de retorno
           -- desta função são `bigint`, sem a conversão o banco recusa com
           -- "structure of query does not match function result type".
           (v_saldo_inicial + SUM(m.delta) OVER (
             -- RN-21: data → ordem (vazios por último) → instante de criação.
             -- O terceiro critério existe para que duas aberturas da mesma tela
             -- nunca mostrem a mesma lista em ordens diferentes.
             ORDER BY m.data_movimento, m.ordem_extrato NULLS LAST, m.created_at
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           ))::bigint AS saldo
      FROM movimento m
  ),
  -- ⚠️ A ORDENAÇÃO SAI NUMA SUBCONSULTA, e não direto no UNION: num
  -- UNION/INTERSECT/EXCEPT o `ORDER BY` só aceita NOMES de colunas do
  -- resultado — expressão ali dá "cláusula UNION/INTERSECT/EXCEPT ORDER BY é
  -- inválida". A coluna `bloco` existe só para manter as três partes na ordem
  -- certa: saldo inicial, lançamentos, totais.
  tudo AS (
    SELECT 1 AS bloco, 'INICIAL'::text AS lt, NULL::uuid AS lid,
           (p_data_inicial - 1) AS dt, NULL::integer AS ord,
           'SALDO INICIAL'::text AS ident, NULL::bigint AS ent, NULL::bigint AS sai,
           v_saldo_inicial AS sal, NULL::text AS hist, NULL::boolean AS conf,
           NULL::text AS usu, NULL::timestamptz AS criado
    UNION ALL
    SELECT 2, 'LANCAMENTO'::text, s.id, s.data_movimento, s.ordem_extrato,
           s.identificadora, NULLIF(s.entrada, 0), NULLIF(s.saida, 0), s.saldo,
           s.historico, s.conferido, s.usuario, s.created_at
      FROM com_saldo s
    UNION ALL
    SELECT 3, 'TOTAL'::text, NULL::uuid, p_data_final, NULL::integer,
           'TOTAIS DO PERIODO'::text,
           COALESCE((SELECT SUM(entrada) FROM com_saldo), 0)::bigint,
           COALESCE((SELECT SUM(saida)   FROM com_saldo), 0)::bigint,
           (v_saldo_inicial + COALESCE((SELECT SUM(delta) FROM com_saldo), 0))::bigint,
           NULL::text, NULL::boolean, NULL::text, NULL::timestamptz
  )
  SELECT t.lt, t.lid, t.dt, t.ord, t.ident, t.ent, t.sai, t.sal, t.hist, t.conf, t.usu
    FROM tudo t
   -- RN-21 outra vez, agora para EXIBIR na mesma ordem em que o saldo foi somado.
   ORDER BY t.bloco, t.dt, t.ord NULLS LAST, t.criado;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.13 SALDO ATUAL DE UMA CONTA
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_saldo_atual(p_tenant_id uuid, p_conta_movimento_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_saldo bigint;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'extrato_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver saldos.' USING ERRCODE = '42501';
  END IF;

  SELECT c.saldo_abertura_centavos
       + COALESCE((
           SELECT SUM(CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos
                           ELSE -l.valor_centavos END)
             FROM public.fin_lancamentos l
            WHERE l.conta_movimento_id = c.id AND l.regime = 'CAIXA'
         ), 0)
    INTO v_saldo
    FROM public.fin_contas_movimento c
   WHERE c.id = p_conta_movimento_id AND c.tenant_id = p_tenant_id;

  RETURN v_saldo;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.14 APAGAR TODOS OS DADOS DO MÓDULO NUMA EMPRESA (RN-28)
-- ---------------------------------------------------------------------------
--
-- ⚠️ É ESTA A FUNÇÃO QUE O BOTÃO DO PAINEL DE ENGENHARIA CHAMA, pelo nome
-- declarado em `platform_modules.funcao_limpeza`. Ela apaga na ordem certa e
-- numa transação: ou tudo sai, ou nada sai.
--
-- Escolhida no degrau 6 depois de uma prova medida: `DROP TABLE ... CASCADE`
-- executava sem erro e DEIXAVA a tabela de lançamentos com os dados dentro.
CREATE OR REPLACE FUNCTION public.fin_apagar_dados_da_empresa(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lanc integer; v_fech integer; v_cm integer; v_ci integer;
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso restrito ao Desenvolvedor.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.fin_lancamentos WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_lanc = ROW_COUNT;

  DELETE FROM public.fin_fechamentos WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_fech = ROW_COUNT;

  DELETE FROM public.fin_contas_movimento WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_cm = ROW_COUNT;

  DELETE FROM public.fin_contas_identificadoras WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_ci = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'lancamentos', v_lanc, 'fechamentos', v_fech,
    'contas_movimento', v_cm, 'contas_identificadoras', v_ci
  );
END;
$$;


-- ===========================================================================
-- 5. POLICIES — leitura pelos membros; escrita só pelas funções
-- ===========================================================================
--
-- ⚠️ NÃO HÁ POLICY DE INSERT/UPDATE/DELETE EM NENHUMA TABELA, e é deliberado.
-- Uma policy sabe dizer "pode escrever nesta linha", mas não sabe validar a
-- COERÊNCIA entre campos: com INSERT liberado, um membro gravaria um
-- `tipo_conta_movimento` que não corresponde à conta, ou `criado_por` de outra
-- pessoa, ou um lançamento em período fechado. Toda gravação passa pelas
-- funções `fin_*`, que validam o conjunto.

DROP POLICY IF EXISTS "Contas movimento da empresa" ON public.fin_contas_movimento;
CREATE POLICY "Contas movimento da empresa" ON public.fin_contas_movimento
FOR SELECT TO authenticated
USING (public.check_is_tenant_member(tenant_id) OR public.check_is_tenant_owner(tenant_id));

DROP POLICY IF EXISTS "Identificadoras da empresa" ON public.fin_contas_identificadoras;
CREATE POLICY "Identificadoras da empresa" ON public.fin_contas_identificadoras
FOR SELECT TO authenticated
USING (public.check_is_tenant_member(tenant_id) OR public.check_is_tenant_owner(tenant_id));

DROP POLICY IF EXISTS "Lancamentos da empresa" ON public.fin_lancamentos;
CREATE POLICY "Lancamentos da empresa" ON public.fin_lancamentos
FOR SELECT TO authenticated
USING (public.check_is_tenant_member(tenant_id) OR public.check_is_tenant_owner(tenant_id));

DROP POLICY IF EXISTS "Fechamentos da empresa" ON public.fin_fechamentos;
CREATE POLICY "Fechamentos da empresa" ON public.fin_fechamentos
FOR SELECT TO authenticated
USING (public.check_is_tenant_member(tenant_id) OR public.check_is_tenant_owner(tenant_id));


-- ===========================================================================
-- 6. TRIGGERS
-- ===========================================================================

-- 6.1 Carimbo de `updated_at` — reusa a função da plataforma
DROP TRIGGER IF EXISTS set_updated_at_fin_cm ON public.fin_contas_movimento;
CREATE TRIGGER set_updated_at_fin_cm BEFORE UPDATE ON public.fin_contas_movimento
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS set_updated_at_fin_ci ON public.fin_contas_identificadoras;
CREATE TRIGGER set_updated_at_fin_ci BEFORE UPDATE ON public.fin_contas_identificadoras
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS set_updated_at_fin_lanc ON public.fin_lancamentos;
CREATE TRIGGER set_updated_at_fin_lanc BEFORE UPDATE ON public.fin_lancamentos
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS set_updated_at_fin_fech ON public.fin_fechamentos;
CREATE TRIGGER set_updated_at_fin_fech BEFORE UPDATE ON public.fin_fechamentos
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

-- 6.2 Auditoria — ⚠️ SÓ UPDATE E DELETE (decisão do dono do projeto, degrau 4).
-- Lançamento é dado de alto volume: auditar INSERT faria a trilha crescer sem
-- acrescentar informação, já que o registro criado está lá para ser visto.
DROP TRIGGER IF EXISTS audit_fin_cm ON public.fin_contas_movimento;
CREATE TRIGGER audit_fin_cm AFTER UPDATE OR DELETE ON public.fin_contas_movimento
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_fin_ci ON public.fin_contas_identificadoras;
CREATE TRIGGER audit_fin_ci AFTER UPDATE OR DELETE ON public.fin_contas_identificadoras
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_fin_lanc ON public.fin_lancamentos;
CREATE TRIGGER audit_fin_lanc AFTER UPDATE OR DELETE ON public.fin_lancamentos
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();

DROP TRIGGER IF EXISTS audit_fin_fech ON public.fin_fechamentos;
CREATE TRIGGER audit_fin_fech AFTER UPDATE OR DELETE ON public.fin_fechamentos
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();


-- ===========================================================================
-- 7. PRIVILÉGIOS
-- ===========================================================================
REVOKE ALL ON public.fin_contas_movimento       FROM anon, authenticated;
REVOKE ALL ON public.fin_contas_identificadoras FROM anon, authenticated;
REVOKE ALL ON public.fin_lancamentos            FROM anon, authenticated;
REVOKE ALL ON public.fin_fechamentos            FROM anon, authenticated;

-- Leitura filtrada pela RLS; escrita, nenhuma.
GRANT SELECT ON public.fin_contas_movimento       TO authenticated;
GRANT SELECT ON public.fin_contas_identificadoras TO authenticated;
GRANT SELECT ON public.fin_lancamentos            TO authenticated;
GRANT SELECT ON public.fin_fechamentos            TO authenticated;

-- ---------------------------------------------------------------------------
-- ⚠️ AS 17 FUNÇÕES PRECISAM DE UM `REVOKE ... FROM PUBLIC` ANTES DO GRANT.
--
-- Descoberto em 2026-09-13, medindo o banco em vez de ler o arquivo: TODAS as
-- 17 estavam alcançáveis pelo papel `anon` — quem não fez login nenhum.
--
-- A razão é uma regra do PostgreSQL que engana: **toda função nasce com
-- EXECUTE concedido a PUBLIC**, e `authenticated` e `anon` herdam de PUBLIC.
-- Escrever só `GRANT ... TO authenticated` não fecha nada: a porta já estava
-- aberta antes do GRANT, e o GRANT apenas repete para um papel o que PUBLIC já
-- tinha. É o mesmo raciocínio do `TO` obrigatório nas policies (a proibição do
-- CLAUDE.md sobre policy sem `TO`), aplicado a função.
--
-- ⚠️ E NÃO ADIANTA CONFIAR NO `ALTER DEFAULT PRIVILEGES` DA PLATAFORMA. A
-- seção 8.4 do `plataforma_01_schema.sql` tinha
-- `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM
-- PUBLIC`, que PARECE resolver isto para todo objeto futuro — e não resolve.
-- Provado no PostgreSQL 18 local: aquele comando não grava linha nenhuma em
-- `pg_default_acl`, e uma função criada logo depois continua com `=X/postgres`
-- na ACL (PUBLIC com EXECUTE). O `ALTER DEFAULT PRIVILEGES ... REVOKE` só
-- consegue subtrair de um privilégio que o próprio `ALTER DEFAULT PRIVILEGES`
-- concedeu antes; o padrão embutido do PostgreSQL não está lá para ser
-- subtraído.
--
-- Não havia vazamento de dado: as funções são `SECURITY DEFINER` e conferem
-- `fin_pode()` (ou `is_superuser()`), que dependem de `auth.uid()` — nulo para
-- o anônimo. Mas a plataforma exige DUAS trancas, e esta estava só encostada.
--
-- ⚠️ `fin_apagar_dados_da_empresa` ERA O CASO MAIS GRAVE. O comentário no fim
-- desta seção dizia que ela "não recebe GRANT" — verdade, e irrelevante: sem
-- GRANT ela ficava no padrão, que é PUBLIC. A função que apaga o financeiro
-- inteiro de uma empresa estava exposta à API pública, defendida apenas pelo
-- `is_superuser()` de dentro. Agora está fechada nas duas camadas.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.fin_normalizar(text)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_pode(uuid, text)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_periodo_fechado(uuid, date)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_proxima_ordem(uuid, date)                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_buscar_contas_movimento(uuid, text)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_buscar_identificadoras(uuid, text)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_conta_movimento(uuid, uuid, text, text, bigint, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_identificadora(uuid, uuid, text, text, boolean)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_importar_contas_movimento(uuid, text, text[])      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_importar_identificadoras(uuid, text, text[])       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_lancamento(uuid, uuid, uuid, uuid, date, integer, text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_excluir_lancamento(uuid, uuid)                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_transferir(uuid, uuid, uuid, date, bigint, text)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_marcar_conferido(uuid, uuid, boolean)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_fechar_periodo(uuid, uuid, date, text)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_reabrir_periodo(uuid, uuid)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_extrato(uuid, uuid, date, date)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_saldo_atual(uuid, uuid)                            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_apagar_dados_da_empresa(uuid)                      FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fin_normalizar(text)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_pode(uuid, text)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_periodo_fechado(uuid, date)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_proxima_ordem(uuid, date)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_buscar_contas_movimento(uuid, text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_buscar_identificadoras(uuid, text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_conta_movimento(uuid, uuid, text, text, bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_identificadora(uuid, uuid, text, text, boolean)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_importar_contas_movimento(uuid, text, text[])      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_importar_identificadoras(uuid, text, text[])       TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_lancamento(uuid, uuid, uuid, uuid, date, integer, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_excluir_lancamento(uuid, uuid)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_transferir(uuid, uuid, uuid, date, bigint, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_marcar_conferido(uuid, uuid, boolean)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_fechar_periodo(uuid, uuid, date, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_reabrir_periodo(uuid, uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_extrato(uuid, uuid, date, date)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_saldo_atual(uuid, uuid)                            TO authenticated;

-- ⚠️ `fin_apagar_dados_da_empresa` NÃO recebe GRANT para `authenticated`: ela é
-- chamada de dentro de `admin_apagar_dados_do_modulo`, que roda como dono do
-- banco e já confere `is_superuser()`. Dar execução direta ao cliente seria
-- oferecer um botão de apagar tudo à API pública.
--
-- ⚠️ MAS "NÃO DAR GRANT" NÃO É O MESMO QUE "FECHAR" — foi o engano de
-- 2026-09-12, corrigido em 2026-09-13. Quem fecha é o REVOKE do bloco acima,
-- que também consta desta lista. Sem ele, "sem GRANT" significava "no padrão
-- do PostgreSQL", e o padrão é PUBLIC.


-- ===========================================================================
-- FIM DO SCHEMA DO MÓDULO
-- ===========================================================================
-- PRÓXIMOS PASSOS
--   1. Rodar o `financeiro_02_seed.sql` (grava o módulo no catálogo).
--   2. Rodar `supabase/testes/teste_financeiro.sql` — todas as linhas PASSOU.
--   3. Contratar o módulo para uma empresa: Painel de Engenharia › Módulos.
-- ===========================================================================
