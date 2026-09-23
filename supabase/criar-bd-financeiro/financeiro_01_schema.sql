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
-- O QUE ESTE ARQUIVO CRIA (recontado em 23/09/2026)
--   5 tabelas · 40 funções · 5 RLS ENABLE · 5 policies · 10 triggers
--
-- ⚠️ ESTA LINHA DIZIA "4 tabelas · 20 funções · 8 policies · 9 triggers" ATÉ
-- 23/09/2026 — cinco rodadas de defasagem. Não confie nela; reconte:
--   grep -c "^CREATE OR REPLACE FUNCTION" supabase/criar-bd-financeiro/financeiro_01_schema.sql
--   grep -c "^CREATE POLICY"              supabase/criar-bd-financeiro/financeiro_01_schema.sql
--   grep -c "^CREATE TRIGGER"             supabase/criar-bd-financeiro/financeiro_01_schema.sql
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


-- ---------------------------------------------------------------------------
-- 2.5 ORÇAMENTO POR COMPETÊNCIA (18/09/2026 — 4ª rodada)
-- ---------------------------------------------------------------------------
--
-- 📖 O QUE ELA GUARDA: quanto se PLANEJOU gastar (ou receber) em cada conta
-- identificadora, em cada mês. O que de fato aconteceu não mora aqui — sai dos
-- lançamentos, somado na hora pela `fin_dinheiro_do_periodo`.
--
-- ===========================================================================
-- ⚠️ A COMPETÊNCIA É UMA `date` TRAVADA NO DIA 1, E ISSO É DECISÃO DE PROJETO
-- ===========================================================================
-- Havia três caminhos, e dois deles quebram:
--
--   • texto "09/2026"  → ordenar por texto põe 01/2027 ANTES de 09/2026, e
--                        filtrar "de janeiro a junho" vira código à mão;
--   • dois inteiros    → funciona, mas todo filtro de intervalo passa a
--                        precisar dos dois campos com um OR no meio;
--   • date no dia 1    → ordena sozinho, compara sozinho, e é o tipo que o
--                        projeto inteiro já usa para data de calendário.
--
-- ⚠️ O `CHECK` DO DIA 1 NÃO É ENFEITE. Sem ele, alguém gravaria `2026-09-17` e
-- o banco passaria a ter DUAS "SETEMBRO / 2026" — a tela mostraria o mesmo mês
-- duas vezes, com valores diferentes, e ninguém entenderia por quê.
--
-- ⚠️ E A CHAVE PARA A IDENTIFICADORA É COMPOSTA (RN-29): sem o `tenant_id`
-- dentro dela, um orçamento de uma empresa poderia apontar para a conta de
-- outra.
CREATE TABLE IF NOT EXISTS public.fin_orcamentos (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    competencia             date   NOT NULL,
    conta_identificadora_id uuid   NOT NULL,
    valor_centavos          bigint NOT NULL CHECK (valor_centavos > 0),
    observacao              text   NULL CHECK (observacao IS NULL OR length(observacao) <= 200),

    criado_por uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fin_orc_dia_1 CHECK (EXTRACT(DAY FROM competencia) = 1),

    -- Uma conta, uma competência, um valor. É esta linha que impede o
    -- orçamento em dobro — a pergunta na tela é conforto, isto é a rede.
    CONSTRAINT fin_orc_unico UNIQUE (tenant_id, competencia, conta_identificadora_id),

    CONSTRAINT fin_orc_conta_fk
      FOREIGN KEY (tenant_id, conta_identificadora_id)
      REFERENCES public.fin_contas_identificadoras (tenant_id, id) ON DELETE CASCADE
);

-- A consulta mais comum é "tudo desta empresa nesta competência".
CREATE INDEX IF NOT EXISTS idx_fin_orc_competencia
  ON public.fin_orcamentos (tenant_id, competencia);


-- ===========================================================================
-- 3. ROW LEVEL SECURITY
-- ===========================================================================
ALTER TABLE public.fin_contas_movimento      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_contas_identificadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_lancamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_fechamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_orcamentos            ENABLE ROW LEVEL SECURITY;


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
-- 4.1b TEM ACESSO AO MÓDULO? (23/09/2026 — achado A1 da engenharia reversa)
-- ---------------------------------------------------------------------------
--
-- ⚠️ POR QUE ESTA FUNÇÃO NASCEU. Até 23/09/2026 as policies de LEITURA das
-- cinco tabelas `fin_*` perguntavam só "é membro ativo desta empresa?"
-- (`check_is_tenant_member`). Qualquer integrante — mesmo SEM o módulo
-- liberado em `allowed_modules` e SEM permissão nenhuma — lia todos os
-- lançamentos e saldos com um `supabase.from('fin_lancamentos').select('*')`
-- feito do navegador. As telas escondiam; o banco entregava. Provado num
-- PostgreSQL descartável: um Dependente com `allowed_modules = {}` leu
-- "FOLHA 850000" e o saldo de abertura do "BANCO X".
--
-- Ela responde a pergunta da CHAVE 2 da plataforma dentro do módulo: o módulo
-- está contratado E (a pessoa é a dona OU o dono o liberou e ligou para ela).
-- É a mesma regra da `fin_pode()`, sem exigir uma permissão específica.
--
-- ⚠️ ELA PRECISA DE `GRANT` PARA `authenticated`, ao contrário das funções
-- internas: é chamada DE DENTRO DAS POLICIES, que rodam com o papel de quem
-- consulta. Sem o GRANT, toda leitura das tabelas estouraria 42501.
CREATE OR REPLACE FUNCTION public.fin_tem_acesso(p_tenant_id uuid)
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
                )
              )
     );
$$;

-- ---------------------------------------------------------------------------
-- 4.2 PERÍODO FECHADO? (RN-24, RN-29)
-- ---------------------------------------------------------------------------
--
-- ⚠️ ESTE `DROP` É OBRIGATÓRIO E NÃO PODE SER APAGADO — leia antes de mexer.
--
-- Em 17/09/2026 esta função ganhou o parâmetro `p_tenant_id`. Ela era a ÚNICA
-- do módulo que não filtrava a empresa: perguntava só pela conta e pela data.
--
-- `CREATE OR REPLACE` **só substitui quando a lista de parâmetros é
-- idêntica**. Com uma lista diferente, o PostgreSQL entende que é OUTRA função
-- e cria uma SOBRECARGA — as duas passam a existir. E a velha continuaria com
-- o `GRANT` que este arquivo já lhe deu, alcançável e sem filtro de empresa.
-- É exatamente o defeito medido na `fin_transferir` em 14/09/2026.
--
-- A assinatura dentro do DROP são os PARÂMETROS ANTIGOS (uuid, date): no
-- PostgreSQL a função é identificada por eles, nunca pelo retorno.
DROP FUNCTION IF EXISTS public.fin_periodo_fechado(uuid, date);

CREATE OR REPLACE FUNCTION public.fin_periodo_fechado(
  p_tenant_id uuid,
  p_conta_id  uuid,
  p_data      date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fin_fechamentos f
     WHERE f.tenant_id = p_tenant_id
       AND f.conta_movimento_id = p_conta_id
       AND p_data <= f.fechado_ate
  );
$$;

-- ---------------------------------------------------------------------------
-- 4.3 A PRÓXIMA ORDEM LIVRE DO DIA (RN-11, RN-25, RN-27)
-- ---------------------------------------------------------------------------
--
-- ⚠️ ESTE `DROP` É OBRIGATÓRIO E NÃO PODE SER APAGADO — leia antes de mexer.
--
-- Em 18/09/2026 (5ª rodada) esta função ganhou o `p_tenant_id`. Ela era a
-- ÚLTIMA do módulo que não perguntava de quem era o dado: recebia uma conta e
-- uma data, não filtrava empresa, não chamava `fin_pode` — e tinha `GRANT`
-- para `authenticated`. Qualquer pessoa logada, de qualquer empresa, que
-- conhecesse o id de uma conta alheia descobria quantos lançamentos ela tem
-- num dia. Vazava um inteiro, e só; mas regra de isolamento que vale em 35
-- funções e falha em uma não é regra — é sorte.
--
-- `CREATE OR REPLACE` só substitui quando a lista de parâmetros é IDÊNTICA.
-- Com uma lista diferente o PostgreSQL entende que é OUTRA função e cria uma
-- SOBRECARGA: as duas passam a existir, e a velha continua com o `GRANT` que
-- este arquivo já lhe deu — alcançável e sem filtro nenhum. A assinatura
-- dentro do DROP são os PARÂMETROS ANTIGOS (uuid, date), nunca o retorno.
DROP FUNCTION IF EXISTS public.fin_proxima_ordem(uuid, date);

-- ⚠️ A PERMISSÃO ACEITA DUAS CHAVES, E ISSO NÃO É FROUXIDÃO. A sugestão serve
-- a duas telas: NOVO LANÇAMENTO (`lc_criar`) e TRANSFERÊNCIA (`transferencia`).
-- Exigir só `lc_criar` deixaria o campo ORDEM em branco, sem explicação
-- nenhuma, para quem só transfere. A pergunta que ela responde é "onde cabe o
-- próximo?" — e quem pode criar o próximo, por qualquer das duas portas, pode
-- fazê-la.
--
-- ⚠️ O FILTRO DE EMPRESA SOZINHO NÃO RESOLVERIA NADA. Quem chama informa a
-- empresa E a conta: bastaria informar as duas da empresa alheia para o filtro
-- casar. Quem fecha a porta é a `fin_pode`, que pergunta se QUEM ESTÁ CHAMANDO
-- pertence àquela empresa. O filtro é a segunda tranca: com permissão na
-- empresa A e uma conta da B, o SELECT não encontra linha e a resposta é 1 —
-- nenhum dado da B atravessa.
CREATE OR REPLACE FUNCTION public.fin_proxima_ordem(
  p_tenant_id uuid,
  p_conta_id  uuid,
  p_data      date
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.fin_pode(p_tenant_id, 'lc_criar')
       OR public.fin_pode(p_tenant_id, 'transferencia')) THEN
    RAISE EXCEPTION 'Sem permissao para sugerir a ordem do extrato.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COALESCE(MAX(l.ordem_extrato), 0) + 1
      FROM public.fin_lancamentos l
     WHERE l.tenant_id          = p_tenant_id
       AND l.conta_movimento_id = p_conta_id
       AND l.data_movimento     = p_data
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.3-b ABRIR ESPAÇO NUMA ORDEM JÁ OCUPADA (RN-12)
-- ---------------------------------------------------------------------------
-- A regra da RN-12 em UM lugar só: se a ordem pedida já existe naquela conta
-- naquele dia, todos os de ordem igual ou maior descem um degrau, e a ordem
-- pedida fica livre para quem está chegando.
--
-- ⚠️ ELA NASCEU EM 14/09/2026 PORQUE A TRANSFERÊNCIA PASSOU A INFORMAR ORDEM.
-- Até aqui, a regra vivia dentro de `fin_gravar_lancamento`, e a transferência
-- sempre jogava as duas pernas para o fim do dia. Com o pedido de informar a
-- ordem nas DUAS contas, a mesma regra passaria a existir em TRÊS lugares — e a
-- segunda cópia de qualquer regra é sempre a que esquece um detalhe (aqui, o
-- detalhe mortal é o `id <> p_excluir_id`, sem o qual a edição empurraria a si
-- mesma).
--
-- ⚠️ `p_excluir_id` É QUEM IMPEDE O REGISTRO DE SE EMPURRAR. Na EDIÇÃO, o
-- próprio lançamento já está no dia: sem excluí-lo do deslocamento, ele ganharia
-- +1 e depois receberia a ordem pedida, deixando um buraco atrás. Na criação e
-- na transferência ele vem NULL, porque ainda não existe linha nenhuma.
--
-- ⚠️ NÃO HÁ ÍNDICE ÚNICO EM (conta, data, ordem), E É POR ISSO QUE O `UPDATE` EM
-- BLOCO FUNCIONA. Com um índice único não adiado, subir 3→4 enquanto o 4 existe
-- estouraria no meio da instrução. A ordem é uma preferência de exibição, não
-- uma identidade — quem garante a unicidade é esta função.
--
-- ⚠️ ELA NÃO RECEBE GRANT E NÃO DEVE RECEBER. É chamada de dentro de funções
-- `SECURITY DEFINER`, que a executam como dona do banco; exposta ao cliente,
-- deixaria qualquer um embaralhar a ordem do extrato alheio sem passar por
-- nenhuma checagem de permissão. O teste 16 a exclui por isso, como já exclui a
-- `fin_apagar_dados_da_empresa`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fin_abrir_espaco_na_ordem(
  p_conta_movimento_id uuid,
  p_data  date,
  p_ordem integer,
  p_excluir_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_ordem IS NULL THEN
    RETURN;                       -- sem ordem informada não há nada a deslocar
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fin_lancamentos
     WHERE conta_movimento_id = p_conta_movimento_id
       AND data_movimento = p_data
       AND ordem_extrato = p_ordem
       AND (p_excluir_id IS NULL OR id <> p_excluir_id)
  ) THEN
    UPDATE public.fin_lancamentos
       SET ordem_extrato = ordem_extrato + 1
     WHERE conta_movimento_id = p_conta_movimento_id
       AND data_movimento = p_data
       AND ordem_extrato >= p_ordem
       AND (p_excluir_id IS NULL OR id <> p_excluir_id);
  END IF;
END;
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
-- 4.6b SALDOS DE ABERTURA (23/09/2026 — achado A1)
-- ---------------------------------------------------------------------------
--
-- ⚠️ O SALDO DE ABERTURA SAIU DA LEITURA DIRETA DA TABELA. A partir de
-- 23/09/2026 a coluna `saldo_abertura_centavos` não recebe `SELECT` (ver a
-- seção 7): a lista de contas movimento é lida por quem tem acesso ao módulo
-- — ela alimenta o formulário de lançamento, a transferência, os filtros —,
-- mas o SALDO DE ABERTURA é um valor, e a tela de CONFIGURAÇÕES promete ao
-- dono que só `cm_ver` o revela (`PERMISSOES_QUE_REVELAM_VALOR`). Linha a
-- linha a RLS não sabe esconder UMA coluna; o privilégio de coluna sabe.
CREATE OR REPLACE FUNCTION public.fin_saldos_de_abertura(p_tenant_id uuid)
RETURNS TABLE (id uuid, saldo_abertura_centavos bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'cm_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver as contas movimento.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT c.id, c.saldo_abertura_centavos
      FROM public.fin_contas_movimento c
     WHERE c.tenant_id = p_tenant_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.6c EXCLUIR CADASTRO (RN-04, RN-25, RN-30) — 23/09/2026
-- ---------------------------------------------------------------------------
--
-- ⚠️ EXCLUIR UM CADASTRO NUNCA FUNCIONOU ATÉ ESTA DATA. A tela apagava com um
-- `DELETE` direto na tabela — e desde o degrau 7 as tabelas `fin_*` só dão
-- `SELECT` ao app (escrita só por função, seção 7). Todo clique em EXCLUIR
-- voltava `permission denied`, e a tela, que tratava QUALQUER erro como
-- "existem lançamentos", mostrava essa frase mesmo para a conta sem lançamento
-- nenhum. E as permissões `cm_excluir` e `ci_excluir` não eram conferidas por
-- ninguém no banco. Achado ao corrigir o A1 da engenharia reversa.
--
-- A conferência de lançamento vem ANTES do DELETE, com mensagem própria: a
-- chave estrangeira (RN-04, `ON DELETE RESTRICT`) recusaria de todo jeito, mas
-- com um texto que a tela não saberia traduzir.
CREATE OR REPLACE FUNCTION public.fin_excluir_conta_movimento(p_tenant_id uuid, p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'cm_excluir') THEN
    RAISE EXCEPTION 'Sem permissao para excluir conta movimento.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fin_contas_movimento
                  WHERE id = p_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Conta movimento nao encontrada nesta empresa.' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM public.fin_lancamentos
              WHERE tenant_id = p_tenant_id AND conta_movimento_id = p_id) THEN
    RAISE EXCEPTION 'Existem lancamentos usando esta conta: desative-a em vez de excluir.'
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.fin_contas_movimento WHERE id = p_id AND tenant_id = p_tenant_id;
  RETURN json_build_object('success', true, 'id', p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fin_excluir_identificadora(p_tenant_id uuid, p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sistema boolean;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'ci_excluir') THEN
    RAISE EXCEPTION 'Sem permissao para excluir conta identificadora.' USING ERRCODE = '42501';
  END IF;

  SELECT is_sistema INTO v_sistema
    FROM public.fin_contas_identificadoras
   WHERE id = p_id AND tenant_id = p_tenant_id;

  IF v_sistema IS NULL THEN
    RAISE EXCEPTION 'Conta identificadora nao encontrada nesta empresa.' USING ERRCODE = 'P0002';
  END IF;

  -- RN-30: a categoria "TRANSFERÊNCIA ENTRE CONTAS" é do sistema.
  IF v_sistema THEN
    RAISE EXCEPTION 'A categoria de transferencia e do sistema e nao pode ser excluida.'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.fin_lancamentos
              WHERE tenant_id = p_tenant_id AND conta_identificadora_id = p_id) THEN
    RAISE EXCEPTION 'Existem lancamentos usando esta conta: desative-a em vez de excluir.'
      USING ERRCODE = '23503';
  END IF;

  -- ⚠️ O ORÇAMENTO DELA SAI JUNTO (chave `ON DELETE CASCADE` da 2.5): sem
  -- lançamento nenhum, não há realizado a comparar, e um orçamento de uma
  -- conta que não existe mais não teria onde aparecer.
  DELETE FROM public.fin_contas_identificadoras WHERE id = p_id AND tenant_id = p_tenant_id;
  RETURN json_build_object('success', true, 'id', p_id);
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
  v_transf    uuid;
BEGIN
  -- 1) Permissão: criar é uma; editar depende de ser o autor ou não.
  IF p_id IS NULL THEN
    v_permissao := 'lc_criar';
    IF NOT public.fin_pode(p_tenant_id, v_permissao) THEN
      RAISE EXCEPTION 'Sem permissao para criar lancamento.' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT criado_por, conta_movimento_id, data_movimento, transferencia_id
      INTO v_criador, v_conta_old, v_data_old, v_transf
      FROM public.fin_lancamentos
     WHERE id = p_id AND tenant_id = p_tenant_id;

    IF v_criador IS NULL THEN
      RAISE EXCEPTION 'Lancamento nao encontrado nesta empresa.' USING ERRCODE = '23503';
    END IF;

    -- ⚠️ RN-23 — PERNA DE TRANSFERÊNCIA NÃO SE EDITA (23/09/2026, achado A2).
    -- Até esta data a regra morava SÓ NA TELA, que não oferece EDITAR numa
    -- perna. Chamando a função por fora, dava para mudar uma perna sozinha:
    -- provado num banco descartável, a SAÍDA virou 999,00 com a ENTRADA em
    -- 100,00, e R$ 899,00 sumiram do total da empresa sem erro nenhum.
    -- O caminho certo é excluir (o banco apaga as duas pernas juntas) e
    -- transferir de novo. Vem DEPOIS da permissão para não contar, a quem não
    -- pode editar, que aquele id é uma perna de transferência.
    IF NOT (
      public.fin_pode(p_tenant_id, 'lc_editar_todos')
      OR (v_criador = auth.uid() AND public.fin_pode(p_tenant_id, 'lc_editar_proprios'))
    ) THEN
      RAISE EXCEPTION 'Sem permissao para editar este lancamento.' USING ERRCODE = '42501';
    END IF;

    IF v_transf IS NOT NULL THEN
      RAISE EXCEPTION 'Lancamento de transferencia nao pode ser editado: exclua (as duas pernas saem juntas) e transfira de novo.'
        USING ERRCODE = '23514';
    END IF;

    -- RN-24: a data ANTIGA também não pode estar em período fechado, senão
    -- daria para tirar um lançamento de um mês fechado movendo-o de lugar.
    IF public.fin_periodo_fechado(p_tenant_id, v_conta_old, v_data_old) THEN
      RAISE EXCEPTION 'O periodo desta conta esta fechado ate a data do lancamento original.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2) Período fechado no destino (RN-24)
  IF public.fin_periodo_fechado(p_tenant_id, p_conta_movimento_id, p_data_movimento) THEN
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
  --    ⚠️ A REGRA MORA EM `fin_abrir_espaco_na_ordem`, E NÃO AQUI DENTRO, desde
  --    14/09/2026: a transferência passou a informar ordem nas duas contas e
  --    precisa exatamente do mesmo deslocamento. Uma segunda cópia da regra
  --    seria a que esqueceria o `p_id` na exclusão — e o lançamento editado
  --    empurraria a si mesmo, deixando um buraco atrás.
  v_ordem := p_ordem_extrato;
  PERFORM public.fin_abrir_espaco_na_ordem(
            p_conta_movimento_id, p_data_movimento, v_ordem, p_id);

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

  IF public.fin_periodo_fechado(p_tenant_id, v_conta, v_data) THEN
    RAISE EXCEPTION 'O periodo desta conta esta fechado nesta data.' USING ERRCODE = '42501';
  END IF;

  IF v_transf IS NOT NULL THEN
    -- ⚠️ AS DUAS PERNAS SAEM JUNTAS. Apagar só uma deixaria o saldo de uma das
    -- contas errado para sempre — o descontrole que a transferência evita.
    -- Antes, confere o fechamento da OUTRA perna também.
    IF EXISTS (
      SELECT 1 FROM public.fin_lancamentos l
       WHERE l.transferencia_id = v_transf
         AND public.fin_periodo_fechado(p_tenant_id, l.conta_movimento_id, l.data_movimento)
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
-- 4.8-b EXCLUIR LANÇAMENTOS POR PERÍODO (RN-23, 24, 25) — 17/09/2026
-- ---------------------------------------------------------------------------
--
-- Pedido do dono do projeto: "excluir lançamentos por período, desde que não
-- exista fechamento de período".
--
-- ===========================================================================
-- ⚠️ 1. O PADRÃO DE `p_simular` É `true`, E ISSO NÃO É ESTILO
-- ===========================================================================
-- Com o padrão em `true`, esquecer o último argumento é INOFENSIVO: o pior que
-- acontece é receber um relatório. Se o padrão fosse "apagar", qualquer chamada
-- feita sem o parâmetro — um teste, um script, um dedo errado — apagaria dado
-- de verdade. O caminho seguro tem de ser o caminho preguiçoso.
--
-- ===========================================================================
-- ⚠️ 2. QUEM CONTA É QUEM APAGA — DE PROPÓSITO
-- ===========================================================================
-- A simulação e a exclusão percorrem O MESMO conjunto, montado uma vez só (a
-- CTE `alvo`). Se a tela contasse por conta própria, um dia ela diria "137" e o
-- banco apagaria 141 — e o número da confirmação viraria mentira. É a mesma
-- razão pela qual o saldo do extrato é calculado no banco.
--
-- ===========================================================================
-- ⚠️ 3. A TRANSFERÊNCIA SAI INTEIRA, MESMO A PERNA DE FORA DO PERÍODO (RN-23)
-- ===========================================================================
-- Uma transferência são DOIS lançamentos amarrados por `transferencia_id`.
-- Apagar só a perna que está no filtro deixaria a OUTRA conta com uma entrada
-- (ou saída) que não veio de lugar nenhum — o saldo dela ficaria errado PARA
-- SEMPRE, sem nada na tela explicando por quê. Dinheiro inventado.
--
-- Por isso o conjunto é montado em dois passos: primeiro o que casa com o
-- filtro, depois TUDO o que compartilhe um `transferencia_id` com esses — ainda
-- que esteja em outra conta ou fora das datas pedidas.
--
-- ⚠️ CONSEQUÊNCIA QUE O RELATÓRIO PRECISA DIZER EM VOZ ALTA: "apagar setembro
-- do CAIXA" pode apagar lançamentos de OUTRAS contas. Por isso o retorno traz
-- `fora_do_filtro` separado — a tela mostra esse número antes de confirmar.
--
-- ===========================================================================
-- ⚠️ 4. A REGRA DO FECHAMENTO É A "PRECISA", NÃO A "RÍGIDA" (decisão de 17/09)
-- ===========================================================================
-- Recusa apenas se o fechamento ALCANÇAR alguma linha do conjunto — não por a
-- conta ter um fechamento qualquer. A leitura rígida puniria justamente quem
-- fecha o período todo mês: a ferramenta ficaria disponível só para quem NÃO
-- fecha, que é o contrário do desejável.
--
-- A conferência roda sobre o conjunto JÁ EXPANDIDO, então a perna de fora do
-- período também é conferida: não dá para furar a tranca do BANCO pela porta
-- do CAIXA.
--
-- ===========================================================================
-- ⚠️ 5. A PERMISSÃO É `lc_excluir_lote`, E NÃO `lc_excluir_todos`
-- ===========================================================================
-- "Pode apagar um lançamento que não é seu" e "pode apagar um ano inteiro" são
-- poderes de tamanhos diferentes. Com uma permissão só, dar o primeiro a um
-- auxiliar daria o segundo junto. O Proprietário continua tendo tudo por ser
-- OWNER — quem trata isso é a `fin_pode()`.
--
-- ⚠️ E NÃO ACEITA `lc_excluir_proprios` COMO SUBSTITUTO: quem só pode apagar os
-- próprios receberia uma exclusão PARCIAL do período (algumas linhas saem,
-- outras não, conforme quem lançou). Um mês meio apagado é pior que um mês
-- inteiro: o saldo fica numa posição que ninguém pediu.
-- ===========================================================================
-- ⚠️ 6. O `DROP` ABAIXO É OBRIGATÓRIO — 17/09/2026 (2ª rodada)
-- ===========================================================================
-- A função ganhou o parâmetro `p_ids`, para a tela poder marcar e desmarcar
-- registro a registro. `CREATE OR REPLACE` **só substitui quando a lista de
-- parâmetros é idêntica**: com uma lista diferente, o PostgreSQL cria uma
-- SOBRECARGA e as DUAS passam a existir — a velha continuando com o `GRANT`
-- que este arquivo já lhe deu, e apagando o PERÍODO INTEIRO quando chamada.
--
-- É o mesmo defeito medido na `fin_transferir` (14/09) e na
-- `fin_periodo_fechado` (17/09, primeira rodada). A assinatura dentro do DROP
-- são os PARÂMETROS ANTIGOS.
DROP FUNCTION IF EXISTS public.fin_excluir_lancamentos_por_periodo(uuid, uuid, date, date, boolean);

CREATE OR REPLACE FUNCTION public.fin_excluir_lancamentos_por_periodo(
  p_tenant_id          uuid,
  p_conta_movimento_id uuid,                   -- null = todas as contas
  p_data_inicial       date,
  p_data_final         date,
  p_simular            boolean DEFAULT true,   -- ⚠️ padrão SEGURO: não apaga
  -- ⚠️ `p_ids` NÃO SUBSTITUI O FILTRO — ELE SE SOMA A ELE (17/09/2026).
  --
  -- Quando vem preenchido, o conjunto é a INTERSEÇÃO: "estes ids, E dentro do
  -- período/conta informados". Confiar só nos ids deixaria uma chamada forjada
  -- apagar qualquer lançamento da empresa, de qualquer data, driblando a
  -- conferência de período que a tela mostrou. O filtro continua sendo a
  -- fronteira; os ids apenas escolhem dentro dela.
  --
  -- `NULL` = o período inteiro, que é o comportamento de antes desta mudança.
  p_ids                uuid[]  DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids            uuid[];   -- TODAS as linhas que vão sair (já com as pernas)
  v_ids_no_filtro  uuid[];   -- só as que casaram com o filtro pedido
  v_total          integer := 0;
  v_fora           integer := 0;
  v_transferencias integer := 0;
  v_contas         text[];
  v_bloqueio       text;
  v_apagados       integer := 0;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'lc_excluir_lote') THEN
    RAISE EXCEPTION 'Sem permissao para excluir lancamentos em lote.' USING ERRCODE = '42501';
  END IF;

  IF p_data_inicial IS NULL OR p_data_final IS NULL THEN
    RAISE EXCEPTION 'Informe a data inicial e a data final.' USING ERRCODE = '22004';
  END IF;

  IF p_data_final < p_data_inicial THEN
    RAISE EXCEPTION 'A data final nao pode ser anterior a data inicial.' USING ERRCODE = '22007';
  END IF;

  -- -------------------------------------------------------------------
  -- O CONJUNTO ALVO — montado UMA vez, usado pela simulação e pela exclusão.
  -- -------------------------------------------------------------------
  -- ⚠️ É UM ARRAY DE `uuid`, E NÃO UMA TABELA TEMPORÁRIA. A primeira versão
  -- desta função usava `CREATE TEMP TABLE`, e isso é frágil dentro de uma
  -- `SECURITY DEFINER`: o PostgreSQL procura relações em `pg_temp` ANTES do
  -- `search_path` declarado, então quem chama poderia criar uma tabela temporária
  -- com este nome na sessão dele e a função passaria a trabalhar sobre ela.
  -- Um array é uma variável — não existe fora daqui, e não há o que sequestrar.
  -- (De quebra, sumiu o "relação já existe, ignorando" na segunda chamada.)
  --
  -- `no_filtro` = o que casa com o pedido; `v_ids` = isso MAIS as outras pernas
  -- das transferências, venham da conta que vierem (ponto 3 acima).
  SELECT array_agg(l.id)
    INTO v_ids_no_filtro
    FROM public.fin_lancamentos l
   WHERE l.tenant_id = p_tenant_id
     AND (p_conta_movimento_id IS NULL OR l.conta_movimento_id = p_conta_movimento_id)
     AND l.data_movimento BETWEEN p_data_inicial AND p_data_final
     -- A interseção com o que a tela marcou (ver o comentário do parâmetro).
     AND (p_ids IS NULL OR l.id = ANY(p_ids));

  -- ⚠️ ARRAY VAZIO NÃO É O MESMO QUE NULO, E CONFUNDI-LOS APAGARIA O MÊS.
  -- `p_ids = '{}'` significa "a pessoa desmarcou tudo" — nada deve sair. Se
  -- isso caísse no caminho do `NULL` ("o período inteiro"), desmarcar todos os
  -- registros e confirmar apagaria justamente tudo. Aqui o vazio já vem
  -- naturalmente de `id = ANY('{}')`, que não casa com nada; esta checagem
  -- existe para que a intenção fique escrita, e não dependa de sutileza.
  IF p_ids IS NOT NULL AND cardinality(p_ids) = 0 THEN
    RETURN json_build_object(
      'success', true, 'simulacao', p_simular,
      'lancamentos', 0, 'fora_do_filtro', 0, 'transferencias', 0,
      'contas', '[]'::jsonb, 'apagados', 0);
  END IF;

  v_ids_no_filtro := COALESCE(v_ids_no_filtro, ARRAY[]::uuid[]);

  SELECT array_agg(l.id)
    INTO v_ids
    FROM public.fin_lancamentos l
   WHERE l.tenant_id = p_tenant_id
     AND (
           l.id = ANY(v_ids_no_filtro)
        OR (l.transferencia_id IS NOT NULL
            AND l.transferencia_id IN (
                  SELECT t.transferencia_id FROM public.fin_lancamentos t
                   WHERE t.id = ANY(v_ids_no_filtro) AND t.transferencia_id IS NOT NULL))
         );

  v_ids := COALESCE(v_ids, ARRAY[]::uuid[]);

  SELECT count(*),
         count(*) FILTER (WHERE NOT (l.id = ANY(v_ids_no_filtro))),
         count(DISTINCT l.transferencia_id) FILTER (WHERE l.transferencia_id IS NOT NULL)
    INTO v_total, v_fora, v_transferencias
    FROM public.fin_lancamentos l
   WHERE l.tenant_id = p_tenant_id AND l.id = ANY(v_ids);

  SELECT array_agg(DISTINCT c.nome ORDER BY c.nome)
    INTO v_contas
    FROM public.fin_lancamentos l
    JOIN public.fin_contas_movimento c
      ON c.tenant_id = p_tenant_id AND c.id = l.conta_movimento_id
   WHERE l.tenant_id = p_tenant_id AND l.id = ANY(v_ids);

  -- -------------------------------------------------------------------
  -- RN-24 — o fechamento, conferido sobre o conjunto JÁ EXPANDIDO.
  -- -------------------------------------------------------------------
  SELECT string_agg(DISTINCT c.nome, ', ' ORDER BY c.nome)
    INTO v_bloqueio
    FROM public.fin_lancamentos l
    JOIN public.fin_contas_movimento c
      ON c.tenant_id = p_tenant_id AND c.id = l.conta_movimento_id
   WHERE l.tenant_id = p_tenant_id
     AND l.id = ANY(v_ids)
     AND public.fin_periodo_fechado(p_tenant_id, l.conta_movimento_id, l.data_movimento);

  IF v_bloqueio IS NOT NULL THEN
    -- ⚠️ ESTOURA MESMO NA SIMULAÇÃO, e é o certo: a simulação existe para
    -- responder "o que aconteceria se eu confirmasse?". Se ela devolvesse uma
    -- contagem alegre e só a exclusão recusasse, a pessoa clicaria em
    -- "EXCLUIR DEFINITIVAMENTE" para descobrir que não podia.
    RAISE EXCEPTION 'Periodo fechado alcanca estes lancamentos. Conta(s): %. Exclua o fechamento antes, em CONFIGURACOES DO MODULO.', v_bloqueio
      USING ERRCODE = '42501';
  END IF;

  IF p_simular THEN
    RETURN json_build_object(
      'success', true, 'simulacao', true,
      'lancamentos', v_total,
      'fora_do_filtro', v_fora,
      'transferencias', v_transferencias,
      'contas', COALESCE(to_jsonb(v_contas), '[]'::jsonb),
      'apagados', 0
    );
  END IF;

  -- ⚠️ CADA LINHA APAGADA PASSA PELO GATILHO `audit_fin_lanc`, que grava o
  -- registro INTEIRO em `audit_log.dados_antes`. É essa trilha que a
  -- `fin_restaurar_lancamento` usa para desfazer. Não é custo à toa.
  DELETE FROM public.fin_lancamentos l
   WHERE l.tenant_id = p_tenant_id
     AND l.id = ANY(v_ids);
  GET DIAGNOSTICS v_apagados = ROW_COUNT;

  RETURN json_build_object(
    'success', true, 'simulacao', false,
    'lancamentos', v_total,
    'fora_do_filtro', v_fora,
    'transferencias', v_transferencias,
    'contas', COALESCE(to_jsonb(v_contas), '[]'::jsonb),
    'apagados', v_apagados
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.8-c A LIXEIRA: LISTAR E RESTAURAR LANÇAMENTOS EXCLUÍDOS — 17/09/2026
-- ---------------------------------------------------------------------------
--
-- 🎁 ISTO EXISTE PORQUE A TRILHA DE AUDITORIA JÁ GUARDAVA TUDO, E NINGUÉM
-- ESTAVA OLHANDO. O gatilho `audit_fin_lanc` é `AFTER UPDATE OR DELETE ... FOR
-- EACH ROW`, e a `registrar_auditoria()` grava `dados_antes = to_jsonb(OLD)` —
-- ou seja, **o registro inteiro, campo por campo**, antes de ele morrer.
--
-- Sem nenhuma tabela nova, isso transforma a exclusão em lote de "operação
-- irreversível" em "operação reversível". Era o bônus nº 1 do estudo de 17/09.
--
-- ===========================================================================
-- ⚠️ POR QUE ESTAS DUAS FUNÇÕES SÃO `SECURITY DEFINER` — E O QUE ISSO EXIGE
-- ===========================================================================
-- A `audit_log` é da PLATAFORMA e tem uma policy que deixa **só o
-- Desenvolvedor** lê-la. Um Proprietário não enxerga uma linha sequer. Estas
-- funções rodam com o poder do dono do schema para alcançá-la.
--
-- ⚠️ E `SECURITY DEFINER` DESLIGA A RLS LÁ DENTRO. Sem filtro explícito, um
-- Proprietário leria as exclusões de TODAS as empresas do sistema. Por isso os
-- quatro filtros abaixo são obrigatórios, e nenhum deles é opcional:
--    1. `fin_pode()` no topo         — tem permissão?
--    2. `tabela = 'fin_lancamentos'` — só a tabela deste módulo
--    3. `operacao = 'DELETE'`        — só exclusões
--    4. `dados_antes->>'tenant_id'`  — SÓ a empresa de quem chamou
--
-- ⚠️ A `audit_log` NÃO TEM COLUNA `tenant_id`. A empresa mora DENTRO do jsonb.
-- É por isso que o filtro é `dados_antes->>'tenant_id' = p_tenant_id::text`, e
-- não um `WHERE tenant_id = ...` que não compilaria.
CREATE OR REPLACE FUNCTION public.fin_listar_exclusoes(
  p_tenant_id uuid,
  p_desde     timestamptz DEFAULT NULL,   -- null = últimos 30 dias
  p_limite    integer     DEFAULT 200
)
RETURNS TABLE (
  audit_id        bigint,
  excluido_em     timestamptz,
  excluido_por    text,
  lancamento_id   uuid,
  data_movimento  date,
  conta           text,
  identificadora  text,
  tipo_movimento  text,
  valor_centavos  bigint,
  historico       text,
  transferencia_id uuid,
  ja_restaurado   boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.criado_em,
    COALESCE(u.email, '—'),
    (a.dados_antes->>'id')::uuid,
    (a.dados_antes->>'data_movimento')::date,
    COALESCE(cm.nome, '—'),
    COALESCE(ci.nome, '—'),
    a.dados_antes->>'tipo_movimento',
    (a.dados_antes->>'valor_centavos')::bigint,
    a.dados_antes->>'historico',
    NULLIF(a.dados_antes->>'transferencia_id', '')::uuid,
    -- ⚠️ "Já restaurado" é descoberto perguntando se o id VOLTOU a existir. Não
    -- há marca na auditoria dizendo isso, e inventar uma exigiria escrever na
    -- tabela da plataforma a pedido de um módulo — proibido pelo LEGO.
    EXISTS (SELECT 1 FROM public.fin_lancamentos l
             WHERE l.id = (a.dados_antes->>'id')::uuid
               AND l.tenant_id = p_tenant_id)
  FROM public.audit_log a
  -- ⚠️ LEFT JOIN, nunca JOIN: a RLS de `users` esconde os colegas, e um JOIN
  -- simples faria a LINHA sumir da lista em vez de só a coluna vir vazia.
  LEFT JOIN public.users u                   ON u.id = a.ator_id
  LEFT JOIN public.fin_contas_movimento cm
         ON cm.tenant_id = p_tenant_id
        AND cm.id = (a.dados_antes->>'conta_movimento_id')::uuid
  LEFT JOIN public.fin_contas_identificadoras ci
         ON ci.tenant_id = p_tenant_id
        AND ci.id = (a.dados_antes->>'conta_identificadora_id')::uuid
 WHERE public.fin_pode(p_tenant_id, 'lc_excluir_lote')
   AND a.tabela   = 'fin_lancamentos'
   AND a.operacao = 'DELETE'
   AND a.dados_antes->>'tenant_id' = p_tenant_id::text
   AND a.criado_em >= COALESCE(p_desde, now() - interval '30 days')
 ORDER BY a.criado_em DESC, a.id DESC
 LIMIT GREATEST(1, LEAST(COALESCE(p_limite, 200), 1000));
$$;

-- ---------------------------------------------------------------------------
-- RESTAURAR UM LANÇAMENTO EXCLUÍDO
-- ---------------------------------------------------------------------------
--
-- ⚠️ RESTAURAR É CRIAR DE NOVO, E POR ISSO PASSA PELAS MESMAS TRANCAS. Um
-- lançamento não pode "voltar" para dentro de um período que foi fechado
-- depois da exclusão dele — isso seria furar o fechamento pela porta dos
-- fundos. Também não pode voltar se o cadastro que ele usava foi excluído.
--
-- ⚠️ ELA É IDEMPOTENTE DE PROPÓSITO: restaurar duas vezes o mesmo id devolve
-- `ja_existia`, sem erro e sem duplicar. Dois cliques no mesmo botão é o gesto
-- mais comum que existe.
--
-- ⚠️ A TRANSFERÊNCIA VOLTA INTEIRA, pelo mesmo motivo da RN-23: meia
-- transferência restaurada inventa dinheiro tanto quanto meia apagada.
CREATE OR REPLACE FUNCTION public.fin_restaurar_lancamento(
  p_tenant_id uuid,
  p_audit_id  bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha       jsonb;
  v_transf      uuid;
  -- ⚠️ ARRAY, não tabela temporária — pelo mesmo motivo explicado na
  -- `fin_excluir_lancamentos_por_periodo`: `pg_temp` é procurado antes do
  -- `search_path` e uma tabela temporária do chamador sequestraria o nome.
  v_linhas      jsonb[];
  v_restaurados integer := 0;
  v_ja          integer := 0;
  v_bloqueio    text;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'lc_excluir_lote') THEN
    RAISE EXCEPTION 'Sem permissao para restaurar lancamento.' USING ERRCODE = '42501';
  END IF;

  SELECT a.dados_antes
    INTO v_linha
    FROM public.audit_log a
   WHERE a.id       = p_audit_id
     AND a.tabela   = 'fin_lancamentos'
     AND a.operacao = 'DELETE'
     AND a.dados_antes->>'tenant_id' = p_tenant_id::text;   -- o filtro que vale

  IF v_linha IS NULL THEN
    RAISE EXCEPTION 'Registro de exclusao nao encontrado nesta empresa.' USING ERRCODE = '23503';
  END IF;

  v_transf := NULLIF(v_linha->>'transferencia_id', '')::uuid;

  -- Todas as linhas que vão voltar: a pedida e, se for transferência, as irmãs.
  IF v_transf IS NULL THEN
    v_linhas := ARRAY[v_linha];
  ELSE
    -- ⚠️ `DISTINCT ON (id)` com a auditoria mais RECENTE de cada lançamento:
    -- se o mesmo id foi excluído e restaurado mais de uma vez, há várias linhas
    -- de DELETE para ele, e restaurar a mais antiga traria um valor vencido.
    SELECT array_agg(dados) INTO v_linhas FROM (
      SELECT DISTINCT ON (a.dados_antes->>'id') a.dados_antes AS dados
        FROM public.audit_log a
       WHERE a.tabela   = 'fin_lancamentos'
         AND a.operacao = 'DELETE'
         AND a.dados_antes->>'tenant_id'        = p_tenant_id::text
         AND a.dados_antes->>'transferencia_id' = v_transf::text
       ORDER BY a.dados_antes->>'id', a.criado_em DESC, a.id DESC
    ) mais_recente;
  END IF;

  v_linhas := COALESCE(v_linhas, ARRAY[]::jsonb[]);

  -- RN-24: nenhuma delas pode cair dentro de um período fechado HOJE.
  SELECT string_agg(DISTINCT c.nome, ', ' ORDER BY c.nome)
    INTO v_bloqueio
    FROM unnest(v_linhas) AS r(dados)
    JOIN public.fin_contas_movimento c
      ON c.tenant_id = p_tenant_id
     AND c.id = (r.dados->>'conta_movimento_id')::uuid
   WHERE public.fin_periodo_fechado(p_tenant_id,
                                    (r.dados->>'conta_movimento_id')::uuid,
                                    (r.dados->>'data_movimento')::date);

  IF v_bloqueio IS NOT NULL THEN
    RAISE EXCEPTION 'O periodo foi fechado depois da exclusao. Conta(s): %. Exclua o fechamento antes de restaurar.', v_bloqueio
      USING ERRCODE = '42501';
  END IF;

  -- O cadastro que o lançamento usava ainda existe?
  IF EXISTS (
    SELECT 1 FROM unnest(v_linhas) AS r(dados)
     WHERE NOT EXISTS (SELECT 1 FROM public.fin_contas_movimento c
                        WHERE c.tenant_id = p_tenant_id
                          AND c.id = (r.dados->>'conta_movimento_id')::uuid)
        OR NOT EXISTS (SELECT 1 FROM public.fin_contas_identificadoras i
                        WHERE i.tenant_id = p_tenant_id
                          AND i.id = (r.dados->>'conta_identificadora_id')::uuid)
  ) THEN
    RAISE EXCEPTION 'A conta movimento ou a identificadora deste lancamento nao existe mais. Recrie o cadastro antes de restaurar.'
      USING ERRCODE = '23503';
  END IF;

  SELECT count(*) INTO v_ja
    FROM unnest(v_linhas) AS r(dados)
   WHERE EXISTS (SELECT 1 FROM public.fin_lancamentos l
                  WHERE l.id = (r.dados->>'id')::uuid AND l.tenant_id = p_tenant_id);

  -- ⚠️ O `ON CONFLICT DO NOTHING` é o que torna o duplo clique inofensivo.
  -- ⚠️ E as colunas são listadas UMA A UMA, nunca por `jsonb_populate_record`:
  --    a regra do projeto manda mapear coluna explicitamente, e assim uma
  --    coluna nova na tabela aparece como erro de compilação aqui, em vez de
  --    voltar silenciosamente vazia.
  INSERT INTO public.fin_lancamentos (
    id, tenant_id, conta_movimento_id, conta_identificadora_id,
    tipo_conta_movimento, tipo_conta_identificadora,
    data_movimento, ordem_extrato, tipo_movimento, propriedade, regime,
    valor_centavos, historico, conferido, transferencia_id, criado_por,
    created_at, updated_at
  )
  SELECT
    (r.dados->>'id')::uuid,
    p_tenant_id,
    (r.dados->>'conta_movimento_id')::uuid,
    (r.dados->>'conta_identificadora_id')::uuid,
    r.dados->>'tipo_conta_movimento',
    r.dados->>'tipo_conta_identificadora',
    (r.dados->>'data_movimento')::date,
    (r.dados->>'ordem_extrato')::integer,
    r.dados->>'tipo_movimento',
    r.dados->>'propriedade',
    r.dados->>'regime',
    (r.dados->>'valor_centavos')::bigint,
    r.dados->>'historico',
    COALESCE((r.dados->>'conferido')::boolean, false),
    NULLIF(r.dados->>'transferencia_id', '')::uuid,
    (r.dados->>'criado_por')::uuid,
    COALESCE((r.dados->>'created_at')::timestamptz, now()),
    now()
    FROM unnest(v_linhas) AS r(dados)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_restaurados = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'restaurados', v_restaurados,
    'ja_existia', v_ja,
    'era_transferencia', v_transf IS NOT NULL
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.8-c-bis LIMPAR A LIXEIRA — 17/09/2026 (2ª rodada)
-- ---------------------------------------------------------------------------
--
-- ===========================================================================
-- ⚠️ LEIA ISTO ANTES DE MEXER: ESTA FUNÇÃO APAGA TRILHA DE AUDITORIA
-- ===========================================================================
-- Ela é diferente de todas as outras do módulo. As demais apagam DADO, e o
-- dado apagado deixa rastro. Esta apaga **o rastro** — e depois dela não há
-- como restaurar o lançamento nem como saber que ele existiu.
--
-- É o que o dono do projeto pediu ("excluir definitivamente / limpar
-- lixeira"), e é uma necessidade real: sem isso a lixeira cresce para sempre.
-- Mas a consequência precisa estar escrita aqui e dita na tela: **isto é o
-- único ponto do módulo onde informação some de vez.**
--
-- ===========================================================================
-- ⚠️ POR QUE UM MÓDULO PODE APAGAR LINHAS DE UMA TABELA DA PLATAFORMA
-- ===========================================================================
-- `audit_log` é da PLATAFORMA, e a regra R5 do `MODULOS.md` proíbe um módulo de
-- alterar estrutura alheia. Aqui não há alteração de estrutura: são LINHAS que
-- o próprio módulo gerou, reconhecidas por `tabela = 'fin_lancamentos'`. O
-- `financeiro_00_reset.sql` já faz o mesmo (`DELETE ... WHERE tabela LIKE
-- 'fin\_%'`), pelo mesmo motivo: limpeza é responsabilidade de quem sujou.
--
-- ⚠️ O FILTRO `tabela = 'fin_lancamentos'` NÃO É OPCIONAL. Sem ele, um erro de
-- WHERE apagaria a auditoria de `users`, de `tenants` e de todo o resto — de
-- todas as empresas. Os quatro filtros são os mesmos da `fin_listar_exclusoes`,
-- pela mesma razão: `SECURITY DEFINER` desliga a RLS lá dentro.
CREATE OR REPLACE FUNCTION public.fin_limpar_lixeira(
  p_tenant_id uuid,
  -- `NULL` = toda a lixeira da empresa. Array = só as linhas escolhidas.
  p_audit_ids bigint[] DEFAULT NULL,
  p_simular   boolean  DEFAULT true    -- ⚠️ padrão SEGURO, como na exclusão
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total      integer := 0;
  v_restauraveis integer := 0;
  v_apagados   integer := 0;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'lc_excluir_lote') THEN
    RAISE EXCEPTION 'Sem permissao para limpar a lixeira.' USING ERRCODE = '42501';
  END IF;

  IF p_audit_ids IS NOT NULL AND cardinality(p_audit_ids) = 0 THEN
    RETURN json_build_object('success', true, 'simulacao', p_simular,
                             'linhas', 0, 'restauraveis', 0, 'apagados', 0);
  END IF;

  -- Quantas linhas, e quantas delas ainda dariam para restaurar. O segundo
  -- número é o que a tela precisa gritar: são os lançamentos que deixarão de
  -- existir em definitivo.
  SELECT count(*),
         count(*) FILTER (
           WHERE NOT EXISTS (SELECT 1 FROM public.fin_lancamentos l
                              WHERE l.id = (a.dados_antes->>'id')::uuid
                                AND l.tenant_id = p_tenant_id))
    INTO v_total, v_restauraveis
    FROM public.audit_log a
   WHERE a.tabela   = 'fin_lancamentos'
     AND a.operacao = 'DELETE'
     AND a.dados_antes->>'tenant_id' = p_tenant_id::text
     AND (p_audit_ids IS NULL OR a.id = ANY(p_audit_ids));

  IF p_simular THEN
    RETURN json_build_object('success', true, 'simulacao', true,
                             'linhas', v_total, 'restauraveis', v_restauraveis,
                             'apagados', 0);
  END IF;

  DELETE FROM public.audit_log a
   WHERE a.tabela   = 'fin_lancamentos'
     AND a.operacao = 'DELETE'
     AND a.dados_antes->>'tenant_id' = p_tenant_id::text
     AND (p_audit_ids IS NULL OR a.id = ANY(p_audit_ids));
  GET DIAGNOSTICS v_apagados = ROW_COUNT;

  RETURN json_build_object('success', true, 'simulacao', false,
                           'linhas', v_total, 'restauraveis', v_restauraveis,
                           'apagados', v_apagados);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.8-d HISTÓRICO DE FECHAMENTOS — 17/09/2026 (bônus 6 do estudo)
-- ---------------------------------------------------------------------------
--
-- ⚠️ A TABELA `fin_fechamentos` GUARDA UMA LINHA POR CONTA
-- (`UNIQUE (tenant_id, conta_movimento_id)`), então ela NÃO tem histórico: ao
-- excluir um fechamento, some da tela qualquer vestígio de que aquele período
-- esteve fechado, quem fechou e quando.
--
-- O dado, porém, existe: o gatilho `audit_fin_fech` grava cada UPDATE e cada
-- DELETE da tabela. Isto aqui é só a janela — nenhuma tabela nova, e nenhuma
-- alteração em tabela da plataforma (o LEGO proíbe).
--
-- ⚠️ Os mesmos quatro filtros da lixeira valem aqui, pelo mesmo motivo: é
-- `SECURITY DEFINER` sobre uma tabela da plataforma que o Proprietário não lê.
--
-- ===========================================================================
-- ⚠️ 18/09/2026 (5ª rodada): O FECHAMENTO EM VIGOR PASSOU A APARECER AQUI
-- ===========================================================================
-- Até aqui esta lista lia SÓ a auditoria, e a auditoria cobre `UPDATE` e
-- `DELETE` — não `INSERT`. Consequência: **o primeiro fechamento de uma conta
-- não aparecia em lugar nenhum do histórico**. Quem fechou setembro uma única
-- vez, e nunca mais mexeu, via "NENHUMA ALTERAÇÃO REGISTRADA" e concluía, sem
-- culpa, que o sistema não tinha guardado nada.
--
-- ⚠️ A SAÍDA **NÃO** FOI MEXER NO GATILHO DA PLATAFORMA. Fazer a
-- `registrar_auditoria()` cobrir INSERT mudaria o comportamento de TODAS as
-- tabelas do sistema — `users`, `tenants`, tudo — a pedido de um módulo. É
-- exatamente o que a regra R5 do `MODULOS.md` proíbe, e ainda dobraria o
-- tamanho da `audit_log` de quebra.
--
-- A saída foi a evidente depois de vista: **o primeiro fechamento não está na
-- auditoria porque ele ainda está VIVO na tabela**. `fin_fechamentos` guarda o
-- estado atual de cada conta, com `fechado_por`, `updated_at` e `observacao`.
-- A lista passou a ser a união dos dois: o que está em vigor AGORA (da tabela)
-- e o que MUDOU (da auditoria).
--
-- ⚠️ A LINHA VIVA USA `updated_at`, E NÃO `created_at`. O `fin_fechar_periodo`
-- é um `INSERT ... ON CONFLICT DO UPDATE`: refechar a mesma conta reaproveita
-- a linha, trocando `fechado_ate`, `fechado_por` e `updated_at`. Mostrar
-- `created_at` ao lado do `fechado_por` novo juntaria a data de um evento com
-- o autor de outro — uma frase verdadeira em cada metade e falsa inteira. Com
-- `updated_at`, a linha descreve o estado ATUAL: quem o deixou assim, e
-- quando. E numa conta fechada uma única vez os dois campos são iguais.
--
-- ⚠️ O `ORDER BY` FICA FORA DO `UNION`, NUMA CTE. Ordenação com expressão logo
-- depois de um `UNION` não compila no PostgreSQL; por isso o `UNION ALL` mora
-- dentro do `WITH` e a ordenação acontece no SELECT de fora, sobre colunas
-- simples.
DROP FUNCTION IF EXISTS public.fin_historico_fechamentos(uuid, integer);

CREATE OR REPLACE FUNCTION public.fin_historico_fechamentos(
  p_tenant_id uuid,
  p_limite    integer DEFAULT 100
)
RETURNS TABLE (
  quando      timestamptz,
  operacao    text,
  quem        text,
  conta       text,
  fechado_ate date,
  observacao  text,
  -- `true` = a linha viva da tabela (o fechamento que vale agora).
  -- `false` = um evento passado, lido da trilha de auditoria.
  em_vigor    boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eventos AS (
    -- 1) O QUE VALE AGORA — a linha viva de `fin_fechamentos`.
    SELECT
      f.updated_at                   AS quando,
      'FECHAMENTO EM VIGOR'::text    AS operacao,
      COALESCE(u.email, '—')         AS quem,
      COALESCE(cm.nome, '—')         AS conta,
      f.fechado_ate                  AS fechado_ate,
      f.observacao                   AS observacao,
      true                           AS em_vigor
    FROM public.fin_fechamentos f
    LEFT JOIN public.users u ON u.id = f.fechado_por
    LEFT JOIN public.fin_contas_movimento cm
           ON cm.tenant_id = f.tenant_id AND cm.id = f.conta_movimento_id
   WHERE public.fin_pode(p_tenant_id, 'fechar_periodo')
     AND f.tenant_id = p_tenant_id

    UNION ALL

    -- 2) O QUE MUDOU — a trilha de auditoria (UPDATE e DELETE).
    SELECT
      a.criado_em,
      -- O gatilho só registra UPDATE e DELETE. Traduzimos para o vocabulário da
      -- tela: quem alterou "ALTEROU O FECHAMENTO", quem apagou "EXCLUIU".
      CASE a.operacao WHEN 'DELETE' THEN 'EXCLUIU O FECHAMENTO'
                      ELSE 'ALTEROU O FECHAMENTO' END,
      COALESCE(u.email, '—'),
      COALESCE(cm.nome, '—'),
      (COALESCE(a.dados_depois, a.dados_antes)->>'fechado_ate')::date,
      COALESCE(a.dados_depois, a.dados_antes)->>'observacao',
      false
    FROM public.audit_log a
    LEFT JOIN public.users u ON u.id = a.ator_id
    LEFT JOIN public.fin_contas_movimento cm
           ON cm.tenant_id = p_tenant_id
          AND cm.id = (COALESCE(a.dados_depois, a.dados_antes)->>'conta_movimento_id')::uuid
   WHERE public.fin_pode(p_tenant_id, 'fechar_periodo')
     AND a.tabela = 'fin_fechamentos'
     AND COALESCE(a.dados_depois, a.dados_antes)->>'tenant_id' = p_tenant_id::text
  )
  SELECT e.quando, e.operacao, e.quem, e.conta, e.fechado_ate, e.observacao, e.em_vigor
    FROM eventos e
   ORDER BY e.em_vigor DESC, e.quando DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limite, 100), 500));
$$;

-- ---------------------------------------------------------------------------
-- 4.9 TRANSFERÊNCIA ENTRE CONTAS (RN-23, 24, 25, 30, 31)
-- ---------------------------------------------------------------------------
-- ⚠️ O `DROP` ABAIXO NÃO É ZELO — SEM ELE O BANCO FICA COM DUAS TRANSFERÊNCIAS.
-- Em 14/09/2026 a função ganhou dois parâmetros (as ordens das duas pernas).
-- `CREATE OR REPLACE` só substitui quando a LISTA DE PARÂMETROS é idêntica; com
-- uma lista diferente, o PostgreSQL entende que é outra função e cria uma
-- SOBRECARGA. As duas passariam a existir: a velha continuaria com o `GRANT`
-- que o arquivo já lhe deu e continuaria alcançável, jogando as pernas para o
-- fim do dia, enquanto a nova respeitaria a ordem — e qual das duas responderia
-- dependeria dos argumentos que o cliente mandasse. É o irmão do problema do
-- `RETURNS TABLE` que o `fin_extrato` já documenta: derrubar função não toca em
-- dado nenhum, e a assinatura do DROP são os PARÂMETROS ANTIGOS.
DROP FUNCTION IF EXISTS public.fin_transferir(uuid, uuid, uuid, date, bigint, text);

CREATE OR REPLACE FUNCTION public.fin_transferir(
  p_tenant_id uuid,
  p_conta_origem_id  uuid,
  p_conta_destino_id uuid,
  p_data date,
  p_valor_centavos bigint,
  p_historico text DEFAULT NULL,
  -- ⚠️ AS DUAS ORDENS SÃO OPCIONAIS E NULAS POR PADRÃO (pedido de 14/09/2026).
  -- Nulo mantém o comportamento de sempre: a perna vai para o fim do dia, pela
  -- `fin_proxima_ordem`. Preenchido, ela entra na posição pedida e empurra as
  -- seguintes — a mesma RN-12 do lançamento comum.
  p_ordem_origem  integer DEFAULT NULL,
  p_ordem_destino integer DEFAULT NULL
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
  v_ordem_org integer;
  v_ordem_dst integer;
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

  -- A ordem é posição no extrato: começa em 1 (RN-11).
  IF (p_ordem_origem IS NOT NULL AND p_ordem_origem < 1)
     OR (p_ordem_destino IS NOT NULL AND p_ordem_destino < 1) THEN
    RAISE EXCEPTION 'A ordem no extrato deve ser maior que zero.' USING ERRCODE = '23514';
  END IF;

  -- RN-24 nas DUAS contas
  IF public.fin_periodo_fechado(p_tenant_id, p_conta_origem_id, p_data)
     OR public.fin_periodo_fechado(p_tenant_id, p_conta_destino_id, p_data) THEN
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

  -- ⚠️ AS DUAS CONTAS SÃO DIFERENTES (recusado logo acima), ENTÃO OS DOIS
  -- DESLOCAMENTOS NÃO SE ATRAPALHAM. Fossem a mesma conta, abrir espaço para a
  -- segunda perna empurraria a primeira, que acabara de ser inserida.
  -- ⚠️ O `p_tenant_id` ENTROU AQUI EM 18/09/2026, junto com o da função. A
  -- checagem de permissão lá dentro não estorva: esta função já conferiu
  -- `transferencia` no topo, e a `fin_proxima_ordem` aceita justamente essa
  -- chave além de `lc_criar`. `SECURITY DEFINER` não troca o usuário da
  -- sessão — o `auth.uid()` lá dentro continua sendo o de quem clicou.
  v_ordem_org := COALESCE(p_ordem_origem,  public.fin_proxima_ordem(p_tenant_id, p_conta_origem_id,  p_data));
  v_ordem_dst := COALESCE(p_ordem_destino, public.fin_proxima_ordem(p_tenant_id, p_conta_destino_id, p_data));

  PERFORM public.fin_abrir_espaco_na_ordem(p_conta_origem_id,  p_data, v_ordem_org);
  PERFORM public.fin_abrir_espaco_na_ordem(p_conta_destino_id, p_data, v_ordem_dst);

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
    p_data, v_ordem_org,
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
    p_data, v_ordem_dst,
    'ENTRADA', 'PROPRIO', 'CAIXA',
    p_valor_centavos, v_hist, v_transf, auth.uid()
  );

  RETURN json_build_object(
    'success', true, 'transferencia_id', v_transf, 'categoria_id', v_categoria,
    'ordem_origem', v_ordem_org, 'ordem_destino', v_ordem_dst);
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
-- 4.14 OS SALDOS MENSAIS DAS CONTAS MOVIMENTO — o DASHBOARD 1 (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 O QUE ELA RESPONDE: "quanto havia em cada conta no último dia de cada mês
-- do ano?". Uma chamada devolve a grade inteira — contas, doze meses e as
-- linhas de TOTAL de cada bloco.
--
-- ⚠️ POR QUE ELA EXISTE, EM VEZ DE CHAMAR `fin_extrato` DOZE VEZES POR CONTA.
-- Numa empresa com 20 contas seriam 240 idas e voltas até o banco só para
-- desenhar uma tela. Aqui é UMA. É o mesmo princípio já escrito no CLAUDE.md
-- para a gravação em lote ("uma função que recebe o array faz uma viagem só"),
-- aplicado à leitura.
--
-- ⚠️ A LINHA DE TOTAL VEM DAQUI, E ISSO NÃO É DETALHE. Se a tela somasse as
-- colunas por conta própria, existiriam duas contas para o mesmo número: a do
-- banco e a da tela. No dia em que uma fosse corrigida e a outra não, o papel
-- impresso divergiria da tela. É a mesma regra que o CLAUDE.md já impõe à
-- exclusão em lote: quem conta tem de ser quem executa.
--
-- ⚠️ SALDO É ACUMULADO — cada mês carrega tudo o que veio antes. Mês sem
-- lançamento nenhum REPETE o saldo do mês anterior (não zera, não some). É por
-- isso que existe o `CROSS JOIN meses`: sem ele, abril sem movimento
-- desapareceria da grade.
--
-- ⚠️ CONTA DESATIVADA COM MOVIMENTO CONTINUA NA LISTA. A RN-06 manda o inativo
-- sumir das listas de LANÇAMENTO, e está certa — ninguém deve lançar numa conta
-- encerrada. Num RELATÓRIO de saldos seria o oposto: encerrar em julho uma
-- conta com R$ 6.800,00 dentro faria o TOTAL de janeiro a julho ficar R$
-- 6.800,00 menor que a realidade, em silêncio. A tela marca essas contas como
-- INATIVA; ocultá-las faria o relatório mentir.
--
-- ⚠️ SÓ REGIME CAIXA (RN-19), igual ao `fin_extrato`. Tem de ser a MESMA regra:
-- é ela que garante que o número da célula de março seja idêntico ao saldo
-- final do extrato de 01/03 a 31/03. Se as duas divergissem, o clique na
-- célula levaria a um número diferente do que estava na tela.
CREATE OR REPLACE FUNCTION public.fin_saldos_mensais_movimento(
  p_tenant_id uuid,
  p_ano       integer
)
RETURNS TABLE (
  bloco             text,      -- CAIXA_BANCO | OUTRAS
  linha_tipo        text,      -- CONTA | TOTAL
  conta_id          uuid,
  nome              text,
  tipo              text,
  is_active         boolean,
  mes               integer,   -- 1 a 12
  saldo_centavos    bigint,    -- ACUMULADO: o saldo no último dia do mês
  entradas_centavos bigint,    -- o que entrou NAQUELE mês (para a dica do mouse)
  saidas_centavos   bigint,    -- o que saiu NAQUELE mês
  fechado           boolean    -- o mês inteiro já está trancado? (RN-24)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_de  date;
  v_ate date;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'extrato_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver saldos.' USING ERRCODE = '42501';
  END IF;

  IF p_ano IS NULL OR p_ano < 1900 OR p_ano > 2999 THEN
    RAISE EXCEPTION 'Informe um ano entre 1900 e 2999.' USING ERRCODE = '22023';
  END IF;

  v_de  := make_date(p_ano,  1,  1);
  v_ate := make_date(p_ano, 12, 31);

  RETURN QUERY
  WITH conta AS (
    SELECT c.id, c.nome, c.tipo, c.is_active, c.saldo_abertura_centavos,
           CASE WHEN c.tipo IN ('CAIXA', 'BANCO') THEN 'CAIXA_BANCO' ELSE 'OUTRAS' END AS bloco
      FROM public.fin_contas_movimento c
     WHERE c.tenant_id = p_tenant_id
       AND (
             c.is_active
          OR c.saldo_abertura_centavos <> 0
          OR EXISTS (SELECT 1 FROM public.fin_lancamentos l
                      WHERE l.conta_movimento_id = c.id
                        AND l.regime = 'CAIXA'
                        AND l.data_movimento <= v_ate)
           )
  ),
  mes_do_ano AS (
    SELECT generate_series(1, 12) AS mes
  ),
  -- O ponto de partida da escada: o saldo em 31/12 do ano ANTERIOR.
  partida AS (
    SELECT c.id,
           (c.saldo_abertura_centavos + COALESCE((
              SELECT SUM(CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos
                              ELSE -l.valor_centavos END)
                FROM public.fin_lancamentos l
               WHERE l.conta_movimento_id = c.id
                 AND l.regime = 'CAIXA'
                 AND l.data_movimento < v_de), 0))::bigint AS saldo
      FROM conta c
  ),
  -- O movimento do ano agrupado por conta e mês, numa passada só pela tabela.
  --
  -- ⚠️ O `::bigint` NÃO É ENFEITE: no PostgreSQL `SUM()` sobre `bigint` devolve
  -- `numeric`, e sem a conversão a função é recusada com "structure of query
  -- does not match function result type". A mesma armadilha já comentada no
  -- `fin_extrato`.
  movimento AS (
    SELECT l.conta_movimento_id AS id,
           EXTRACT(MONTH FROM l.data_movimento)::integer AS mes,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'ENTRADA'), 0)::bigint AS entradas,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'SAIDA'),   0)::bigint AS saidas
      FROM public.fin_lancamentos l
     WHERE l.tenant_id = p_tenant_id
       AND l.regime = 'CAIXA'
       AND l.data_movimento BETWEEN v_de AND v_ate
     GROUP BY 1, 2
  ),
  grade AS (
    SELECT c.bloco, c.id, c.nome, c.tipo, c.is_active, m.mes,
           COALESCE(mv.entradas, 0)::bigint AS entradas,
           COALESCE(mv.saidas,   0)::bigint AS saidas,
           (p.saldo + SUM(COALESCE(mv.entradas, 0) - COALESCE(mv.saidas, 0))
                        OVER (PARTITION BY c.id ORDER BY m.mes
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))::bigint AS saldo
      FROM conta c
      CROSS JOIN mes_do_ano m
      JOIN partida p ON p.id = c.id
      LEFT JOIN movimento mv ON mv.id = c.id AND mv.mes = m.mes
  ),
  tudo AS (
    SELECT 1 AS ord_linha, g.bloco, 'CONTA'::text AS lt,
           g.id, g.nome, g.tipo, g.is_active, g.mes, g.saldo, g.entradas, g.saidas,
           -- O mês só conta como FECHADO quando o corte cobre o ÚLTIMO dia dele.
           EXISTS (SELECT 1 FROM public.fin_fechamentos f
                    WHERE f.tenant_id = p_tenant_id
                      AND f.conta_movimento_id = g.id
                      AND (make_date(p_ano, g.mes, 1) + INTERVAL '1 month - 1 day')::date <= f.fechado_ate
                  ) AS fechado
      FROM grade g
    UNION ALL
    SELECT 2, g.bloco, 'TOTAL'::text,
           NULL::uuid, NULL::text, NULL::text, NULL::boolean, g.mes,
           SUM(g.saldo)::bigint, SUM(g.entradas)::bigint, SUM(g.saidas)::bigint, false
      FROM grade g
     GROUP BY g.bloco, g.mes
  )
  SELECT t.bloco, t.lt, t.id, t.nome, t.tipo, t.is_active, t.mes,
         t.saldo, t.entradas, t.saidas, t.fechado
    FROM tudo t
   ORDER BY CASE t.bloco WHEN 'CAIXA_BANCO' THEN 1 ELSE 2 END,
            t.ord_linha, t.nome NULLS LAST, t.mes;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.15 OS MOVIMENTOS MENSAIS DAS IDENTIFICADORAS — o DASHBOARD 2 (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 O QUE ELA RESPONDE: "quanto passou por cada conta identificadora em cada
-- mês do ano?" — receitas primeiro (divididas em PRÓPRIAS e DE TERCEIROS),
-- depois despesas, o RESULTADO, e por fim as de tipo OUTRAS. Cada bloco com o
-- seu total mensal.
--
-- ===========================================================================
-- ⚠️ AQUI NÃO EXISTE "SALDO", E A DIFERENÇA É DE CONCEITO, NÃO DE NOME
-- ===========================================================================
-- A conta movimento tem `saldo_abertura_centavos`: ela GUARDA dinheiro, e por
-- isso tem saldo. A conta identificadora não tem coluna nenhuma de saldo — ela
-- EXPLICA dinheiro. "ENERGIA ELÉTRICA" não tem saldo, do mesmo jeito que o
-- motivo de uma viagem não tem quilometragem.
--
-- Por isso cada célula aqui é o MOVIMENTO LÍQUIDO DO MÊS, e não um acumulado.
-- Março mostra o que aconteceu em março. É o oposto exato do dashboard 1, e é
-- essa diferença que faz a coluna "TOTAL DO ANO" ter sentido aqui (somar doze
-- fluxos dá o fluxo do ano) e NÃO ter sentido lá (somar doze saldos daria um
-- número que nunca existiu).
--
-- ⚠️ O SINAL SEGUE A NATUREZA DA CONTA. Despesa sai positiva (`saidas -
-- entradas`), porque é assim que se lê um relatório: "ENERGIA 380,00", não
-- "ENERGIA −380,00". E um reembolso recebido REDUZ a despesa do mês, que é o
-- comportamento contábil correto — a RN-13 permite de propósito lançar uma
-- ENTRADA numa conta de DESPESA (estorno), apenas avisando na tela.
--
-- ===========================================================================
-- ⚠️ 18/09/2026 (2ª rodada) — A RECEITA VIROU DOIS BLOCOS, POR `propriedade`
-- ===========================================================================
-- Pedido do dono do projeto depois de ver a tela funcionando: separar
-- RECEITAS PRÓPRIAS de RECEITAS DE TERCEIROS. A distinção já existia no
-- lançamento (a coluna `propriedade`) e não aparecia em relatório nenhum.
--
-- ⚠️ A DIVISÃO É POR LANÇAMENTO, NÃO POR CADASTRO — e a consequência precisa
-- ficar dita: **a MESMA conta identificadora pode aparecer nos DOIS blocos**,
-- com valores diferentes, se ela tiver recebido dinheiro próprio num mês e de
-- terceiros noutro. Isso não é duplicidade: é a informação que o pedido quer.
--
-- ⚠️ E POR ISSO O `RETURNS TABLE` MUDOU — o que obriga o `DROP FUNCTION` logo
-- abaixo. `CREATE OR REPLACE` recusa mudança de tipo de retorno com
-- "cannot change return type of existing function", e o arquivo idempotente
-- pararia no meio. O DROP leva os PARÂMETROS (que não mudaram), porque é por
-- eles que o PostgreSQL identifica a função.
--
-- ⚠️ A CONTA "TRANSFERÊNCIA ENTRE CONTAS" (RN-30, `is_sistema`) aparece no
-- bloco OUTRAS e tende a somar ZERO todo mês — uma perna entra, a outra sai, do
-- mesmo valor (RN-23). Isso não é defeito: é a prova de que transferir não cria
-- nem destrói dinheiro. A tela oferece uma caixa para ocultá-la.
DROP FUNCTION IF EXISTS public.fin_movimentos_mensais_identificadora(uuid, integer);

CREATE OR REPLACE FUNCTION public.fin_movimentos_mensais_identificadora(
  p_tenant_id uuid,
  p_ano       integer
)
RETURNS TABLE (
  bloco             text,      -- RECEITA_PROPRIO | RECEITA_TERCEIROS | DESPESA | RESULTADO | OUTRAS
  linha_tipo        text,      -- CONTA | TOTAL
  conta_id          uuid,
  nome              text,
  tipo              text,
  propriedade       text,      -- PROPRIO | TERCEIROS (nulo nas linhas de total)
  is_active         boolean,
  is_sistema        boolean,
  mes               integer,   -- 1 a 12
  entradas_centavos bigint,
  saidas_centavos   bigint,
  liquido_centavos  bigint     -- na direção natural do tipo (ver acima)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_de  date;
  v_ate date;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'extrato_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver saldos.' USING ERRCODE = '42501';
  END IF;

  IF p_ano IS NULL OR p_ano < 1900 OR p_ano > 2999 THEN
    RAISE EXCEPTION 'Informe um ano entre 1900 e 2999.' USING ERRCODE = '22023';
  END IF;

  v_de  := make_date(p_ano,  1,  1);
  v_ate := make_date(p_ano, 12, 31);

  RETURN QUERY
  WITH categoria AS (
    SELECT ci.id, ci.nome, ci.tipo, ci.is_active, ci.is_sistema
      FROM public.fin_contas_identificadoras ci
     WHERE ci.tenant_id = p_tenant_id
       AND (
             ci.is_active
          OR EXISTS (SELECT 1 FROM public.fin_lancamentos l
                      WHERE l.conta_identificadora_id = ci.id
                        AND l.regime = 'CAIXA'
                        AND l.data_movimento BETWEEN v_de AND v_ate)
           )
  ),
  mes_do_ano AS (
    SELECT generate_series(1, 12) AS mes
  ),
  movimento AS (
    SELECT l.conta_identificadora_id AS id,
           l.propriedade,
           EXTRACT(MONTH FROM l.data_movimento)::integer AS mes,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'ENTRADA'), 0)::bigint AS entradas,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'SAIDA'),   0)::bigint AS saidas
      FROM public.fin_lancamentos l
     WHERE l.tenant_id = p_tenant_id
       AND l.regime = 'CAIXA'
       AND l.data_movimento BETWEEN v_de AND v_ate
     GROUP BY 1, 2, 3
  ),
  -- ⚠️ AS LINHAS DA GRADE SÃO (conta × propriedade), E SÓ PARA A RECEITA.
  -- Despesa e OUTRAS continuam com uma linha por conta: dividi-las também
  -- dobraria a tela sem responder a pergunta nenhuma que alguém tenha feito.
  --
  -- Para a RECEITA, entram as combinações que TÊM lançamento no ano; e a conta
  -- de receita que não teve nenhum (mas está ativa) entra uma vez, como
  -- PRÓPRIO — senão ela sumiria da tela sem explicação.
  linha_base AS (
    SELECT c.id, c.nome, c.tipo, c.is_active, c.is_sistema,
           CASE WHEN c.tipo = 'RECEITA' THEN mv.propriedade ELSE NULL END AS propriedade
      FROM categoria c
      JOIN movimento mv ON mv.id = c.id
     GROUP BY c.id, c.nome, c.tipo, c.is_active, c.is_sistema,
              CASE WHEN c.tipo = 'RECEITA' THEN mv.propriedade ELSE NULL END
    UNION
    SELECT c.id, c.nome, c.tipo, c.is_active, c.is_sistema,
           CASE WHEN c.tipo = 'RECEITA' THEN 'PROPRIO' ELSE NULL END
      FROM categoria c
     WHERE NOT EXISTS (SELECT 1 FROM movimento mv WHERE mv.id = c.id)
  ),
  grade AS (
    SELECT CASE WHEN b.tipo = 'RECEITA' THEN 'RECEITA_' || b.propriedade ELSE b.tipo END AS bloco,
           b.id, b.nome, b.tipo, b.propriedade, b.is_active, b.is_sistema, m.mes,
           COALESCE(mv.entradas, 0)::bigint AS entradas,
           COALESCE(mv.saidas,   0)::bigint AS saidas,
           (CASE WHEN b.tipo = 'DESPESA'
                 THEN COALESCE(mv.saidas, 0)   - COALESCE(mv.entradas, 0)
                 ELSE COALESCE(mv.entradas, 0) - COALESCE(mv.saidas,   0)
            END)::bigint AS liquido
      FROM linha_base b
      CROSS JOIN mes_do_ano m
      LEFT JOIN movimento mv
             ON mv.id = b.id
            AND mv.mes = m.mes
            AND (b.propriedade IS NULL OR mv.propriedade = b.propriedade)
  ),
  totais AS (
    SELECT g.bloco, g.mes,
           SUM(g.entradas)::bigint AS entradas,
           SUM(g.saidas)::bigint   AS saidas,
           SUM(g.liquido)::bigint  AS liquido
      FROM grade g
     GROUP BY g.bloco, g.mes
  ),
  tudo AS (
    SELECT 1 AS ord_linha, g.bloco, 'CONTA'::text AS lt,
           g.id, g.nome, g.tipo, g.propriedade, g.is_active, g.is_sistema, g.mes,
           g.entradas, g.saidas, g.liquido
      FROM grade g
    UNION ALL
    SELECT 2, t.bloco, 'TOTAL'::text,
           NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, t.mes,
           t.entradas, t.saidas, t.liquido
      FROM totais t
    UNION ALL
    -- A linha RESULTADO: receitas PRÓPRIAS menos despesas, mês a mês.
    --
    -- ⚠️ ELA IGNORA AS RECEITAS DE TERCEIROS, E ISSO É DECISÃO, NÃO DESCUIDO.
    -- Dinheiro de terceiros entra no SALDO (está na conta) mas não é receita do
    -- negócio — somá-lo aqui daria um número que se parece com lucro e não é.
    -- Pelo mesmo motivo o bloco OUTRAS (aporte de sócio, transferência) também
    -- fica de fora.
    SELECT 2, 'RESULTADO'::text, 'TOTAL'::text,
           NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, m.mes,
           COALESCE((SELECT t.entradas FROM totais t WHERE t.bloco = 'RECEITA_PROPRIO' AND t.mes = m.mes), 0)::bigint,
           COALESCE((SELECT t.saidas   FROM totais t WHERE t.bloco = 'DESPESA'         AND t.mes = m.mes), 0)::bigint,
           (COALESCE((SELECT t.liquido FROM totais t WHERE t.bloco = 'RECEITA_PROPRIO' AND t.mes = m.mes), 0)
          - COALESCE((SELECT t.liquido FROM totais t WHERE t.bloco = 'DESPESA'         AND t.mes = m.mes), 0))::bigint
      FROM mes_do_ano m
  )
  SELECT t.bloco, t.lt, t.id, t.nome, t.tipo, t.propriedade, t.is_active, t.is_sistema, t.mes,
         t.entradas, t.saidas, t.liquido
    FROM tudo t
   ORDER BY CASE t.bloco
              WHEN 'RECEITA_PROPRIO'   THEN 1
              WHEN 'RECEITA_TERCEIROS' THEN 2
              WHEN 'DESPESA'           THEN 3
              WHEN 'RESULTADO'         THEN 4
              ELSE 5
            END,
            t.ord_linha, t.nome NULLS LAST, t.mes;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.16 A CONFERÊNCIA DA CONTA IDENTIFICADORA (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 É a irmã espelhada do `fin_extrato`: em vez de "os lançamentos desta conta
-- movimento", devolve "os lançamentos desta identificadora, em QUALQUER conta
-- movimento". É o destino do clique no nome ou na célula do dashboard 2.
--
-- ⚠️ NÃO HÁ LINHA DE "SALDO INICIAL", E ISSO É PROPOSITAL. No extrato de uma
-- conta movimento a primeira linha diz quanto havia ANTES do período — o
-- dinheiro estava lá. Aqui não existe "quanto havia de energia elétrica em 28
-- de fevereiro": a identificadora não acumula. Inventar essa linha somando
-- todos os anos anteriores produziria um número que ninguém pediu.
--
-- ⚠️ A COLUNA SE CHAMA `acumulado_centavos`, E NÃO "saldo". Ela começa em ZERO
-- na primeira linha e fecha igual ao total do período. Chamá-la de saldo
-- ensinaria a coisa errada, e um dia alguém levaria esse número para um
-- balanço.
--
-- ⚠️ O ACUMULADO SEGUE A DIREÇÃO NATURAL DO TIPO, exatamente como o dashboard
-- 2: numa DESPESA ele soma as saídas e desconta as entradas. É isso que faz o
-- rodapé desta tela ser IDÊNTICO à célula do mês no dashboard — que é o
-- propósito inteiro de uma conferência.
--
-- ⚠️ `LEFT JOIN` PARA `public.users`, NUNCA `JOIN` SIMPLES. A RLS de `users` só
-- deixa cada um ver o próprio perfil; com `JOIN` comum, as linhas dos colegas
-- SUMIRIAM da lista e o total deixaria de bater com o que se vê. Com `LEFT`, a
-- linha fica e a coluna vem vazia. Proibição absoluta no CLAUDE.md.
CREATE OR REPLACE FUNCTION public.fin_extrato_identificadora(
  p_tenant_id               uuid,
  p_conta_identificadora_id uuid,
  p_data_inicial            date,
  p_data_final              date
)
RETURNS TABLE (
  linha_tipo         text,     -- LANCAMENTO | TOTAL
  lancamento_id      uuid,
  data_movimento     date,
  ordem_extrato      integer,
  conta_movimento    text,     -- o espelho: aqui aparece ONDE o dinheiro andou
  entrada_centavos   bigint,
  saida_centavos     bigint,
  acumulado_centavos bigint,
  historico          text,
  conferido          boolean,
  usuario            text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'extrato_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver o extrato.' USING ERRCODE = '42501';
  END IF;

  IF p_data_inicial IS NULL OR p_data_final IS NULL THEN
    RAISE EXCEPTION 'Informe a data inicial e a data final.' USING ERRCODE = '22023';  -- RN-17
  END IF;

  SELECT ci.tipo INTO v_tipo
    FROM public.fin_contas_identificadoras ci
   WHERE ci.id = p_conta_identificadora_id AND ci.tenant_id = p_tenant_id;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'Conta identificadora inexistente nesta empresa.' USING ERRCODE = '23503';
  END IF;

  RETURN QUERY
  WITH movimento AS (
    SELECT l.id,
           l.data_movimento,
           l.ordem_extrato,
           cm.nome AS conta_movimento,
           CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos ELSE 0 END AS entrada,
           CASE WHEN l.tipo_movimento = 'SAIDA'   THEN l.valor_centavos ELSE 0 END AS saida,
           -- A direção natural do tipo — ver a advertência no cabeçalho.
           CASE
             WHEN v_tipo = 'DESPESA' THEN
               CASE WHEN l.tipo_movimento = 'SAIDA' THEN l.valor_centavos ELSE -l.valor_centavos END
             ELSE
               CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos ELSE -l.valor_centavos END
           END AS delta,
           l.historico,
           l.conferido,
           l.created_at,
           u.email AS usuario
      FROM public.fin_lancamentos l
      JOIN public.fin_contas_movimento cm ON cm.id = l.conta_movimento_id
      LEFT JOIN public.users u ON u.id = l.criado_por
     WHERE l.conta_identificadora_id = p_conta_identificadora_id
       AND l.tenant_id = p_tenant_id
       AND l.regime = 'CAIXA'
       AND l.data_movimento BETWEEN p_data_inicial AND p_data_final
  ),
  com_acumulado AS (
    SELECT m.*,
           SUM(m.delta) OVER (
             -- RN-21: data → ordem (vazios por último) → instante de criação.
             ORDER BY m.data_movimento, m.ordem_extrato NULLS LAST, m.created_at
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           )::bigint AS acumulado
      FROM movimento m
  ),
  tudo AS (
    SELECT 1 AS bloco, 'LANCAMENTO'::text AS lt, a.id AS lid, a.data_movimento AS dt,
           a.ordem_extrato AS ord, a.conta_movimento AS cmov,
           NULLIF(a.entrada, 0)::bigint AS ent, NULLIF(a.saida, 0)::bigint AS sai,
           a.acumulado AS acu, a.historico AS hist, a.conferido AS conf,
           a.usuario AS usu, a.created_at AS criado
      FROM com_acumulado a
    UNION ALL
    SELECT 2, 'TOTAL'::text, NULL::uuid, p_data_final, NULL::integer,
           'TOTAIS DO PERIODO'::text,
           COALESCE((SELECT SUM(entrada) FROM com_acumulado), 0)::bigint,
           COALESCE((SELECT SUM(saida)   FROM com_acumulado), 0)::bigint,
           COALESCE((SELECT SUM(delta)   FROM com_acumulado), 0)::bigint,
           NULL::text, NULL::boolean, NULL::text, NULL::timestamptz
  )
  SELECT t.lt, t.lid, t.dt, t.ord, t.cmov, t.ent, t.sai, t.acu, t.hist, t.conf, t.usu
    FROM tudo t
   ORDER BY t.bloco, t.dt, t.ord NULLS LAST, t.criado;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.17 A CONFERÊNCIA DE VÁRIAS CONTAS SOMADAS (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 É o destino do clique na LINHA DE TOTAL do dashboard 1: "de onde vem este
-- total de CAIXA + BANCO?". Devolve o extrato consolidado de um conjunto de
-- contas movimento, com uma coluna a mais dizendo de qual conta é cada linha.
--
-- ⚠️ `NULL` E `[]` SÃO COISAS DIFERENTES NESTE PARÂMETRO, e confundi-los seria
-- repetir um defeito que este projeto já documentou em 17/09/2026:
--
--     p_conta_movimento_ids = NULL  → "não estou escolhendo": TODAS as contas
--     p_conta_movimento_ids = '{}'  → "desmarquei tudo": NENHUMA conta
--
-- Tratar os dois como "todas" faria um DESMARCAR TODOS mostrar o extrato
-- inteiro da empresa — o contrário exato do que a pessoa pediu.
--
-- ⚠️ O SALDO INICIAL É A SOMA DAS ABERTURAS mais tudo o que é anterior ao
-- período, nas contas escolhidas. É o mesmo cálculo do `fin_extrato`, feito
-- sobre um conjunto em vez de sobre uma conta.
CREATE OR REPLACE FUNCTION public.fin_extrato_consolidado(
  p_tenant_id            uuid,
  p_conta_movimento_ids  uuid[],
  p_data_inicial         date,
  p_data_final           date
)
RETURNS TABLE (
  linha_tipo       text,      -- INICIAL | LANCAMENTO | TOTAL
  lancamento_id    uuid,
  data_movimento   date,
  ordem_extrato    integer,
  conta_movimento  text,
  identificadora   text,
  entrada_centavos bigint,
  saida_centavos   bigint,
  saldo_centavos   bigint,
  historico        text,
  conferido        boolean,
  usuario          text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_inicial bigint;
  v_ids           uuid[];
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'extrato_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver o extrato.' USING ERRCODE = '42501';
  END IF;

  IF p_data_inicial IS NULL OR p_data_final IS NULL THEN
    RAISE EXCEPTION 'Informe a data inicial e a data final.' USING ERRCODE = '22023';  -- RN-17
  END IF;

  -- NULL = todas as contas da empresa; '{}' = nenhuma (ver o cabeçalho).
  IF p_conta_movimento_ids IS NULL THEN
    SELECT COALESCE(array_agg(c.id), '{}'::uuid[]) INTO v_ids
      FROM public.fin_contas_movimento c
     WHERE c.tenant_id = p_tenant_id;
  ELSE
    -- ⚠️ A LISTA RECEBIDA É FILTRADA PELA EMPRESA, e isso não é redundância:
    -- ela chega de fora, e uma chamada forjada poderia trazer o id de uma conta
    -- de OUTRA empresa. O `tenant_id` é o escudo, como em todo o módulo.
    SELECT COALESCE(array_agg(c.id), '{}'::uuid[]) INTO v_ids
      FROM public.fin_contas_movimento c
     WHERE c.tenant_id = p_tenant_id
       AND c.id = ANY(p_conta_movimento_ids);
  END IF;

  SELECT COALESCE(SUM(c.saldo_abertura_centavos), 0)::bigint
       + COALESCE((
           SELECT SUM(CASE WHEN l.tipo_movimento = 'ENTRADA' THEN l.valor_centavos
                           ELSE -l.valor_centavos END)
             FROM public.fin_lancamentos l
            WHERE l.conta_movimento_id = ANY(v_ids)
              AND l.tenant_id = p_tenant_id
              AND l.regime = 'CAIXA'
              AND l.data_movimento < p_data_inicial
         ), 0)
    INTO v_saldo_inicial
    FROM public.fin_contas_movimento c
   WHERE c.id = ANY(v_ids) AND c.tenant_id = p_tenant_id;

  v_saldo_inicial := COALESCE(v_saldo_inicial, 0);

  RETURN QUERY
  WITH movimento AS (
    SELECT l.id,
           l.data_movimento,
           l.ordem_extrato,
           cm.nome AS conta_movimento,
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
      JOIN public.fin_contas_movimento cm ON cm.id = l.conta_movimento_id
      JOIN public.fin_contas_identificadoras ci ON ci.id = l.conta_identificadora_id
      LEFT JOIN public.users u ON u.id = l.criado_por
     WHERE l.conta_movimento_id = ANY(v_ids)
       AND l.tenant_id = p_tenant_id
       AND l.regime = 'CAIXA'
       AND l.data_movimento BETWEEN p_data_inicial AND p_data_final
  ),
  com_saldo AS (
    SELECT m.*,
           (v_saldo_inicial + SUM(m.delta) OVER (
             ORDER BY m.data_movimento, m.ordem_extrato NULLS LAST, m.created_at
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           ))::bigint AS saldo
      FROM movimento m
  ),
  tudo AS (
    SELECT 1 AS bloco, 'INICIAL'::text AS lt, NULL::uuid AS lid,
           (p_data_inicial - 1) AS dt, NULL::integer AS ord,
           ''::text AS cmov, 'SALDO INICIAL'::text AS ident,
           NULL::bigint AS ent, NULL::bigint AS sai, v_saldo_inicial AS sal,
           NULL::text AS hist, NULL::boolean AS conf, NULL::text AS usu,
           NULL::timestamptz AS criado
    UNION ALL
    SELECT 2, 'LANCAMENTO'::text, s.id, s.data_movimento, s.ordem_extrato,
           s.conta_movimento, s.identificadora,
           NULLIF(s.entrada, 0), NULLIF(s.saida, 0), s.saldo,
           s.historico, s.conferido, s.usuario, s.created_at
      FROM com_saldo s
    UNION ALL
    SELECT 3, 'TOTAL'::text, NULL::uuid, p_data_final, NULL::integer,
           ''::text, 'TOTAIS DO PERIODO'::text,
           COALESCE((SELECT SUM(entrada) FROM com_saldo), 0)::bigint,
           COALESCE((SELECT SUM(saida)   FROM com_saldo), 0)::bigint,
           (v_saldo_inicial + COALESCE((SELECT SUM(delta) FROM com_saldo), 0))::bigint,
           NULL::text, NULL::boolean, NULL::text, NULL::timestamptz
  )
  SELECT t.lt, t.lid, t.dt, t.ord, t.cmov, t.ident, t.ent, t.sai, t.sal,
         t.hist, t.conf, t.usu
    FROM tudo t
   ORDER BY t.bloco, t.dt, t.ord NULLS LAST, t.criado;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.19 O QUE ESTE MEMBRO PODE VER NO DINHEIRO DO PERÍODO (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 Responde duas perguntas que NÃO cabem em `fin_pode()`:
--   • este membro vê VALORES, ou só o percentual?
--   • ele enxerga TODAS as contas do orçamento, ou só algumas?
--
-- ⚠️ POR QUE NÃO COUBE EM `fin_pode()`. Aquela função responde "tem esta chave
-- no array de permissões?" — sim ou não. Uma LISTA de contas liberadas e um
-- MODO de exibição não são sim-ou-não; são configuração. Elas moram no mesmo
-- `module_configs`, em campos próprios.
--
-- ⚠️ O PROPRIETÁRIO VÊ TUDO, SEMPRE. Ele não tem `module_configs` do módulo (a
-- `fin_pode` já lhe dá tudo por ser OWNER), e restringir o dono da empresa com
-- uma configuração que ele mesmo escreve não faria sentido nenhum.
--
-- ⚠️ `contas_liberadas = null` E `[]` SÃO COISAS DIFERENTES — pela terceira vez
-- neste módulo:
--     ausente / null → "não estou escolhendo": TODAS as contas
--     []             → "desmarquei tudo": NENHUMA conta
-- Tratá-los como iguais faria o botão DESMARCAR TODAS liberar o orçamento
-- inteiro, que é o contrário exato do que a pessoa acabou de pedir.
CREATE OR REPLACE FUNCTION public.fin_config_dinheiro(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   text;
  v_cfg    jsonb;
  v_contas jsonb;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'dp_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver o dinheiro do periodo.' USING ERRCODE = '42501';
  END IF;

  SELECT m.role, m.module_configs -> 'financeiro'
    INTO v_role, v_cfg
    FROM public.tenant_members m
   WHERE m.tenant_id = p_tenant_id
     AND m.user_id = auth.uid()
     AND m.is_active = true;

  IF v_role = 'OWNER' THEN
    RETURN json_build_object(
      'eh_owner', true, 've_valores', true, 'contas_liberadas', NULL);
  END IF;

  v_contas := v_cfg -> 'dinheiro_contas';

  RETURN json_build_object(
    'eh_owner', false,
    -- ⚠️ `ve_valores` é o INVERSO de `dinheiro_percentual`, e a ausência do
    -- campo significa "vê valores". O padrão de quem nunca mexeu tem de ser o
    -- comportamento completo; o modo restrito é o que se liga de propósito.
    've_valores', COALESCE((v_cfg ->> 'dinheiro_percentual')::boolean, false) = false,
    'contas_liberadas',
      CASE WHEN v_contas IS NULL OR jsonb_typeof(v_contas) <> 'array'
           THEN NULL ELSE v_contas END
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.20 GRAVAR UM ORÇAMENTO (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- ⚠️ ELA TRADUZ O ERRO DE DUPLICIDADE. Sem o bloco `EXCEPTION`, gravar duas
-- vezes a mesma conta na mesma competência devolveria o `23505` cru do
-- PostgreSQL — uma mensagem que fala de índice e não diz à pessoa o que ela
-- fez. A tela já pergunta antes ("substituir?"), mas uma chamada por fora dela
-- também precisa de resposta em português.
CREATE OR REPLACE FUNCTION public.fin_gravar_orcamento(
  p_tenant_id               uuid,
  p_id                      uuid,      -- null = novo
  p_competencia             date,
  p_conta_identificadora_id uuid,
  p_valor_centavos          bigint,
  p_observacao              text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_nome text;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'orc_gravar') THEN
    RAISE EXCEPTION 'Sem permissao para gravar orcamento.' USING ERRCODE = '42501';
  END IF;

  IF p_competencia IS NULL OR EXTRACT(DAY FROM p_competencia) <> 1 THEN
    RAISE EXCEPTION 'A competencia tem de ser o primeiro dia do mes.' USING ERRCODE = '22023';
  END IF;

  IF p_valor_centavos IS NULL OR p_valor_centavos <= 0 THEN
    RAISE EXCEPTION 'O valor do orcamento tem de ser maior que zero.' USING ERRCODE = '23514';
  END IF;

  SELECT ci.nome INTO v_nome
    FROM public.fin_contas_identificadoras ci
   WHERE ci.id = p_conta_identificadora_id AND ci.tenant_id = p_tenant_id;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Conta identificadora inexistente nesta empresa.' USING ERRCODE = '23503';
  END IF;

  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO public.fin_orcamentos
             (tenant_id, competencia, conta_identificadora_id, valor_centavos, observacao, criado_por)
      VALUES (p_tenant_id, p_competencia, p_conta_identificadora_id, p_valor_centavos,
              NULLIF(btrim(p_observacao), ''), auth.uid())
      RETURNING id INTO v_id;
    ELSE
      UPDATE public.fin_orcamentos
         SET competencia             = p_competencia,
             conta_identificadora_id = p_conta_identificadora_id,
             valor_centavos          = p_valor_centavos,
             observacao              = NULLIF(btrim(p_observacao), '')
       WHERE id = p_id AND tenant_id = p_tenant_id
      RETURNING id INTO v_id;

      IF v_id IS NULL THEN
        RAISE EXCEPTION 'Orcamento inexistente nesta empresa.' USING ERRCODE = '23503';
      END IF;
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION
      'Ja existe orcamento de "%" para %/%. Edite o registro existente em vez de criar outro.',
      v_nome, to_char(p_competencia, 'MM'), to_char(p_competencia, 'YYYY')
      USING ERRCODE = '23505';
  END;

  RETURN json_build_object('success', true, 'id', v_id, 'conta', v_nome);
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.21 EXCLUIR UM ORÇAMENTO (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- ⚠️ O RASTRO FICA NA `audit_log`, pelo gatilho da tabela — igual a todo o
-- resto do módulo. Apagar orçamento não destrói lançamento nenhum: são coisas
-- separadas, e é justamente por isso que o "dinheiro do período" continua
-- somando o realizado mesmo sem orçamento (ele vai para o bloco FORA).
CREATE OR REPLACE FUNCTION public.fin_excluir_orcamento(p_tenant_id uuid, p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_apagados int;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'orc_excluir') THEN
    RAISE EXCEPTION 'Sem permissao para excluir orcamento.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.fin_orcamentos
   WHERE id = p_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_apagados = ROW_COUNT;

  RETURN json_build_object('success', true, 'apagados', v_apagados);
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.22 A CONFERÊNCIA DOS REGISTROS DE UMA COMPETÊNCIA (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 A lista que aparece abaixo dos campos em "+ ADICIONAR NOVO", e que a
-- PESQUISAR abre ao clicar numa competência.
--
-- ⚠️ A ORDEM É RECEITA → DESPESA → OUTRAS, como o dono do projeto pediu, e ela
-- vem DAQUI — não da tela. É a mesma razão de sempre: ordenar em dois lugares é
-- ter duas regras que um dia discordam sobre acento.
--
-- ⚠️ E AS LINHAS DE TOTAL VÊM JUNTO, marcadas por `linha_tipo`. A tela não soma
-- nada; o papel impresso e o .TSV mostram o mesmo número porque saem da mesma
-- lista.
CREATE OR REPLACE FUNCTION public.fin_listar_orcamento(
  p_tenant_id   uuid,
  p_competencia date
)
RETURNS TABLE (
  bloco          text,      -- RECEITA | DESPESA | OUTRAS
  linha_tipo     text,      -- CONTA | TOTAL
  orcamento_id   uuid,
  conta_id       uuid,
  nome           text,
  is_active      boolean,
  valor_centavos bigint,
  observacao     text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'orc_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver o orcamento.' USING ERRCODE = '42501';
  END IF;

  IF p_competencia IS NULL THEN
    RAISE EXCEPTION 'Informe a competencia.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH linha AS (
    SELECT ci.tipo AS bloco, o.id AS orcamento_id, ci.id AS conta_id,
           ci.nome, ci.is_active, o.valor_centavos, o.observacao
      FROM public.fin_orcamentos o
      JOIN public.fin_contas_identificadoras ci ON ci.id = o.conta_identificadora_id
     WHERE o.tenant_id = p_tenant_id
       AND o.competencia = date_trunc('month', p_competencia)::date
  ),
  tudo AS (
    SELECT 1 AS ord, l.bloco, 'CONTA'::text AS lt, l.orcamento_id, l.conta_id,
           l.nome, l.is_active, l.valor_centavos, l.observacao
      FROM linha l
    UNION ALL
    SELECT 2, l.bloco, 'TOTAL'::text, NULL::uuid, NULL::uuid,
           NULL::text, NULL::boolean, SUM(l.valor_centavos)::bigint, NULL::text
      FROM linha l
     GROUP BY l.bloco
  )
  SELECT t.bloco, t.lt, t.orcamento_id, t.conta_id, t.nome, t.is_active,
         t.valor_centavos, t.observacao
    FROM tudo t
   ORDER BY CASE t.bloco WHEN 'RECEITA' THEN 1 WHEN 'DESPESA' THEN 2 ELSE 3 END,
            t.ord, t.nome NULLS LAST;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.23 AS COMPETÊNCIAS QUE TÊM ORÇAMENTO — a tela PESQUISAR (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- ⚠️ O FILTRO DE CONTA MUDA O SENTIDO DA LISTA, e a tela avisa por isso. Com
-- ele ligado, os totais passam a ser DAQUELA CONTA, não da competência inteira
-- — e "SETEMBRO / 2026 · 1 conta · 400,00" seria lido como "o orçamento de
-- setembro é de 400,00" se ninguém avisasse.
--
-- ⚠️ A ÚLTIMA LINHA É O TOTAL DO PERÍODO PESQUISADO (bônus B5), marcada com
-- `competencia IS NULL`. Somar competências faz sentido: orçamento é FLUXO, e
-- fluxo se soma — a mesma regra que dá a coluna TOTAL DO ANO ao dashboard 2 e a
-- nega ao dashboard 1.
CREATE OR REPLACE FUNCTION public.fin_competencias_orcadas(
  p_tenant_id               uuid,
  p_de                      date,
  p_ate                     date,
  p_conta_identificadora_id uuid DEFAULT NULL
)
RETURNS TABLE (
  competencia      date,      -- NULL na linha de total do período
  contas           integer,
  receitas_centavos bigint,
  despesas_centavos bigint,
  outras_centavos   bigint,
  total_centavos    bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'orc_ver') THEN
    RAISE EXCEPTION 'Sem permissao para ver o orcamento.' USING ERRCODE = '42501';
  END IF;

  IF p_de IS NULL OR p_ate IS NULL THEN
    RAISE EXCEPTION 'Informe a competencia inicial e a final.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH linha AS (
    SELECT o.competencia, ci.tipo, o.valor_centavos
      FROM public.fin_orcamentos o
      JOIN public.fin_contas_identificadoras ci ON ci.id = o.conta_identificadora_id
     WHERE o.tenant_id = p_tenant_id
       AND o.competencia BETWEEN date_trunc('month', p_de)::date
                             AND date_trunc('month', p_ate)::date
       AND (p_conta_identificadora_id IS NULL
            OR o.conta_identificadora_id = p_conta_identificadora_id)
  ),
  tudo AS (
    SELECT 1 AS ord, l.competencia,
           count(*)::integer AS contas,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo = 'RECEITA'), 0)::bigint AS rec,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo = 'DESPESA'), 0)::bigint AS des,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo = 'OUTRAS'),  0)::bigint AS out,
           SUM(l.valor_centavos)::bigint AS tot
      FROM linha l
     GROUP BY l.competencia
    UNION ALL
    SELECT 2, NULL::date,
           count(*)::integer,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo = 'RECEITA'), 0)::bigint,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo = 'DESPESA'), 0)::bigint,
           COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo = 'OUTRAS'),  0)::bigint,
           COALESCE(SUM(l.valor_centavos), 0)::bigint
      FROM linha l
     HAVING count(*) > 0
  )
  SELECT t.competencia, t.contas, t.rec, t.des, t.out, t.tot
    FROM tudo t
   ORDER BY t.ord, t.competencia DESC;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.24 COPIAR O ORÇAMENTO DE UMA COMPETÊNCIA PARA OUTRA (bônus B1, 18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 Sem isto, montar o orçamento de outubro significa redigitar as mesmas 15
-- contas de setembro, uma a uma, todo mês. É o bônus de maior retorno da
-- rodada.
--
-- ⚠️ `p_substituir` TEM `false` COMO PADRÃO, e isso é regra deste projeto: o
-- padrão de um parâmetro que decide se algo é SOBRESCRITO tem de ser o
-- comportamento inofensivo. Esquecer o argumento não pode apagar o valor que
-- alguém já ajustou à mão no mês de destino.
--
-- ⚠️ E A CÓPIA É UMA INSTRUÇÃO SÓ, não um laço no TypeScript. Queda de conexão
-- no meio de um laço deixaria metade copiada, sem ninguém saber qual metade.
CREATE OR REPLACE FUNCTION public.fin_copiar_orcamento(
  p_tenant_id  uuid,
  p_origem     date,
  p_destino    date,
  p_substituir boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem   date := date_trunc('month', p_origem)::date;
  v_destino  date := date_trunc('month', p_destino)::date;
  v_copiados int := 0;
  v_ja       int := 0;
  v_na_origem int := 0;
BEGIN
  IF NOT public.fin_pode(p_tenant_id, 'orc_gravar') THEN
    RAISE EXCEPTION 'Sem permissao para gravar orcamento.' USING ERRCODE = '42501';
  END IF;

  IF p_origem IS NULL OR p_destino IS NULL THEN
    RAISE EXCEPTION 'Informe a competencia de origem e a de destino.' USING ERRCODE = '22023';
  END IF;

  IF v_origem = v_destino THEN
    RAISE EXCEPTION 'A competencia de origem e a de destino sao a mesma.' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_na_origem
    FROM public.fin_orcamentos
   WHERE tenant_id = p_tenant_id AND competencia = v_origem;

  INSERT INTO public.fin_orcamentos
         (tenant_id, competencia, conta_identificadora_id, valor_centavos, observacao, criado_por)
  SELECT o.tenant_id, v_destino, o.conta_identificadora_id, o.valor_centavos, o.observacao, auth.uid()
    FROM public.fin_orcamentos o
   WHERE o.tenant_id = p_tenant_id AND o.competencia = v_origem
     ON CONFLICT (tenant_id, competencia, conta_identificadora_id) DO UPDATE
        SET valor_centavos = CASE WHEN p_substituir THEN EXCLUDED.valor_centavos
                                  ELSE public.fin_orcamentos.valor_centavos END,
            observacao     = CASE WHEN p_substituir THEN EXCLUDED.observacao
                                  ELSE public.fin_orcamentos.observacao END;

  GET DIAGNOSTICS v_copiados = ROW_COUNT;

  SELECT count(*) INTO v_ja
    FROM public.fin_orcamentos d
   WHERE d.tenant_id = p_tenant_id AND d.competencia = v_destino
     AND EXISTS (SELECT 1 FROM public.fin_orcamentos o
                  WHERE o.tenant_id = p_tenant_id AND o.competencia = v_origem
                    AND o.conta_identificadora_id = d.conta_identificadora_id);

  RETURN json_build_object(
    'success', true,
    'na_origem', v_na_origem,
    'no_destino', v_ja,
    'substituiu', p_substituir);
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.25 DINHEIRO DO PERÍODO — o orçado contra o realizado (18/09/2026)
-- ---------------------------------------------------------------------------
--
-- 📖 A peça central desta rodada. Devolve, por conta identificadora orçada
-- naquela competência: quanto se planejou, quanto de fato aconteceu, o saldo e
-- o consumo em percentual — já na ordem RECEITA → DESPESA → OUTRAS, com os
-- totais, a linha de RESULTADO e o bloco do gasto FORA do orçamento.
--
-- ===========================================================================
-- ⚠️ NO MODO PERCENTUAL, O VALOR **NÃO SAI DAQUI** — E ESSE É O PONTO
-- ===========================================================================
-- O jeito óbvio de implementar "o dependente vê só o percentual" seria devolver
-- tudo e a TELA esconder os valores. Isso não esconde coisa nenhuma: os números
-- atravessariam a internet e ficariam dentro do navegador dele, legíveis com a
-- tecla F12 na aba de rede, em texto puro. Não é preciso saber programar; é
-- preciso saber clicar. É exatamente o erro do `sessionStorage.dev_vip_access`
-- que este projeto já documentou.
--
-- Por isso quem decide é ESTA função: no modo percentual ela devolve
-- `orcado`, `realizado` e `saldo` em NULL, e só o `consumo_percentual`. A tela
-- não precisa esconder nada porque não há o que esconder.
--
-- ⚠️ E O PERCENTUAL SAI ARREDONDADO PARA INTEIRO. "78%" não permite deduzir os
-- valores; "77,9412%" reduziria muito as combinações possíveis para quem
-- soubesse o realizado por outro caminho. Custa nada, e fecha a fresta.
--
-- ⚠️ MAS ISSO NÃO É UM COFRE, E ESTÁ ESCRITO NO ESTUDO: quem tiver
-- `extrato_ver`, `lc_ver_todos`, `imprimir`, `orc_ver` ou `cm_ver` chega aos
-- mesmos valores por outra tela. O modo percentual só é sigilo de verdade se o
-- dependente não tiver nenhuma dessas cinco — e a tela de CONFIGURAÇÕES avisa
-- quando esse for o caso.
--
-- ===========================================================================
-- ⚠️ O REALIZADO SEGUE AS MESMAS QUATRO REGRAS DO RESTO DO MÓDULO
-- ===========================================================================
--   1. só regime CAIXA (RN-19) — senão o mesmo mês mostraria dois valores em
--      duas telas do mesmo sistema;
--   2. soma PRÓPRIO e TERCEIROS — o orçamento é da conta, não da propriedade;
--   3. na DESPESA conta `saidas - entradas` (um reembolso REDUZ a despesa),
--      igual ao dashboard 2 — é o que faz os dois mostrarem o MESMO número;
--   4. realizado negativo devolve consumo 0, e não um percentual negativo:
--      barra de largura negativa não existe, e o valor negativo é escrito ao
--      lado pela tela.
CREATE OR REPLACE FUNCTION public.fin_dinheiro_do_periodo(
  p_tenant_id   uuid,
  p_competencia date
)
RETURNS TABLE (
  bloco              text,     -- RECEITA | DESPESA | RESULTADO | OUTRAS | FORA
  linha_tipo         text,     -- CONTA | TOTAL
  conta_id           uuid,
  nome               text,
  tipo               text,
  orcado_centavos    bigint,   -- NULL no modo percentual
  realizado_centavos bigint,   -- NULL no modo percentual
  saldo_centavos     bigint,   -- NULL no modo percentual
  consumo_percentual integer,  -- NULL quando não há orçamento (bloco FORA)
  estourou           boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg        json;
  v_ve_valores boolean;
  v_liberadas  uuid[];
  v_de         date;
  v_ate        date;
BEGIN
  -- A permissão é conferida dentro de `fin_config_dinheiro`, que estoura 42501.
  v_cfg := public.fin_config_dinheiro(p_tenant_id);
  v_ve_valores := (v_cfg ->> 've_valores')::boolean;

  IF p_competencia IS NULL THEN
    RAISE EXCEPTION 'Informe a competencia.' USING ERRCODE = '22023';
  END IF;

  v_de  := date_trunc('month', p_competencia)::date;
  v_ate := (v_de + INTERVAL '1 month - 1 day')::date;

  -- ⚠️ `contas_liberadas` NULO = todas. `[]` = nenhuma. A diferença é
  -- preservada até aqui dentro: um `COALESCE` para array vazio transformaria
  -- "não escolhi" em "nada", e o dependente veria uma tela em branco.
  IF (v_cfg -> 'contas_liberadas') IS NULL
     OR json_typeof(v_cfg -> 'contas_liberadas') <> 'array' THEN
    v_liberadas := NULL;
  ELSE
    SELECT COALESCE(array_agg((x #>> '{}')::uuid), '{}'::uuid[])
      INTO v_liberadas
      FROM json_array_elements(v_cfg -> 'contas_liberadas') x;
  END IF;

  RETURN QUERY
  WITH orcado AS (
    SELECT o.conta_identificadora_id AS conta_id, ci.nome, ci.tipo,
           o.valor_centavos AS orcado
      FROM public.fin_orcamentos o
      JOIN public.fin_contas_identificadoras ci ON ci.id = o.conta_identificadora_id
     WHERE o.tenant_id = p_tenant_id
       AND o.competencia = v_de
       AND (v_liberadas IS NULL OR o.conta_identificadora_id = ANY(v_liberadas))
  ),
  realizado AS (
    SELECT l.conta_identificadora_id AS conta_id,
           (CASE WHEN ci.tipo = 'DESPESA'
                 THEN COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'SAIDA'),   0)
                    - COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'ENTRADA'), 0)
                 ELSE COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'ENTRADA'), 0)
                    - COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.tipo_movimento = 'SAIDA'),   0)
            END)::bigint AS realizado,
           ci.nome, ci.tipo
      FROM public.fin_lancamentos l
      JOIN public.fin_contas_identificadoras ci ON ci.id = l.conta_identificadora_id
     WHERE l.tenant_id = p_tenant_id
       AND l.regime = 'CAIXA'
       AND l.data_movimento BETWEEN v_de AND v_ate
       AND (v_liberadas IS NULL OR l.conta_identificadora_id = ANY(v_liberadas))
     GROUP BY l.conta_identificadora_id, ci.nome, ci.tipo
  ),
  linha AS (
    SELECT o.conta_id, o.nome, o.tipo, o.orcado,
           COALESCE(r.realizado, 0)::bigint AS realizado,
           (o.orcado - COALESCE(r.realizado, 0))::bigint AS saldo,
           -- realizado negativo vira 0% (regra 4 do cabeçalho)
           GREATEST(0, ROUND(COALESCE(r.realizado, 0)::numeric * 100 / o.orcado))::integer AS consumo
      FROM orcado o
      LEFT JOIN realizado r ON r.conta_id = o.conta_id
  ),
  -- 🎁 BÔNUS B2 — o gasto que ninguém planejou. Sem este bloco, uma conta em
  -- que se gastou e não se orçou simplesmente SOME da tela, e é justamente o
  -- gasto imprevisto que se precisa ver.
  fora AS (
    SELECT r.conta_id, r.nome, r.tipo, r.realizado
      FROM realizado r
     WHERE NOT EXISTS (SELECT 1 FROM orcado o WHERE o.conta_id = r.conta_id)
       AND r.realizado <> 0
  ),
  totais AS (
    SELECT l.tipo AS bloco,
           SUM(l.orcado)::bigint AS orcado,
           SUM(l.realizado)::bigint AS realizado
      FROM linha l
     GROUP BY l.tipo
  ),
  tudo AS (
    SELECT 1 AS ord, l.tipo AS bloco, 'CONTA'::text AS lt, l.conta_id, l.nome, l.tipo,
           l.orcado, l.realizado, l.saldo, l.consumo,
           (l.realizado > l.orcado) AS estourou
      FROM linha l
    UNION ALL
    SELECT 2, t.bloco, 'TOTAL'::text, NULL::uuid, NULL::text, NULL::text,
           t.orcado, t.realizado, (t.orcado - t.realizado)::bigint,
           GREATEST(0, ROUND(t.realizado::numeric * 100 / NULLIF(t.orcado, 0)))::integer,
           (t.realizado > t.orcado)
      FROM totais t
    UNION ALL
    -- 🎁 BÔNUS B3 — o RESULTADO orçado contra o realizado. "Planejei sobrar
    -- 5.700,00 e estou sobrando 3.348,00" é a pergunta que a tela provoca.
    --
    -- ⚠️ ELE IGNORA O BLOCO OUTRAS, como no dashboard 2: aporte de sócio e
    -- transferência não são resultado do negócio.
    SELECT 3, 'RESULTADO'::text, 'TOTAL'::text, NULL::uuid, NULL::text, NULL::text,
           (COALESCE((SELECT t.orcado FROM totais t WHERE t.bloco = 'RECEITA'), 0)
          - COALESCE((SELECT t.orcado FROM totais t WHERE t.bloco = 'DESPESA'), 0))::bigint,
           (COALESCE((SELECT t.realizado FROM totais t WHERE t.bloco = 'RECEITA'), 0)
          - COALESCE((SELECT t.realizado FROM totais t WHERE t.bloco = 'DESPESA'), 0))::bigint,
           NULL::bigint, NULL::integer, false
     WHERE EXISTS (SELECT 1 FROM totais)
    UNION ALL
    SELECT 4, 'FORA'::text, 'CONTA'::text, f.conta_id, f.nome, f.tipo,
           NULL::bigint, f.realizado, NULL::bigint, NULL::integer, false
      FROM fora f
  )
  SELECT t.bloco, t.lt, t.conta_id, t.nome, t.tipo,
         -- ⚠️ É AQUI que o modo percentual acontece: o valor vira NULL ANTES
         -- de sair do banco. Não há tela envolvida nesta decisão.
         CASE WHEN v_ve_valores THEN t.orcado    END,
         CASE WHEN v_ve_valores THEN t.realizado END,
         CASE WHEN v_ve_valores THEN t.saldo     END,
         t.consumo,
         t.estourou
    FROM tudo t
   ORDER BY CASE t.bloco
              WHEN 'RECEITA'   THEN 1
              WHEN 'DESPESA'   THEN 2
              WHEN 'RESULTADO' THEN 3
              WHEN 'OUTRAS'    THEN 4
              ELSE 5
            END,
            t.ord, t.nome NULLS LAST;
END;
$$;


-- ---------------------------------------------------------------------------
-- 4.18 APAGAR TODOS OS DADOS DO MÓDULO NUMA EMPRESA (RN-28)
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
-- 5. POLICIES — leitura por quem tem acesso ao módulo; escrita só pelas funções
-- ===========================================================================
--
-- ⚠️ 23/09/2026 — AS CINCO POLICIES DE LEITURA FORAM APERTADAS (achado A1).
-- Elas diziam "membro ativo da empresa lê tudo" (`check_is_tenant_member`), e
-- isso derrubava em silêncio três promessas das telas: a CHAVE 2 da plataforma
-- (`allowed_modules`), a permissão `lc_ver_todos` e o modo "só percentual" do
-- DINHEIRO DO PERÍODO. Agora:
--
--   • cadastros e fechamentos → quem tem acesso ao módulo (`fin_tem_acesso`);
--     o SALDO DE ABERTURA não sai por aqui (privilégio de coluna, seção 7);
--   • lançamentos → quem pode ver os de todos (`lc_ver_todos`, ou `extrato_ver`
--     e `lc_excluir_lote`, que já mostram todos por função) OU o próprio autor;
--   • orçamento → `orc_ver`.
--
-- ⚠️ AS FUNÇÕES `fin_*` NÃO SÃO AFETADAS: são `SECURITY DEFINER` e o dono delas
-- é o dono das tabelas, então a RLS não se aplica lá dentro. Estas policies
-- valem só para a LEITURA DIRETA feita pelo app (`supabase.from('fin_...')`).
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
USING (public.fin_tem_acesso(tenant_id));

DROP POLICY IF EXISTS "Identificadoras da empresa" ON public.fin_contas_identificadoras;
CREATE POLICY "Identificadoras da empresa" ON public.fin_contas_identificadoras
FOR SELECT TO authenticated
USING (public.fin_tem_acesso(tenant_id));

DROP POLICY IF EXISTS "Lancamentos da empresa" ON public.fin_lancamentos;
CREATE POLICY "Lancamentos da empresa" ON public.fin_lancamentos
FOR SELECT TO authenticated
USING (
       public.fin_pode(tenant_id, 'lc_ver_todos')
    OR public.fin_pode(tenant_id, 'extrato_ver')
    OR public.fin_pode(tenant_id, 'lc_excluir_lote')
    OR (criado_por = auth.uid() AND public.fin_tem_acesso(tenant_id))
);

DROP POLICY IF EXISTS "Fechamentos da empresa" ON public.fin_fechamentos;
CREATE POLICY "Fechamentos da empresa" ON public.fin_fechamentos
FOR SELECT TO authenticated
USING (public.fin_tem_acesso(tenant_id));

-- ⚠️ 18/09/2026 — A POLICY DO ORÇAMENTO É DE LEITURA, E COM `TO authenticated`.
-- Sem o `TO`, o padrão do PostgreSQL é PUBLIC, e foi assim que a lista de
-- usuários ficou aberta até a v9. Escrita continua sem policy nenhuma: grava-se
-- só por função `SECURITY DEFINER`, que confere `fin_pode()` por dentro.
DROP POLICY IF EXISTS "Orcamentos da empresa" ON public.fin_orcamentos;
CREATE POLICY "Orcamentos da empresa" ON public.fin_orcamentos
FOR SELECT TO authenticated
USING (public.fin_pode(tenant_id, 'orc_ver'));


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

-- 18/09/2026 — os dois gatilhos do orçamento.
DROP TRIGGER IF EXISTS set_updated_at_fin_orc ON public.fin_orcamentos;
CREATE TRIGGER set_updated_at_fin_orc BEFORE UPDATE ON public.fin_orcamentos
  FOR EACH ROW EXECUTE PROCEDURE public.marcar_atualizacao();

DROP TRIGGER IF EXISTS audit_fin_orc ON public.fin_orcamentos;
CREATE TRIGGER audit_fin_orc AFTER UPDATE OR DELETE ON public.fin_orcamentos
  FOR EACH ROW EXECUTE PROCEDURE public.registrar_auditoria();


-- ===========================================================================
-- 7. PRIVILÉGIOS
-- ===========================================================================
REVOKE ALL ON public.fin_contas_movimento       FROM anon, authenticated;
REVOKE ALL ON public.fin_contas_identificadoras FROM anon, authenticated;
REVOKE ALL ON public.fin_lancamentos            FROM anon, authenticated;
REVOKE ALL ON public.fin_fechamentos            FROM anon, authenticated;
REVOKE ALL ON public.fin_orcamentos             FROM anon, authenticated;

-- Leitura filtrada pela RLS; escrita, nenhuma.
--
-- ⚠️ 23/09/2026 — `fin_contas_movimento` RECEBE SELECT COLUNA A COLUNA, SEM
-- `saldo_abertura_centavos` (achado A1). A lista de contas precisa estar
-- aberta a quem lança e a quem transfere; o saldo de abertura é um VALOR, que
-- só `cm_ver` deve revelar — e ele sai pela `fin_saldos_de_abertura`, que
-- confere a permissão. O `REVOKE ALL` acima também retira os privilégios de
-- coluna de uma execução anterior, e é isso que mantém o arquivo reaplicável.
-- ⚠️ CONSEQUÊNCIA PARA QUEM ESCREVE CÓDIGO: `select('*')` nesta tabela passa a
-- responder `permission denied for column`. Liste as colunas.
GRANT SELECT (id, tenant_id, nome, nome_normalizado, tipo, is_active,
              criado_por, created_at, updated_at)
             ON public.fin_contas_movimento       TO authenticated;
GRANT SELECT ON public.fin_contas_identificadoras TO authenticated;
GRANT SELECT ON public.fin_lancamentos            TO authenticated;
GRANT SELECT ON public.fin_fechamentos            TO authenticated;
GRANT SELECT ON public.fin_orcamentos             TO authenticated;

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
REVOKE EXECUTE ON FUNCTION public.fin_periodo_fechado(uuid, uuid, date)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_proxima_ordem(uuid, uuid, date)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_buscar_contas_movimento(uuid, text)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_buscar_identificadoras(uuid, text)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_conta_movimento(uuid, uuid, text, text, bigint, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_identificadora(uuid, uuid, text, text, boolean)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_importar_contas_movimento(uuid, text, text[])      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_importar_identificadoras(uuid, text, text[])       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_lancamento(uuid, uuid, uuid, uuid, date, integer, text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_excluir_lancamento(uuid, uuid)                     FROM PUBLIC, anon, authenticated;
-- 17/09/2026 — exclusão em lote, lixeira e histórico de fechamentos.
REVOKE EXECUTE ON FUNCTION public.fin_excluir_lancamentos_por_periodo(uuid, uuid, date, date, boolean, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_limpar_lixeira(uuid, bigint[], boolean)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_listar_exclusoes(uuid, timestamptz, integer)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_restaurar_lancamento(uuid, bigint)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_historico_fechamentos(uuid, integer)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_transferir(uuid, uuid, uuid, date, bigint, text, integer, integer)
                                                                                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_abrir_espaco_na_ordem(uuid, date, integer, uuid)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_marcar_conferido(uuid, uuid, boolean)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_fechar_periodo(uuid, uuid, date, text)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_reabrir_periodo(uuid, uuid)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_extrato(uuid, uuid, date, date)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_saldo_atual(uuid, uuid)                            FROM PUBLIC, anon, authenticated;
-- 18/09/2026 — os dois dashboards e as duas conferências novas.
REVOKE EXECUTE ON FUNCTION public.fin_saldos_mensais_movimento(uuid, integer)             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_movimentos_mensais_identificadora(uuid, integer)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_extrato_identificadora(uuid, uuid, date, date)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_extrato_consolidado(uuid, uuid[], date, date)       FROM PUBLIC, anon, authenticated;
-- 18/09/2026 — o orçamento e o dinheiro do período.
REVOKE EXECUTE ON FUNCTION public.fin_config_dinheiro(uuid)                               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_gravar_orcamento(uuid, uuid, date, uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_excluir_orcamento(uuid, uuid)                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_listar_orcamento(uuid, date)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_competencias_orcadas(uuid, date, date, uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_copiar_orcamento(uuid, date, date, boolean)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_dinheiro_do_periodo(uuid, date)                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_apagar_dados_da_empresa(uuid)                      FROM PUBLIC, anon, authenticated;
-- 23/09/2026 — as quatro da engenharia reversa (achados A1 e A7).
REVOKE EXECUTE ON FUNCTION public.fin_tem_acesso(uuid)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_saldos_de_abertura(uuid)                           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_excluir_conta_movimento(uuid, uuid)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fin_excluir_identificadora(uuid, uuid)                 FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fin_normalizar(text)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_pode(uuid, text)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_periodo_fechado(uuid, uuid, date)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_proxima_ordem(uuid, uuid, date)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_buscar_contas_movimento(uuid, text)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_buscar_identificadoras(uuid, text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_conta_movimento(uuid, uuid, text, text, bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_identificadora(uuid, uuid, text, text, boolean)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_importar_contas_movimento(uuid, text, text[])      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_importar_identificadoras(uuid, text, text[])       TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_lancamento(uuid, uuid, uuid, uuid, date, integer, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_excluir_lancamento(uuid, uuid)                     TO authenticated;
-- 17/09/2026 — cada uma confere a permissão por dentro (`fin_pode`); o GRANT
-- só diz "pode chamar", nunca "pode fazer".
GRANT EXECUTE ON FUNCTION public.fin_excluir_lancamentos_por_periodo(uuid, uuid, date, date, boolean, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_limpar_lixeira(uuid, bigint[], boolean)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_listar_exclusoes(uuid, timestamptz, integer)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_restaurar_lancamento(uuid, bigint)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_historico_fechamentos(uuid, integer)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_transferir(uuid, uuid, uuid, date, bigint, text, integer, integer)
                                                                                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_marcar_conferido(uuid, uuid, boolean)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_fechar_periodo(uuid, uuid, date, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_reabrir_periodo(uuid, uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_extrato(uuid, uuid, date, date)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_saldo_atual(uuid, uuid)                            TO authenticated;

-- 18/09/2026 — as quatro funções dos dashboards e das conferências.
--
-- ⚠️ TODAS CONFEREM `fin_pode(tenant, 'extrato_ver')` POR DENTRO, e é por isso
-- que o GRANT é seguro: ele apenas deixa o app CHAMAR; quem decide se responde
-- é a função, com a sessão de quem chamou. NENHUMA PERMISSÃO NOVA FOI CRIADA —
-- `extrato_ver` já se chama, na tela de permissões, "VER A CONFERÊNCIA DA CONTA
-- (SALDOS)", que é exatamente o que um dashboard de saldos mostra. Continuam
-- sendo 18 permissões, e ninguém precisa reconfigurar a equipe.
GRANT EXECUTE ON FUNCTION public.fin_saldos_mensais_movimento(uuid, integer)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_movimentos_mensais_identificadora(uuid, integer)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_extrato_identificadora(uuid, uuid, date, date)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_extrato_consolidado(uuid, uuid[], date, date)       TO authenticated;

-- 18/09/2026 — as sete do orçamento e do dinheiro do período.
--
-- ⚠️ TODAS CONFEREM A PERMISSÃO POR DENTRO (`orc_ver`, `orc_gravar`,
-- `orc_excluir` ou `dp_ver`), e a `fin_dinheiro_do_periodo` faz mais: ela lê o
-- MODO daquele membro e, no modo percentual, devolve os valores em NULL. O
-- filtro e o sigilo moram aqui dentro porque a tela não é lugar de decidir
-- isso — o que a tela esconde continua tendo viajado até o navegador.
GRANT EXECUTE ON FUNCTION public.fin_config_dinheiro(uuid)                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_gravar_orcamento(uuid, uuid, date, uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_excluir_orcamento(uuid, uuid)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_listar_orcamento(uuid, date)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_competencias_orcadas(uuid, date, date, uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_copiar_orcamento(uuid, date, date, boolean)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_dinheiro_do_periodo(uuid, date)                     TO authenticated;

-- 23/09/2026 — `fin_tem_acesso` é chamada DENTRO das policies, com o papel de
-- quem consulta: sem este GRANT, toda leitura direta estouraria 42501. As
-- outras três conferem a permissão por dentro (`cm_ver`, `cm_excluir`,
-- `ci_excluir`).
GRANT EXECUTE ON FUNCTION public.fin_tem_acesso(uuid)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_saldos_de_abertura(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_excluir_conta_movimento(uuid, uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_excluir_identificadora(uuid, uuid)                 TO authenticated;

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
