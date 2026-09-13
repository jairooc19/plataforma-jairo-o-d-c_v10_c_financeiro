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

Em especial, pertencem sempre à plataforma:

```
apps/admin-web/src/app/auth/                 entrada, logout, completar cadastro
apps/admin-web/src/app/dashboard/page.tsx    o orquestrador do painel
apps/admin-web/src/app/dashboard/settings/   white-label
apps/admin-web/src/app/dashboard/tenants/    triagem e empresas
apps/admin-web/src/app/dashboard/modulos/    contratação de módulos por empresa
apps/admin-web/src/components/{auth,dashboard,platform,providers}/
apps/mobile-app/                             o aplicativo inteiro
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

**As 5 pastas do Controle Financeiro** (apagar estas cinco = desplugar a peça):

```
apps/admin-web/src/app/dashboard/financeiro/     as telas (9 rotas)
apps/admin-web/src/components/financeiro/        os componentes
packages/core/src/modules/financeiro/            regras de negócio + manifesto
supabase/criar-bd-financeiro/                    o banco (4 tabelas, 16 funções)
supabase/testes/teste_financeiro.sql             as travas do módulo (14 testes)
```

E a documentação dele, que também é do módulo:
`_estudos/modulo-financeiro-especificacao.html` e `_estudos/degrau-06-projeto-modulo-financeiro.html`.

> **A plataforma continua funcionando inteira sem ele** — é a regra R9, e
> continua sendo o estado de referência do verificador. A prova foi medida no
> ambiente local antes desta conexão: depois do `financeiro_00_reset.sql`, o
> banco ficou com **0 tabelas `fin_`, 0 funções `fin_`, 0 linhas no catálogo**, e
> o `teste_rls.sql` da plataforma seguiu **14/14**.

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
  prefixoBanco: '<pre>_',
  versao: '1.0.0',
  exigePlataforma: 'v10',
};
```

### As regras de banco do módulo

- Toda tabela com o prefixo do módulo, **RLS ligada**, policy começando por `tenant_id`.
- Chave estrangeira aponta **do módulo para a plataforma** (`<pre>_contas.tenant_id → tenants.id`), nunca o contrário.
- Dinheiro em `numeric(14,2)` ou `bigint` de centavos — nunca ponto flutuante.
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
