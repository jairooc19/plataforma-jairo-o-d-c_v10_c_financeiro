# 🧪 Ambiente local — validar o SQL antes de levá-lo ao Supabase

Até o degrau 5, todo SQL deste projeto era escrito sem nunca ter sido executado:
quem provava era o dono do projeto, colando no SQL Editor do Supabase. Isso
significa que um erro de sintaxe custava uma ida e volta inteira — e aconteceu.

Esta pasta remove essa dependência. Com o PostgreSQL instalado na máquina, o
`plataforma_01_schema.sql`, o seed e o `teste_rls.sql` rodam localmente.

> ⚠️ **Nada daqui vai para o Supabase.** Lá o schema `auth`, os papéis
> `anon`/`authenticated` e a função `auth.uid()` já existem; criá-los de novo
> daria erro. O `00_supabase_falso.sql` só serve numa instância local e
> descartável.

## 🎭 ANTES DE TUDO: `npm run ensaio` faz o que está abaixo sozinho

Desde 18/09/2026, **esta folha de instruções virou o plano B**. O comando

```bash
npm run ensaio
```

(`scripts/ensaio-geral.mjs`, na raiz) sobe a instância descartável, cria o banco,
aplica a plataforma **e todos os módulos que encontrar**, roda todas as travas e
todos os inventários, e ainda faz o passo que ninguém fazia à mão: o **ENSAIO DE
UPGRADE** — monta um segundo banco com o schema do último commit e aplica o de
agora por cima, que é o que pega SOBRECARGA de função. No fim, derruba tudo e
apaga a pasta de dados.

> ⚠️ **SEM PostgreSQL NA MÁQUINA, ELE PULA OS DOIS ÚLTIMOS PASSOS COM AVISO** —
> nunca os dá como aprovados. Se o PostgreSQL estiver em lugar fora do comum,
> aponte com `PGBIN=/caminho/para/bin npm run ensaio`.

Os passos manuais abaixo continuam valendo para quando se quer **mexer no banco**
depois de montado (rodar um SELECT, testar uma função à mão) — coisa que o ensaio,
que limpa tudo no fim, não permite.

---

## Subir uma instância descartável (não mexe no PostgreSQL que já está na máquina)

```bash
PGBIN="/c/Program Files/PostgreSQL/18/bin"
PGDATA="$TEMP/pjodc-pgtest"

"$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p 55432" -l "$PGDATA/log.txt" start
```

Porta **55432** de propósito: a 5432 pode estar ocupada pela instalação normal,
e um banco de teste nunca deve disputar porta com um banco de verdade.
`--auth=trust` só é aceitável porque a instância é local, temporária e sem dado
nenhum.

## Criar o banco e aplicar tudo

```bash
PSQL="$PGBIN/psql -h localhost -p 55432 -U postgres"

$PSQL -d postgres -c "DROP DATABASE IF EXISTS pjodc_local;" -c "CREATE DATABASE pjodc_local;"

$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/testes/ambiente-local/00_supabase_falso.sql
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd/plataforma_01_schema.sql
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd/plataforma_02_seed.sql
$PSQL -d pjodc_local                    -f supabase/testes/teste_rls.sql
```

O último comando tem de imprimir **16 linhas, todas PASSOU** — o mesmo resultado
que o banco publicado deu.

> ⚠️ **ESTA LINHA DIZIA "14 linhas" ATÉ 17/09/2026.** O `teste_rls.sql` ganhou as
> travas 15 e 16 e ninguém atualizou aqui. Número escrito à mão numa folha de
> instruções envelhece calado — e um "14" faria alguém achar que duas travas a
> mais são defeito. **Confira o total no arquivo antes de confiar na folha** —
> cada trava grava um veredito, e são esses `INSERT` que o `SELECT` final imprime:
>
> ```bash
> grep -c "INSERT INTO public.resultado_teste_rls VALUES" supabase/testes/teste_rls.sql
> ```
>
> Hoje: **16**.

## Conferir também o MÓDULO e o PORTEIRO do reset (17/09/2026)

O ambiente local também aplica o módulo e exercita o porteiro do
`plataforma_00_reset.sql` — foi assim que ele foi validado antes de existir:

```bash
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd-financeiro/financeiro_01_schema.sql
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd-financeiro/financeiro_02_seed.sql

# Com o módulo instalado, o reset da plataforma TEM de recusar (sai com código 3):
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd/plataforma_00_reset.sql

# Na ordem certa, os dois passam:
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd-financeiro/financeiro_00_reset.sql
$PSQL -d pjodc_local -v ON_ERROR_STOP=1 -f supabase/criar-bd/plataforma_00_reset.sql
```

> ⚠️ **RODE TAMBÉM SEM O `-v ON_ERROR_STOP=1`.** É o teste que importa: sem ele o
> psql imprime o erro e **segue para a instrução seguinte**. Foi esse ensaio que
> mostrou, em 17/09/2026, que o porteiro sozinho não bastava — e que o arquivo
> precisava do `BEGIN;`/`COMMIT;` que ele tem hoje.

## Derrubar e apagar

```bash
"$PGBIN/pg_ctl" -D "$PGDATA" stop
rm -rf "$PGDATA"
```

## O que este ambiente NÃO prova

- **Nada sobre o GoTrue.** Login, senha cifrada, OAuth do Google e confirmação
  de e-mail são do serviço de autenticação do Supabase, não do PostgreSQL. O
  `auth.users` daqui é uma tabela com as colunas que o projeto lê, nada mais.
- **Nada sobre o PostgREST.** A API que o app consome traduz chamadas HTTP em
  SQL; aqui as sessões são simuladas com `set local role` + `request.jwt.claims`,
  que é o mecanismo que ela usa, mas não é ela.
- **Nada sobre a exposição de schemas**, o Realtime de verdade ou as
  configurações de painel (URLs de redirecionamento, provedores).

Ou seja: ele prova **o banco** — schema, RLS, privilégios, gatilhos, funções e
travas. Continua sendo necessário aplicar no Supabase e testar o sistema
publicado, que é como o dono do projeto valida.

## A lição que este ambiente já rendeu

Na primeira execução, os testes 11 e 12 não produziram veredito e a limpeza
final quebrou com um erro de chave estrangeira. A causa não estava no projeto: a
primeira versão do `auth.uid()` falso fazia `current_setting(...)::json` **antes**
de tratar a string vazia, e o `teste_rls.sql` gravava `request.jwt.claims = ''`
para "sair da sessão". O `''::json` estoura com *"input string ended
unexpectedly"* — e o erro aparecia **dentro do gatilho de auditoria**, no meio de
um INSERT que nada tinha a ver com isso.

Duas correções saíram daí:

1. O `auth.uid()` deste arquivo passou a usar `NULLIF(..., '')` **antes** do
   cast, que é como o Supabase o escreve.
2. O `teste_rls.sql` passou a gravar `'{}'` em vez de `''` — um JSON válido sem
   `sub`, que devolve `NULL` em qualquer implementação. O teste deixou de
   depender dessa sutileza.
