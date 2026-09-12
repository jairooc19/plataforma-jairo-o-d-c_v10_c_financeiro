-- ===========================================================================
-- 🧪 PROVA DA RN-29: a chave estrangeira COMPOSTA impede misturar empresas?
-- Local: supabase/testes/ambiente-local/prova-chave-composta.sql
-- ===========================================================================
--
-- POR QUE EXISTE: no módulo financeiro, `tenant_id` se repete em
-- `fin_lancamentos` (a empresa poderia ser descoberta pela conta). Isso abre a
-- possibilidade teórica de um lançamento da matriz apontar para uma conta da
-- filial. A proposta foi trocar as chaves estrangeiras simples por COMPOSTAS,
-- incluindo o `tenant_id` — para que o BANCO recuse a mistura, e não só o
-- código. Antes de escrever isso na especificação como promessa, medimos.
--
-- COMO RODAR: num banco local com `00_supabase_falso.sql` +
-- `plataforma_01_schema.sql` + as empresas de teste da prova anterior.
--
-- ---------------------------------------------------------------------------
-- RESULTADO MEDIDO EM 12/09/2026 (PostgreSQL 18) — 4 de 4 PASSOU
-- ---------------------------------------------------------------------------
--  1. Lançamento da ALFA usando conta da ALFA ....... ACEITO (correto)
--  2. Lançamento da ALFA usando conta da BETA ....... RECUSADO, erro 23503
--  3. UPDATE mudando só o `tenant_id` do lançamento,
--     deixando a conta da outra empresa ............. RECUSADO, erro 23503
--     → a trava vale também na EDIÇÃO, não só na criação. Este caso não
--       estava previsto e é o mais valioso: protege contra uma correção
--       futura que altere a empresa de um registro já gravado
--  4. Apagar conta que tem lançamento ............... RECUSADO, erro 23001
--     → a RN-04 continua valendo com a chave composta (o ON DELETE RESTRICT
--       não se perde ao trocar a chave simples pela composta)
-- ===========================================================================

-- Prova da RN-29: a chave estrangeira composta impede misturar empresas?

DROP TABLE IF EXISTS public.fk_lanc;
DROP TABLE IF EXISTS public.fk_contas;

CREATE TABLE public.fk_contas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome      text NOT NULL,
  UNIQUE (tenant_id, id)          -- o alvo da chave composta
);

CREATE TABLE public.fk_lanc (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conta_movimento_id uuid NOT NULL,
  valor_centavos     bigint NOT NULL CHECK (valor_centavos > 0),
  FOREIGN KEY (tenant_id, conta_movimento_id)
      REFERENCES public.fk_contas (tenant_id, id) ON DELETE RESTRICT
);

-- uma conta em cada empresa
INSERT INTO public.fk_contas (id, tenant_id, nome) VALUES
 ('aaaa1111-0000-0000-0000-00000000000a','11111111-aaaa-0000-0000-000000000001','BANCO DA ALFA'),
 ('bbbb2222-0000-0000-0000-00000000000b','22222222-bbbb-0000-0000-000000000002','BANCO DA BETA');

DROP TABLE IF EXISTS public.prova_fk_resultado;
CREATE TABLE public.prova_fk_resultado (n int PRIMARY KEY, caso text, resultado text, veredito text);

-- CASO 1: lançamento COERENTE (empresa ALFA, conta da ALFA) → deve PASSAR
DO $fk$
DECLARE erro text := 'nenhum';
BEGIN
  BEGIN
    INSERT INTO public.fk_lanc (tenant_id, conta_movimento_id, valor_centavos)
    VALUES ('11111111-aaaa-0000-0000-000000000001','aaaa1111-0000-0000-0000-00000000000a', 10000);
  EXCEPTION WHEN OTHERS THEN erro := SQLSTATE || ' ' || SQLERRM;
  END;
  INSERT INTO public.prova_fk_resultado VALUES (
    1, 'Lancamento da ALFA usando conta da ALFA (deve ACEITAR)',
    format('erro=%s', erro),
    CASE WHEN erro = 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END);
END;
$fk$;

-- CASO 2: lançamento MISTURADO (empresa ALFA, conta da BETA) → deve SER RECUSADO
DO $fk$
DECLARE erro text := 'nenhum';
BEGIN
  BEGIN
    INSERT INTO public.fk_lanc (tenant_id, conta_movimento_id, valor_centavos)
    VALUES ('11111111-aaaa-0000-0000-000000000001','bbbb2222-0000-0000-0000-00000000000b', 99900);
  EXCEPTION WHEN OTHERS THEN erro := SQLSTATE;
  END;
  INSERT INTO public.prova_fk_resultado VALUES (
    2, 'Lancamento da ALFA usando conta da BETA (deve RECUSAR)',
    format('erro=%s', erro),
    CASE WHEN erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END);
END;
$fk$;

-- CASO 3: e se alguém tentar MUDAR o tenant do lançamento depois? → deve RECUSAR
DO $fk$
DECLARE erro text := 'nenhum';
BEGIN
  BEGIN
    UPDATE public.fk_lanc
       SET tenant_id = '22222222-bbbb-0000-0000-000000000002'
     WHERE conta_movimento_id = 'aaaa1111-0000-0000-0000-00000000000a';
  EXCEPTION WHEN OTHERS THEN erro := SQLSTATE;
  END;
  INSERT INTO public.prova_fk_resultado VALUES (
    3, 'Mudar o tenant do lancamento, deixando a conta da outra empresa (deve RECUSAR)',
    format('erro=%s', erro),
    CASE WHEN erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END);
END;
$fk$;

-- CASO 4: apagar a conta que tem lançamento → deve RECUSAR (RN-04 continua valendo)
DO $fk$
DECLARE erro text := 'nenhum';
BEGIN
  BEGIN
    DELETE FROM public.fk_contas WHERE id = 'aaaa1111-0000-0000-0000-00000000000a';
  EXCEPTION WHEN OTHERS THEN erro := SQLSTATE;
  END;
  INSERT INTO public.prova_fk_resultado VALUES (
    4, 'Apagar conta que tem lancamento (deve RECUSAR - RN-04)',
    format('erro=%s', erro),
    CASE WHEN erro <> 'nenhum' THEN 'PASSOU' ELSE 'FALHOU' END);
END;
$fk$;

SELECT n AS "#", caso AS "caso", resultado AS "o que o banco disse", veredito
  FROM public.prova_fk_resultado ORDER BY n;
