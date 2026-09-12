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

O último comando tem de imprimir **14 linhas, todas PASSOU** — o mesmo resultado
que o banco publicado deu em 12/09/2026.

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
