# 🧩 MAPA DE MÓDULOS — Plataforma Jairo O D C v10

> **O que é este arquivo.** A Plataforma Jairo O D C é o **Sol**; cada módulo é
> uma **peça de LEGO** que se pluga e se despluga. Este documento é o mapa dessa
> montagem: diz o que é plataforma, o que é módulo, onde estão as soldas, e como
> conectar e desconectar sem medo.
>
> **Regra R10:** este arquivo é atualizado **no mesmo commit** que conecta ou
> desconecta um módulo. Mapa desatualizado é pior que mapa nenhum — ele dá
> confiança falsa.
>
> 📖 O estudo que originou este desenho: `_estudos/degrau-04-arquitetura-modular.html`.

---

## 1. O QUE É PLATAFORMA (o Sol)

**Tudo o que NÃO está listado no bloco 2.**

A definição é por exclusão de propósito: listar cada pasta da plataforma faria o
mapa envelhecer na primeira pasta nova. A plataforma se define por exclusão; os
módulos, por enumeração — que é a lista curta e que muda raramente.

> ⚠️ **ESTA LISTA DIZIA "`apps/mobile-app/` — o aplicativo inteiro" ATÉ 19/09/2026,
> e deixou de ser verdade no degrau 08**, quando o primeiro módulo ganhou telas no
> telemóvel. O aplicativo agora se divide como o site: as pastas acima são da
> plataforma, e **`apps/mobile-app/app/<modulo>/`** (rotas) mais
> **`apps/mobile-app/src/modules/<modulo>/`** (código) são do módulo.

Em especial, pertencem sempre à plataforma:

```
apps/admin-web/src/app/auth/                 entrada, logout, completar cadastro
apps/admin-web/src/app/dashboard/page.tsx    o orquestrador do painel
apps/admin-web/src/app/dashboard/settings/   white-label
apps/admin-web/src/app/dashboard/tenants/    triagem e empresas
apps/admin-web/src/app/dashboard/modulos/    contratação de módulos por empresa
apps/admin-web/src/components/{auth,dashboard,platform,providers}/
apps/mobile-app/app/{(auth),(tabs),auth}/    guarita, abas e retorno do OAuth
apps/mobile-app/app/_layout.tsx              o porteiro (boot, sessão, biometria)
apps/mobile-app/src/{components,constants,context,hooks,lib,screens,services}/
packages/core/src/{lib,constants,analytics}/
packages/core/src/services/platform/         auth, perfil, empresas, ajustes, módulos
packages/core/src/modules/registro.ts        ⚡ O SOQUETE (ponto de solda 1)
packages/core/src/modules/tipos.ts           o formato do manifesto
supabase/criar-bd/plataforma_*.sql           banco do CORE
supabase/testes/teste_rls.sql                as travas do CORE
scripts/verificar-modulos.mjs                o verificador de LEGO
CLAUDE.md · MODULOS.md · README.md
```

---

## 2. MÓDULOS CONECTADOS HOJE

| Módulo | id | Prefixo no banco | Conectado em | Commit |
|---|---|---|---|---|
| **Controle Financeiro** | `financeiro` | `fin_` | 12/09/2026 | degrau 7 (2/3) — as soldas S1 e S2 |

**As 7 pastas do Controle Financeiro** (apagar estas sete = desplugar a peça):

```
apps/admin-web/src/app/dashboard/financeiro/     as telas do SITE (16 rotas)
apps/admin-web/src/components/financeiro/        os componentes do SITE
apps/mobile-app/app/financeiro/                  🆕 as rotas do APLICATIVO (4 telas + o _layout)
apps/mobile-app/src/modules/financeiro/          🆕 o código do APLICATIVO
packages/core/src/modules/financeiro/            regras de negócio + manifesto
supabase/criar-bd-financeiro/                    o banco (5 tabelas, 40 funções)
supabase/testes/teste_financeiro.sql             as travas do módulo (55 testes)
supabase/testes/inventario_financeiro.sql        o inventário do módulo (17 linhas, só lê)
```

> 🆕 **AS DUAS PASTAS DO APLICATIVO NASCERAM EM 19/09/2026 (degrau 08)**, quando o
> DINHEIRO DO PERÍODO chegou ao telemóvel. `apps/mobile-app/src/modules/<id>/` já
> estava prevista no `scripts/verificar-modulos.mjs` desde o degrau 5 e nunca havia
> sido usada; `apps/mobile-app/app/<id>/` foi acrescentada ao território no mesmo
> degrau, pelo mesmo motivo que o site tem a sua: no Expo Router, **rota é arquivo**.

> ⚠️ **ESTES SEIS NÚMEROS JÁ ESTIVERAM ERRADOS TODOS AO MESMO TEMPO** (media-se
> 20 funções, 21 testes, 16 linhas e 9 rotas em 18/09/2026, quando eram 29, 40,
> 17 e 13). Número escrito à mão envelhece em silêncio e não quebra nada — só
> ensina o errado. **Conte antes de citar**, com estes comandos:
>
> ```bash
> find apps/admin-web/src/app/dashboard/financeiro -name page.tsx | wc -l
> grep -c "^CREATE OR REPLACE FUNCTION" supabase/criar-bd-financeiro/financeiro_01_schema.sql
> grep -c "INSERT INTO public.resultado_teste_financeiro VALUES" supabase/testes/teste_financeiro.sql
```

E a documentação dele, que também é do módulo:
`_estudos/modulo-financeiro-especificacao.html` e `_estudos/degrau-06-projeto-modulo-financeiro.html`.

> ⚠️ **ESSES DOIS ARQUIVOS NÃO ESTÃO MAIS NA PASTA** (medido em 23/09/2026): os
> estudos saíram do Git nos commits `c1bdc4a` e `e66b0dd`, de 19/09/2026. Eles
> continuam no histórico e voltam sem restaurar nada no disco — por exemplo
> `git show c1bdc4a^:_estudos/modulo-financeiro-especificacao.html > espec.html`.
> É ali que estão as regras RN-01 a RN-31 que o schema cita.

> **A plataforma continua funcionando inteira sem ele** — é a regra R9, e
> continua sendo o estado de referência do verificador. A prova foi medida no
> ambiente local antes desta conexão: depois do `financeiro_00_reset.sql`, o
> banco ficou com **0 tabelas `fin_`, 0 funções `fin_`, 0 linhas no catálogo**, e
> o `teste_rls.sql` da plataforma seguiu **16/16** (eram 14 travas quando isto foi
> medido pela primeira vez; as travas 15 e 16 entraram em 17/09/2026).

> 🎭 **DESDE 18/09/2026 NADA DISSO PRECISA SER RODADO À MÃO.** O `npm run ensaio`
> (`scripts/ensaio-geral.mjs`) faz as seis provas em sequência: testes do Core,
> verificador de LEGO, lint, build, banco descartável com todas as travas, e o
> **ensaio de upgrade** (o schema do último commit com o de agora aplicado por
> cima, que é o que pega a SOBRECARGA de função). Ele descobre os módulos
> plugados varrendo as pastas `supabase/criar-bd-<nome>` — não há nome de módulo
> escrito dentro dele, e por isso ele continua sendo arquivo de plataforma.

---

## 3. OS PONTOS DE SOLDA (lista fechada)

São os **únicos** lugares do código da plataforma onde o nome de um módulo pode
aparecer. Qualquer outro arquivo que cite um módulo é uma violação — e o
verificador aponta o arquivo e a linha.

| # | Onde | O que é | Linhas |
|---|---|---|---|
| S1 | `packages/core/src/modules/registro.ts` | `import` do manifesto + entrada em `MODULOS_INSTALADOS` | 2 |
| S2 | `packages/core/src/index.ts` (seção 3) | `export * from './modules/<nome>';` | 1 |
| S3 | banco | nenhuma linha em arquivo da plataforma: o **seed do módulo** grava a linha dele em `platform_modules`, e o **reset do módulo** a apaga | 0 |

> **Comentário não é solda.** Um TSDoc que menciona um módulo (como o
> `lib/dinheiro.ts`, escrito para o C FINANCEIRO) não quebra nada quando o
> módulo sai. O verificador ignora linhas de comentário de propósito.

---

## 4. AS 10 REGRAS DO LEGO

| # | Regra | O que acontece se for quebrada |
|---|---|---|
| R1 | A plataforma nunca importa código de módulo, exceto nos pontos de solda | O site para de compilar quando o módulo é apagado |
| R2 | O módulo pode importar a plataforma à vontade | (é a direção certa da dependência) |
| R3 | Um módulo nunca importa outro módulo | Duas peças viram uma; desplugar uma quebra a outra |
| R4 | Toda pasta e todo arquivo de módulo carregam o nome do módulo | Some a leitura instantânea da árvore |
| R5 | O módulo nunca altera tabela, função ou policy da plataforma | Apagar o módulo deixa a plataforma quebrada |
| R6 | Todo objeto de banco do módulo leva o prefixo do módulo (`fin_`) | O reset do módulo não consegue mirar só no que é dele |
| R7 | O módulo se apresenta por um manifesto; a plataforma só conhece o formato | O menu passa a citar módulos pelo nome, dentro da plataforma |
| R8 | No máximo 3 pontos de solda, todos listados aqui | Desconectar vira caçada |
| R9 | Nenhum módulo é pré-requisito da plataforma | A plataforma deixa de funcionar sozinha |
| R10 | Este mapa é atualizado no mesmo commit da conexão/desconexão | Confiança falsa |

### O teste mental de um minuto

Antes de criar qualquer arquivo: **“se eu apagasse a pasta do módulo agora, este
arquivo continuaria fazendo sentido?”**

- **Sim** → é plataforma.
- **Não** → é módulo; vai para uma pasta com o nome dele.
- **“Depende”** → é plataforma disfarçada: torne-o genérico, sem nome de módulo
  e sem regra de negócio específica.

---

## 5. ANATOMIA DE UM MÓDULO — as 5 pastas

Para um módulo de id `<nome>` (minúsculas, sem acento, sem espaço):

```
apps/admin-web/src/app/dashboard/<nome>/     1. as telas (a pasta É a rota)
apps/admin-web/src/components/<nome>/        2. os componentes
packages/core/src/modules/<nome>/            3. regras de negócio + manifesto.ts
supabase/criar-bd-<nome>/                    4. o banco  (<nome>_00_reset /
                                                _01_schema / _02_seed)
supabase/testes/teste_<nome>.sql             5. as travas do módulo
supabase/testes/inventario_<nome>.sql        (opcional) o inventário: "as peças
                                             estão todas lá?" — só lê o catálogo
_estudos/<nome>/                             (opcional) a documentação dele
```

### O manifesto

```ts
// packages/core/src/modules/<nome>/manifesto.ts
import type { ManifestoDeModulo } from '../tipos';

export const MANIFESTO_<NOME>: ManifestoDeModulo = {
  id: '<nome>',                       // o mesmo texto em allowed_modules e no catálogo
  nome: 'Nome Legível',
  descricao: 'Uma linha do que o módulo faz.',
  rotaWeb: '/dashboard/<nome>',
  rotaConfiguracao: '/dashboard/<nome>/dependentes',   // opcional — ver abaixo
  prefixoBanco: '<pre>_',
  versao: '1.0.0',
  exigePlataforma: 'v10',
};
```

> 🔑 **`rotaConfiguracao` — as DUAS decisões sobre um integrante** (13/09/2026).
> São perguntas diferentes, e moram em lugares diferentes de propósito:
>
> | Pergunta | De quem é | Onde |
> |---|---|---|
> | "ele pode **ABRIR** este módulo?" | da **plataforma** | `tenant_members.allowed_modules`, no Painel de Controle de Tripulação |
> | "o que ele pode **FAZER** dentro?" | do **módulo** | as permissões do negócio dele, numa tela do próprio módulo |
>
> A lista detalhada **nunca** sobe para a plataforma: ela conheceria o negócio de
> uma peça e o verificador reprovaria — com razão. O manifesto declara só o
> ENDEREÇO da porta, e a plataforma desenha um link sem saber o que há do outro
> lado. Módulo sem permissões internas simplesmente omite o campo.

### As regras de banco do módulo

- Toda tabela com o prefixo do módulo, **RLS ligada**, policy começando por `tenant_id`.
- Chave estrangeira aponta **do módulo para a plataforma** (`<pre>_contas.tenant_id → tenants.id`), nunca o contrário.
- Dinheiro em `numeric(14,2)` ou `bigint` de centavos — nunca ponto flutuante.
- **Toda função do módulo leva um par `REVOKE` + `GRANT`, nesta ordem.** No
  PostgreSQL, função nova nasce com `EXECUTE` concedido a **PUBLIC**, e `anon` e
  `authenticated` herdam de PUBLIC. Escrever só `GRANT ... TO authenticated` não
  fecha nada — a porta já estava aberta antes. Sem o `REVOKE`, a função responde
  a quem nem fez login.
  ```sql
  REVOKE EXECUTE ON FUNCTION public.<pre>_minha_funcao(uuid) FROM PUBLIC, anon, authenticated;
  GRANT  EXECUTE ON FUNCTION public.<pre>_minha_funcao(uuid) TO authenticated;
  ```
  ⚠️ **Não conte com o `ALTER DEFAULT PRIVILEGES` da plataforma.** A seção 8.4 do
  `plataforma_01_schema.sql` tinha um `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE
  ON FUNCTIONS FROM PUBLIC` que parecia cuidar disso para todo objeto futuro —
  e não fazia nada (aquele comando só subtrai de um privilégio que ele próprio
  concedeu; o padrão embutido do PostgreSQL não está lá para ser subtraído).
  Foi por isso que as 17 funções `fin_*` ficaram abertas ao `anon` de 12 a
  13/09/2026.
- ⚠️ **Mudar o `RETURNS TABLE` de uma função exige `DROP FUNCTION` antes.** O
  `CREATE OR REPLACE` recusa com `cannot change return type of existing
  function`, e o arquivo do módulo — que existe para ser reaplicado — pararia no
  meio em quem já o tem instalado. Derrubar função não toca em dado nenhum:
  ```sql
  DROP FUNCTION IF EXISTS public.<pre>_extrato(uuid, uuid, date, date);
  CREATE OR REPLACE FUNCTION public.<pre>_extrato(...) RETURNS TABLE (...)
  ```
  A assinatura do `DROP` são os **parâmetros antigos** — no PostgreSQL o tipo de
  retorno não faz parte da identidade da função.
- ⚠️ **Ao juntar `public.users` numa função de listagem, use `LEFT JOIN`.** A
  RLS de `users` só deixa cada um ver o próprio perfil; com `JOIN` simples as
  LINHAS dos colegas somem da lista, e uma lista de dinheiro com linha faltando
  é pior que uma coluna vazia — o saldo deixa de bater com a soma visível.
- ⚠️ **A plataforma não retira privilégio "de tudo".** Quem escrever
  `REVOKE … ON ALL FUNCTIONS IN SCHEMA public` num arquivo da plataforma
  desliga o módulo plugado em silêncio: as tabelas e os dados continuam lá, e a
  primeira gravação responde `42501: permission denied for function <pre>_…`.
  Aconteceu em 12/09/2026. A plataforma revoga nome a nome, só do que ela criou.
- Vencimento e competência em `date`; `timestamptz` só para o instante de um registro.
- **Auditoria do módulo: só `UPDATE` e `DELETE`** (decisão do dono, 12/09/2026). Lançamento é dado de alto volume; auditar `INSERT` faria a trilha crescer sem acrescentar informação — o registro criado já está lá.
- O `<nome>_02_seed.sql` grava a linha do módulo em `platform_modules`.
- O `<nome>_00_reset.sql` apaga **tudo** que o módulo criou, inclusive a linha do catálogo e as sobras em `allowed_modules`:
  ```sql
  UPDATE public.tenant_members
     SET allowed_modules = array_remove(allowed_modules, '<nome>');
  DELETE FROM public.platform_modules WHERE id = '<nome>';
  ```

---

## 6. COMO CONECTAR UM MÓDULO

1. Criar as 5 pastas (vazias). Nada da plataforma é tocado ainda.
2. Escrever e rodar o SQL do módulo (`01` → `02`), com RLS em tudo.
3. Escrever e rodar `supabase/testes/teste_<nome>.sql` — **provar o isolamento entre empresas antes de existir tela**.
4. Escrever os serviços em `packages/core/src/modules/<nome>/`, usando o cliente `anon` (quem protege é a RLS) e funções `SECURITY DEFINER` para o que exigir privilégio.
5. Escrever o `manifesto.ts`.
6. Aplicar as soldas **S1** e **S2**, de preferência num **commit isolado** (assim `git revert` vira o botão de desplugar).
7. Construir as telas.
8. No Painel de Engenharia → **Módulos**, contratar o módulo para uma empresa; depois liberar ao membro na Central de Comandos.
9. `npm run verificar` (testes + verificador de LEGO + lint + build).
10. Atualizar este arquivo (bloco 2) **no mesmo commit**.

> **A ordem não é decorativa: banco primeiro, tela por último.** Telas antes das
> travas fazem tudo parecer funcionar — inclusive o que não deveria. Foi assim
> que a v9 chegou ao degrau 3 com um buraco onde qualquer usuário criava a
> própria empresa: a tela escondia o botão, e ninguém tinha testado o banco.

---

## 7. COMO DESCONECTAR UM MÓDULO

1. Rodar `supabase/criar-bd-<nome>/<nome>_00_reset.sql` no SQL Editor.
2. Apagar as 5 pastas do módulo.
3. Remover (ou comentar) as **3 linhas** das soldas S1 e S2.
4. `npm run modulos:verificar` — confirma que o nome não sobrou em nenhum arquivo da plataforma.
5. `npm test`, `tsc --noEmit`, `npm run build:web` — se passam, a peça saiu limpa.
6. `supabase/testes/teste_rls.sql` — as travas da plataforma continuam de pé sem o módulo.
7. Atualizar este arquivo: o módulo desce para o bloco 8.

### O que **não** é desconexão

| Ato | Por que não basta |
|---|---|
| Esconder o cartão do menu | A rota continua existindo; quem digitar o endereço entra. Esconder tela nunca foi controle de acesso |
| Tirar de `allowed_modules` | Isso revoga o acesso de **um membro** — outra coisa |
| Descontratar da empresa | Revoga de **uma empresa** — outra coisa |
| Apagar as pastas e deixar as tabelas | O banco fica com tabelas órfãs que ninguém terá coragem de apagar depois |
| Apagar as tabelas e deixar as pastas | O site quebra na primeira tela do módulo |

---

## 8. JÁ ESTEVE CONECTADO

| Módulo | Entrou em | Saiu em | Motivo |
|---|---|---|---|
| *(nenhum)* | — | — | — |

> Histórico anterior a este mapa: os módulos **Gestão de Tarefas**,
> **Conciliador de Cartões** e **Finanças Pessoal** existiram até 30/08/2026 e
> foram removidos junto com 28 migrations e 26 scripts de reset. Foi a remoção
> deles — trabalhosa, espalhada — que motivou este desenho.

---

## 9. QUEM PODE ABRIR UM MÓDULO — as duas chaves

O acesso efetivo é a interseção de **duas** autorizações, cruzadas pelo banco na
função `modulos_do_membro(tenant_id)`:

| Chave | Onde mora | Quem concede | Tela |
|---|---|---|---|
| **A empresa contratou** | `tenant_modules` | Desenvolvedor | Painel de Engenharia › Módulos |
| **O membro foi liberado** | `tenant_members.allowed_modules` | Proprietário | Painel de Controle de Tripulação |

> 👑 **O PROPRIETÁRIO PRECISA DE UMA CHAVE SÓ.** `allowed_modules` é o que ele
> entrega à **tripulação** dele; o dono da empresa não se convida. Para quem tem
> `role = 'OWNER'`, o que a empresa contratou já é o que ele pode abrir — e quem
> decide isso é `modulos_do_membro()`, no banco, não a tela. Exigir as duas chaves
> dele era um beco sem saída: contratava, liberava e não via nada (corrigido em
> 12/09/2026, na validação do degrau 7; testes 14 e 15 do `teste_rls.sql`).
>
> E a lista que ele distribui vem de `modulos_contratados(tenant_id)` — não de
> `admin_list_tenant_modules`, que é do Desenvolvedor e recusa o Proprietário.

E há uma terceira condição implícita: o módulo precisa estar **ativo no catálogo**
(`platform_modules.is_active`).

> ⚠️ **O gatilho `validar_modulos_membro` recusa liberar ao membro o que a
> empresa não contratou.** A mensagem de erro nomeia o módulo recusado. Sem essa
> trava, o Proprietário — que monta a própria equipe — poderia se autoconceder
> um módulo nunca contratado.

---

## 10. O VERIFICADOR

```bash
npm run modulos:verificar
```

Responde a quatro perguntas e falha (`exit 1`) se alguma resposta estiver errada:

1. O nome de algum módulo aparece fora do território dele e fora dos pontos de solda? (R1/R8)
2. Algum módulo importa outro módulo? (R3)
3. Algum SQL de módulo altera tabela da plataforma? (R5)
4. Existe módulo pela metade — código sem banco, ou banco sem código?

Com zero módulos ele passa trivialmente, e isso é o esperado: é o estado de
referência, o Sol sem peças.
