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
-- 0. 🚧 A TRAVA DE INTENÇÃO — 17/09/2026
-- ===========================================================================
--
-- 📖 POR QUE ISTO EXISTE
-- ---------------------------------------------------------------------------
-- Em 17/09/2026 o `plataforma_00_reset.sql` ganhou um porteiro que o impede de
-- rodar na hora errada. Olhando para o outro lado da simetria, este arquivo —
-- que apaga **os lançamentos de TODAS as empresas** — não tinha trava nenhuma:
-- era colar e executar.
--
-- ⚠️ E A DIFERENÇA ENTRE OS DOIS PORTEIROS É IMPORTANTE. Lá, o arquivo tinha
-- como PERGUNTAR AO BANCO se era seguro seguir (havia módulo instalado?). Aqui
-- não há o que perguntar: apagar tudo é exatamente o que este arquivo faz de
-- certo. A única pergunta é se a PESSOA quis isso — e essa o banco não sabe
-- responder.
--
-- Por isso aqui a trava é de INTENÇÃO, não de estado: ela exige um gesto
-- deliberado que não acontece por engano ao colar o arquivo errado no painel.
--
-- 🔓 COMO DESTRAVAR
-- ---------------------------------------------------------------------------
-- Apague a palavra `NAO` da linha marcada abaixo, deixando só `CONFIRMO`.
-- São 3 caracteres — o suficiente para exigir que alguém leia, e pouco o
-- bastante para não atrapalhar quem realmente quer desplugar o módulo.
--
-- ⚠️ NUNCA deixe o arquivo commitado com a linha já destravada. O valor dela
-- está inteiro em ela vir travada por padrão: um arquivo que chega destravado
-- ao próximo leitor é um arquivo sem trava.
--
-- ===========================================================================
-- ⚠️ O `BEGIN;` VEM ANTES DA TRAVA, E NÃO DEPOIS — ISSO FOI APRENDIDO ERRANDO
-- ===========================================================================
-- Na primeira versão desta seção (17/09/2026) o `BEGIN;` estava DEPOIS do bloco
-- que recusa. O ensaio mostrou o buraco na hora: com `psql -f` **sem**
-- `ON_ERROR_STOP`, a trava recusava, o psql imprimia o erro e **seguia para a
-- instrução seguinte** — que era justamente o `BEGIN;`. A transação abria
-- DEPOIS do erro, e tudo era apagado com a recusa já rolada para fora da tela.
-- Medido: as 4 tabelas do módulo caíram com a trava fechada.
--
-- Com o `BEGIN;` aqui em cima, a exceção da trava aborta uma transação JÁ
-- ABERTA, e toda instrução seguinte é recusada pelo PostgreSQL com "current
-- transaction is aborted". Nada é apagado, em cliente nenhum.
BEGIN;

DO $trava$
DECLARE
  -- 👇 TROQUE 'NAO CONFIRMO' POR 'CONFIRMO' PARA LIBERAR ESTE RESET 👇
  v_confirmacao text := 'NAO CONFIRMO';
  v_lancamentos bigint := 0;
  v_empresas    bigint := 0;
BEGIN
  IF v_confirmacao <> 'CONFIRMO' THEN
    -- Mostra o TAMANHO do estrago antes de recusar. Um número concreto
    -- ("4.312 lançamentos de 3 empresas") faz pensar; "isto é destrutivo",
    -- não.
    IF to_regclass('public.fin_lancamentos') IS NOT NULL THEN
      EXECUTE 'SELECT count(*), count(DISTINCT tenant_id) FROM public.fin_lancamentos'
         INTO v_lancamentos, v_empresas;
    END IF;

    RAISE EXCEPTION
      'RESET DO MODULO RECUSADO: a trava de intencao esta fechada. Este arquivo apagaria % lancamento(s) de % empresa(s), de TODAS as empresas, sem desfazer.',
      v_lancamentos, v_empresas
      USING
        ERRCODE = 'P0001',
        DETAIL  = 'Para apagar os dados de UMA empresa apenas, use o botao do Painel de Engenharia (fin_apagar_dados_da_empresa) - nao este arquivo.',
        HINT    = 'Se e isto mesmo que voce quer: na secao 0 deste arquivo, troque a linha v_confirmacao := ''NAO CONFIRMO'' por ''CONFIRMO'' e rode de novo.';
  END IF;

  RAISE NOTICE 'TRAVA LIBERADA: seguindo com o reset do modulo.';
END
$trava$;


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
-- ⚠️ O ORÇAMENTO CAI PRIMEIRO: ele aponta para `fin_contas_identificadoras`.
DROP TABLE IF EXISTS public.fin_orcamentos             CASCADE;
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

-- 18/09/2026 — os dois dashboards e as duas conferências novas.
--
-- ⚠️ ELAS ENTRARAM AQUI NO MESMO COMMIT EM QUE NASCERAM, e isso é regra desde
-- 17/09/2026: as duas funções de importação ficaram de fora desta lista por
-- quatro dias, e o reset dizia "pronto" deixando duas funções `fin_*` vivas no
-- `public`. Quem acrescenta função ao módulo acrescenta a baixa dela junto.
-- 18/09/2026 — o orçamento e o dinheiro do período.
DROP FUNCTION IF EXISTS public.fin_dinheiro_do_periodo(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_copiar_orcamento(uuid, date, date, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.fin_competencias_orcadas(uuid, date, date, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_listar_orcamento(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_excluir_orcamento(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_gravar_orcamento(uuid, uuid, date, uuid, bigint, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_config_dinheiro(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fin_extrato_consolidado(uuid, uuid[], date, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_extrato_identificadora(uuid, uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS public.fin_movimentos_mensais_identificadora(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.fin_saldos_mensais_movimento(uuid, integer) CASCADE;
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

-- ⚠️ AS DUAS DE IMPORTAÇÃO FALTAVAM AQUI DESDE 13/09/2026 — defeito encontrado
-- em 17/09 ao ensaiar o reset num banco de verdade, e não lendo o arquivo.
-- Elas nasceram no degrau da importação de CSV e ninguém as acrescentou à lista
-- de baixa. O reset dizia "pronto" deixando DUAS funções `fin_*` vivas no
-- `public` — um módulo "desplugado" que ainda tinha código instalado.
--
-- É a prova de que lista de nomes escrita à mão precisa de uma CONFERÊNCIA
-- automática: a do fim deste arquivo (contar funções `fin_*` e esperar zero) é
-- o que transforma esse esquecimento em erro visível.
DROP FUNCTION IF EXISTS public.fin_importar_contas_movimento(uuid, text, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.fin_importar_identificadoras(uuid, text, text[])  CASCADE;
DROP FUNCTION IF EXISTS public.fin_gravar_conta_movimento(uuid, uuid, text, text, bigint, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.fin_buscar_identificadoras(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_buscar_contas_movimento(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.fin_proxima_ordem(uuid, date) CASCADE;

-- ⚠️ AS DUAS ASSINATURAS DE `fin_periodo_fechado`, E ISSO NÃO É REDUNDÂNCIA.
-- Em 17/09/2026 ela ganhou o `p_tenant_id` e passou de `(uuid, date)` para
-- `(uuid, uuid, date)`. Um banco pode ter QUALQUER uma das duas, dependendo de
-- quando o schema foi aplicado pela última vez. `DROP FUNCTION` identifica a
-- função pelos PARÂMETROS: derrubar só uma deixaria a outra viva, e o reset
-- diria "pronto" com meia função de pé — que é justamente o que a conferência
-- do fim deste arquivo acusaria, sem dizer por quê.
DROP FUNCTION IF EXISTS public.fin_periodo_fechado(uuid, date)       CASCADE;
DROP FUNCTION IF EXISTS public.fin_periodo_fechado(uuid, uuid, date) CASCADE;

-- 17/09/2026 — exclusão em lote, lixeira e histórico de fechamentos.
--
-- ⚠️ AS DUAS ASSINATURAS DA EXCLUSÃO EM LOTE, PELO MESMO MOTIVO DA
-- `fin_periodo_fechado` LOGO ACIMA: na 2ª rodada de 17/09 ela ganhou o
-- parâmetro `p_ids`, e um banco pode ter qualquer uma das duas dependendo de
-- quando o schema foi aplicado. Derrubar só uma deixaria viva justamente a
-- versão que apaga o PERÍODO INTEIRO sem olhar o que a tela marcou.
DROP FUNCTION IF EXISTS public.fin_excluir_lancamentos_por_periodo(uuid, uuid, date, date, boolean)         CASCADE;
DROP FUNCTION IF EXISTS public.fin_excluir_lancamentos_por_periodo(uuid, uuid, date, date, boolean, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.fin_listar_exclusoes(uuid, timestamptz, integer) CASCADE;
DROP FUNCTION IF EXISTS public.fin_restaurar_lancamento(uuid, bigint)           CASCADE;
DROP FUNCTION IF EXISTS public.fin_limpar_lixeira(uuid, bigint[], boolean)      CASCADE;
DROP FUNCTION IF EXISTS public.fin_historico_fechamentos(uuid, integer)         CASCADE;

DROP FUNCTION IF EXISTS public.fin_pode(uuid, text) CASCADE;

-- ⚠️ `fin_normalizar` por último: as colunas geradas das tabelas dependiam
-- dela, e por isso ela só pode cair depois que as tabelas caírem.
DROP FUNCTION IF EXISTS public.fin_normalizar(text) CASCADE;


-- ===========================================================================
-- 4. 🧽 A TRILHA DE AUDITORIA DO MÓDULO
-- ===========================================================================
--
-- ⚠️ ISTO ENTROU EM 17/09/2026, JUNTO COM A LIXEIRA. A partir do momento em que
-- `audit_log` passou a ser LIDA pelo módulo (a lixeira restaura a partir dela),
-- deixar as linhas `fin_*` para trás passou a ter consequência: um módulo
-- desplugado e replugado mostraria, na lixeira, exclusões de uma encarnação
-- anterior — apontando para contas que não existem mais.
--
-- ⚠️ E ELE APAGA **SÓ AS LINHAS DO MÓDULO**, nunca a tabela. A `audit_log` é da
-- PLATAFORMA: dar `DROP` nela, ou limpá-la inteira, seria um módulo destruindo
-- estrutura alheia — exatamente o que a regra R5 do `MODULOS.md` proíbe. O
-- filtro `tabela LIKE 'fin\_%'` é o que mantém a limpeza dentro do próprio
-- território.
DELETE FROM public.audit_log WHERE tabela LIKE 'fin\_%';


-- ===========================================================================
-- 5. ✅ FECHAMENTO DA TRANSAÇÃO ABERTA NA SEÇÃO 0
-- ===========================================================================
-- ⚠️ ESTE `COMMIT;` É O PAR DO `BEGIN;` DA SEÇÃO 0 — NÃO O REMOVA.
COMMIT;


-- ===========================================================================
-- CONFERÊNCIA — as quatro devem devolver ZERO
-- ===========================================================================
--   SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'fin_%';
--
--   SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname LIKE 'fin_%';
--
--   SELECT count(*) FROM public.platform_modules WHERE id = 'financeiro';
--
--   SELECT count(*) FROM public.audit_log WHERE tabela LIKE 'fin\_%';
-- ===========================================================================
