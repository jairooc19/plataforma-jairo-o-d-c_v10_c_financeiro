-- ===========================================================================
-- 🌱 MÓDULO CONTROLE FINANCEIRO — SEED
-- Local: supabase/criar-bd-financeiro/financeiro_02_seed.sql
-- ===========================================================================
--
-- O QUE FAZ: grava o módulo no catálogo da plataforma (`platform_modules`).
--
-- ⚠️ É ESTE ARQUIVO QUE FAZ O MÓDULO EXISTIR PARA A PLATAFORMA. Antes dele, o
-- Painel de Engenharia não tem o que contratar, e `allowed_modules` recusaria
-- o valor 'financeiro' (o gatilho `validar_modulos_membro` confere o catálogo).
--
-- ⚠️ E É ELE, NÃO A APLICAÇÃO, QUEM CADASTRA MÓDULO. Se uma tela pudesse fazer
-- isso, existiria um módulo no catálogo sem tabelas, sem telas e sem manifesto
-- — um nome apontando para o vazio, contratável e liberável, que só falharia na
-- hora de abrir.
--
-- Idempotente: rodar de novo apenas atualiza o nome, a descrição e a função de
-- limpeza.
-- ===========================================================================

INSERT INTO public.platform_modules (id, nome, descricao, is_active, funcao_limpeza)
VALUES (
  'financeiro',
  'Controle Financeiro',
  'Contas, lançamentos, extrato com saldo e conferência.',
  true,
  -- 🧹 O nome que `admin_apagar_dados_do_modulo` vai executar quando o
  -- Desenvolvedor clicar em "APAGAR TODOS OS DADOS DESTA EMPRESA".
  'fin_apagar_dados_da_empresa'
)
ON CONFLICT (id) DO UPDATE SET
  nome           = EXCLUDED.nome,
  descricao      = EXCLUDED.descricao,
  is_active      = EXCLUDED.is_active,
  funcao_limpeza = EXCLUDED.funcao_limpeza,
  updated_at     = now();


-- ===========================================================================
-- CONFERÊNCIA
-- ===========================================================================
-- Deve devolver uma linha, com `funcao_limpeza` preenchida:
--
--   SELECT id, nome, is_active, funcao_limpeza FROM public.platform_modules;
--
-- Depois disto, o módulo aparece no Painel de Engenharia › Módulos para ser
-- contratado por empresa. Sem contratar, ninguém daquela empresa o vê.
-- ===========================================================================
