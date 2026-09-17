# 📋 A ORDEM DOS ARQUIVOS SQL — Plataforma Jairo O D C v10

Esta pasta tem **10 arquivos SQL** em três subpastas — **6 que constroem** e
**4 que conferem**. Esta folha diz **qual rodar, em que ordem, e em qual
situação**. Ela existe porque a ordem certa estava espalhada por três
documentos, e para achá-la era preciso já saber onde procurar.

> Há ainda `testes/ambiente-local/`, que **não se roda no Supabase**: são os
> arquivos que sobem um PostgreSQL descartável nesta máquina. Não fazem parte de
> nenhum roteiro desta folha.

> **Como se roda:** SQL Editor do Supabase, **um arquivo por vez**, colando o
> arquivo **inteiro**. Limpe o editor (`Ctrl+A`) antes de cada um — ele executa
> todo o texto do painel, e o resto da execução anterior entra junto.

---

## Os 8 arquivos, e o que cada um é

| Arquivo | O que faz |
|---|---|
| `criar-bd/plataforma_00_reset.sql` | 🔴 **Demolidor da plataforma.** Apaga todos os usuários e todas as empresas |
| `criar-bd/plataforma_01_schema.sql` | Construtor da plataforma: 7 tabelas, 25 funções, 12 policies, 15 triggers |
| `criar-bd/plataforma_02_seed.sql` | Hidratador: cores, título e e-mails de admin (linha `id = 1`) |
| `criar-bd-financeiro/financeiro_00_reset.sql` | 🔴 **Desplugador do módulo.** Apaga os lançamentos de todas as empresas |
| `criar-bd-financeiro/financeiro_01_schema.sql` | Banco do módulo: 4 tabelas, 20 funções, 4 policies, 8 triggers |
| `criar-bd-financeiro/financeiro_02_seed.sql` | Grava o módulo no catálogo — **sem ele o módulo não existe para a plataforma** |
| `testes/teste_rls.sql` | 16 travas da plataforma. **Escreve no banco** |
| `testes/teste_financeiro.sql` | 21 travas do módulo. **Escreve no banco** |
| `testes/inventario.sql` | Confere o schema da plataforma. Só lê |
| `testes/inventario_financeiro.sql` | Confere o schema do módulo (16 linhas). Só lê |

---

## 🅰️ Banco NOVO e vazio — a primeira instalação

**Quatro arquivos, nesta ordem.** O `plataforma_00_reset.sql` **não** é preciso:
não há o que demolir, e o `01` já cria tudo do zero.

```
1) criar-bd/plataforma_01_schema.sql
2) criar-bd/plataforma_02_seed.sql
3) criar-bd-financeiro/financeiro_01_schema.sql
4) criar-bd-financeiro/financeiro_02_seed.sql
```

> ⚠️ **A ordem entre plataforma e módulo não é gosto — é dependência.** As
> tabelas `fin_*` apontam para `tenants` e `users` por chave estrangeira, e a
> função `fin_pode()` chama `modulo_contratado()`, que é da plataforma. Rodando
> o módulo num banco sem a plataforma, ele estoura **47 vezes** (medido em
> 16/09/2026) — e o SQL Editor mostra só o primeiro erro, que fala de uma tabela
> que ninguém esperava ver citada ali.

---

## 🅱️ Recomeçar do zero num banco que já tem coisa 🔴 DESTRUTIVO

**Seis arquivos.** Repare em qual reset vem primeiro — é a parte que engana.

```
1) criar-bd-financeiro/financeiro_00_reset.sql   ← O MÓDULO SAI PRIMEIRO
2) criar-bd/plataforma_00_reset.sql
3) criar-bd/plataforma_01_schema.sql
4) criar-bd/plataforma_02_seed.sql
5) criar-bd-financeiro/financeiro_01_schema.sql
6) criar-bd-financeiro/financeiro_02_seed.sql
```

> ### ⚠️ POR QUE O MÓDULO SAI PRIMEIRO — o defeito medido em 16/09/2026
>
> Rodar o `plataforma_00_reset.sql` **com o módulo ainda instalado** produz um
> estrago **permanente e silencioso**. Medido num PostgreSQL 18, três passos:
>
> | Momento | Tabelas `fin_*` | Chaves estrangeiras |
> |---|---|---|
> | Módulo instalado | 4 | **11** |
> | Depois do `plataforma_00_reset.sql` | 4 | **3** |
> | Depois de reconstruir **tudo**, módulo incluído | 4 | **3** ❌ |
>
> O reset da plataforma derruba `tenants` e `users` com `CASCADE`. As tabelas
> `fin_*` **sobrevivem** — o reset é restrito ao CORE, de propósito — mas as **8
> chaves delas para a plataforma são destruídas junto**, sem uma linha de aviso.
>
> **E reaplicar o `financeiro_01_schema.sql` não as traz de volta.** Ele usa
> `CREATE TABLE IF NOT EXISTS`: vendo a tabela de pé, pula o bloco inteiro — e
> as chaves estão *dentro* desse bloco. O módulo fica para sempre sem a amarra
> `tenant_id → tenants`, e apagar uma empresa passa a deixar lançamentos órfãos.
>
> **Rodando o `financeiro_00_reset.sql` antes, nada disso acontece:** as tabelas
> `fin_*` saem inteiras, e o `financeiro_01_schema.sql` as recria do zero, com
> as 11 chaves.
>
> **Se já aconteceu com você:** o `inventario_financeiro.sql` acusa na linha 16
> (`esperado 8, encontrado 0`) e nomeia cada tabela solta. O conserto é o
> roteiro 🅱️ inteiro, do começo.

---

## 🅲 Só atualizar o módulo — **o caso mais comum**

É o que acontece quando o módulo ganha função, coluna ou correção.

```
1) criar-bd-financeiro/financeiro_01_schema.sql
```

E o `financeiro_02_seed.sql` **só** se o nome, a descrição ou a função de
limpeza do módulo tiverem mudado.

> ⚠️ **Não passe perto de nenhum arquivo `00_reset`.** Eles apagam dados; o
> `01_schema` é idempotente e não apaga nada. Atualizar o módulo **nunca** exige
> demolir coisa alguma.

---

## 🅳 Desplugar o módulo de vez

```
1) criar-bd-financeiro/financeiro_00_reset.sql
```

Ele limpa o próprio rastro: tira `'financeiro'` de `allowed_modules` dos membros
e apaga a linha do catálogo. **A plataforma continua de pé, intacta.** Depois,
apagar as 5 pastas do módulo no repositório — o roteiro completo está no
`MODULOS.md`.

---

## Depois de rodar: conferir

Dois pares de arquivos, com propósitos diferentes. **Rode sempre os dois tipos.**

| Arquivo | Pergunta que responde | Escreve? | Resultado esperado |
|---|---|---|---|
| `testes/inventario.sql` | *"as peças da plataforma estão lá?"* | Não | todas OK |
| `testes/inventario_financeiro.sql` | *"as peças do módulo estão lá?"* | Não | **16 linhas OK** |
| `testes/teste_rls.sql` | *"as regras da plataforma funcionam?"* | **Sim** | **16/16 PASSOU** |
| `testes/teste_financeiro.sql` | *"as regras do módulo funcionam?"* | **Sim** | **21/21 PASSOU** |

**Comece pelos inventários.** Eles não escrevem nada e levam um segundo; se uma
peça estiver faltando, os testes falhariam por um motivo que a mensagem deles
não explicaria.

> ⚠️ **Os dois `teste_*.sql` ESCREVEM no banco** — criam empresas de mentira,
> lançam, conferem e apagam. Eles limpam o próprio rastro no início e no fim,
> mas **não são para rodar num banco com dado de verdade que você não possa
> perder**.
>
> ⚠️ **O `teste_rls.sql` deixa a tabela `resultado_teste_rls`** no banco, de
> propósito, para você poder reler o resultado depois. Ela não é lixo.

---

## Duas coisas que valem para todos eles

> ⚠️ **Nenhum destes arquivos usa `RAISE NOTICE`.** O SQL Editor do Supabase
> **descarta** mensagens do servidor e mostra `Success. No rows returned` — que
> parece aprovação e não é. Por isso todo arquivo de teste e de inventário
> termina devolvendo **linhas**. Se você vir "no rows returned" num deles,
> alguma coisa está errada.

> ⚠️ **`supabase/migrations/` está vazia, e deve continuar assim por enquanto.**
> Enquanto não houver dado real, o ciclo deste projeto é *demolir e reconstruir*
> — é o que a pasta `criar-bd/` significa. No dia em que existir dado que não se
> pode perder, a evolução passa a ser por migration, e aí o roteiro 🅱️ deixa de
> ser aceitável. Leia o `README.md` daquela pasta **antes do primeiro dado
> real**.
