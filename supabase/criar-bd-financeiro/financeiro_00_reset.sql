-- ===========================================================================
-- 🧹 MÓDULO CONTROLE FINANCEIRO — RESET (desplugar a peça)
-- Local: supabase/criar-bd-financeiro/financeiro_00_reset.sql
-- ===========================================================================
--
-- O QUE FAZ: remove do banco TUDO o que é do módulo — e nada mais.
--
-- ⚠️ ISTO APAGA TODOS OS LANÇAMENTOS DE TODAS AS EMPRESAS. Não existe desfazer.
-- Para apagar os dados de UMA empresa apenas, use o botão do Painel de
-- Engenharia (que chama `fin_apagar_dados_da_empresa`), não este arquivo.
--
-- ⚠️ O MÓDULO LIMPA O PRÓPRIO RASTRO NA PLATAFORMA. Além das tabelas e funções
-- `fin_*`, este script tira 'financeiro' de `allowed_modules` dos membros e
-- apaga a linha do catálogo — senão sobraria um módulo listado que não existe
-- mais, e o menu tentaria desenhar um cartão para o vazio. Limpeza é
-- responsabilidade de quem sujou.
--
-- ⚠️ ELE NÃO TOCA EM NADA DA PLATAFORMA além disso: nenhuma tabela, função,
-- policy ou coluna do CORE é alterada (regra R5 do `MODULOS.md`).
--
-- DEPOIS DE RODAR ESTE ARQUIVO, para desplugar por completo:
--   1. apagar as 5 pastas do módulo
--   2. remover as 3 linhas de solda (registro.ts e index.ts do Core)
--   3. `npm run modulos:verificar` → deve passar sem violação
-- ===========================================================================


-- ===========================================================================
-- 1. O RASTRO DO MÓDULO NA PLATAFORMA
-- ===========================================================================

-- 1.1 Tira o módulo da lista de cada membro (o contrato por empresa cai junto
--     com a linha do catálogo, por ON DELETE CASCADE).
UPDATE public.tenant_members
   SET allowed_modules = array_remove(allowed_modules, 'financeiro')
 WHERE 'financeiro' = ANY(allowed_modules);

-- 1.2 Tira as permissões do módulo de dentro de `module_configs`.
UPDATE public.tenant_members
   SET module_configs = module_configs - 'financeiro'
 WHERE module_configs ? 'financeiro';

-- 1.3 Apaga a linha do catálogo. O ON DELETE CASCADE de `tenant_modules`
--     remove, junto, todos os contratos de todas as empresas.
DELETE FROM public.platform_modules WHERE id = 'financeiro';


-- ===========================================================================
-- 2. AS TABELAS DO MÓDULO
-- Ordem reversa de dependência: filhas primeiro.
-- ===========================================================================
DROP TABLE IF EXISTS public.fin_fechamentos            CASCADE;
DROP TABLE IF EXISTS public.fin_lancamentos            CASCADE;
DROP TABLE IF EXISTS public.fin_contas_movimento       CASCADE;
DROP TABLE IF EXISTS public.fin_contas_identificadoras CASCADE;


-- ===========================================================================
-- 3. AS FUNÇÕES DO MÓDULO
-- Por NOME, uma a uma — nunca por laço sobre `pg_proc`, que levaria junto as
-- funções das extensões e a rede de segurança do ambiente (`rls_auto_enable`).
-- ===========================================================================
DROP FUNCTION IF EXISTS public.fin_apagar_dados_da_empresa(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_saldo_atual(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_extrato(uuid, uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_reabrir_periodo(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_fechar_periodo(uuid, uuid, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_marcar_conferido(uuid, uuid, boolean) CASCADE;
-- ⚠️ DUAS ASSINATURAS DE `fin_transferir`, DE PROPÓSITO. Em 14/09/2026 ela
-- ganhou as duas ordens; um banco que ainda esteja na versão antiga tem a de 6
-- parâmetros, e desplugar não pode deixar função órfã no `public`.
DROP FUNCTION IF EXISTS public.fin_transferir(uuid, uuid, uuid, date, bigint, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.fin_transferir(uuid, uuid, uuid, date, bigint, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_abrir_espaco_na_ordem(uuid, date, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_excluir_lancamento(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_gravar_lancamento(uuid, uuid, uuid, uuid, date, integer, text, text, text, bigint, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_gravar_identificadora(uuid, uuid, text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.fin_gravar_conta_movimento(uuid, uuid, text, text, bigint, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.fin_buscar_identificadoras(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_buscar_contas_movimento(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_proxima_ordem(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_periodo_fechado(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_pode(uuid, text) CASCADE;

-- ⚠️ `fin_normalizar` por último: as colunas geradas das tabelas dependiam
-- dela, e por isso ela só pode cair depois que as tabelas caírem.
DROP FUNCTION IF EXISTS public.fin_normalizar(text) CASCADE;


-- ===========================================================================
-- CONFERÊNCIA — as três devem devolver ZERO
-- ===========================================================================
--   SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'fin_%';
--
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname LIKE 'fin_%';
--
--   SELECT count(*) FROM public.platform_modules WHERE id = 'financeiro';
-- ===========================================================================
