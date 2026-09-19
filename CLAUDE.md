# CLAUDE.md — Plataforma Jairo O D C v10

Este arquivo é o guia de instruções para o Claude Code ao trabalhar neste repositório.
Leia-o integralmente antes de tocar em qualquer arquivo.

---

## 📖 Histórico de Mudanças — mudou-se para `HISTORICO.md`

O relato versão a versão (v4 → v10), com **todas as armadilhas em ⚠️ e o porquê de cada
decisão**, está em **`HISTORICO.md`, na raiz**. Ele saiu daqui em 14/09/2026, quando este
arquivo passou dos 150 mil caracteres que o Claude Code carrega por conversa — o histórico
sozinho respondia por **57%** dele.

⚠️ **O CORTE POR EXCESSO DE TAMANHO DESCARTA O FIM DO ARQUIVO, E O FIM DAQUI SÃO AS
REGRAS.** `## O Que NÃO Fazer (Proibições Absolutas)` e `## Pulos do Gato` são as últimas
seções — seriam as primeiras a se perder, em silêncio, enquanto o histórico (a parte
narrativa) sobreviveria. Seria exatamente a troca errada. Por isso quem saiu foi o
histórico, e não as regras.

⚠️ **NENHUMA REGRA SAIU DAQUI.** Toda armadilha do histórico já está destilada nas
proibições e nos pulos do gato, no fim deste arquivo. O `HISTORICO.md` guarda o *porquê*
de cada uma, com data e contexto.

⚠️ **LEIA O `HISTORICO.md` ANTES DE REVERTER QUALQUER DECISÃO QUE PAREÇA ESTRANHA** — e
sempre que a pergunta for "por que isto está assim?". Quase todas foram pagas com um
defeito em produção.

⚠️ **ENTRADA NOVA DE HISTÓRICO VAI PARA O `HISTORICO.md`, NO TOPO** — nunca para cá. O que
pode entrar aqui é a **regra** que a mudança gerou, na seção de proibições. Este arquivo é
o guia de instruções; aquele é a memória.

**Onde o projeto está** (18/09/2026, 5ª rodada): plataforma v10 com o módulo `financeiro`
plugado e publicado na Vercel — `teste_rls.sql` **16/16**, `teste_financeiro.sql` **52/52**,
`inventario_financeiro.sql` **17/17** e `npm test` **124/124**. **A FASE 5 FECHOU EM 18/09/2026**: DASHBOARDS, ORÇAMENTO e DINHEIRO DO PERÍODO ficaram
prontos no mesmo dia, em quatro rodadas. **Não resta nenhum "EM DESENVOLVIMENTO" no
módulo** — o Controle Financeiro está inteiro.

⚠️ **TODO NÚMERO DESTE PARÁGRAFO ENVELHECE SOZINHO.** Antes de repeti-lo, rode
`npm run ensaio` — ele recalcula os cinco de uma vez.

---

## Idioma

Sempre responda em português do Brasil.

---

## Regra de Ouro: Um Arquivo por Função

**Nunca concentre múltiplas responsabilidades em um único arquivo.**
Se um arquivo ultrapassar ~150 linhas, é sinal de que ele deve ser fatiado.
Crie subpastas e sub-arquivos. Prefira muitos arquivos pequenos e focados a poucos arquivos gigantes.
Isso vale para serviços, componentes, hooks, seções de formulário, filtros de busca e ações de servidor.

---

## Regra de Ouro: Separação entre Plataforma e Módulos

A base multi-tenant (usuários, empresas, autenticação, configurações) é a **Plataforma Jairo ODC**.
As funcionalidades de negócio são **Módulos** independentes entre si.
Nunca misture código de plataforma com código de módulo, nem código de um módulo com outro.

### O vocabulário (use sempre estas quatro palavras com este sentido)

| Palavra | Significa |
|---|---|
| **Plataforma** | A base: login, usuários, empresas, permissões, cores, perfil, auditoria. É o **Sol**. Funciona sozinha, sem nenhum módulo |
| **Módulo** | Um pacote de funcionalidade de negócio que se acopla à base. É a **peça de LEGO**. Pluga e despluga |
| **Ponto de solda** | Um dos (no máximo 3) lugares da plataforma onde o nome de um módulo pode aparecer. Listados em `MODULOS.md` |
| **Manifesto** | O cartão de visita que o módulo entrega à plataforma (id, nome, descrição, rota, prefixo de banco, versão) |

> 📖 **`MODULOS.md` na raiz é o mapa**: o que é plataforma, o que é módulo, as 10 regras do
> LEGO, os pontos de solda, e os roteiros de conectar e desconectar. **Leia-o antes de criar
> qualquer arquivo de módulo.** O `npm run modulos:verificar` confere as regras em segundos.

---

## Estrutura do Monorepo

Nome do projeto: `plataforma-jairo-o-d-c-v10` (npm workspaces)

> ⚠️ **ERA `-v4` ATÉ 17/09/2026**, com o projeto na v10 — sete versões de defasagem
> no nome. A troca foi feita **pelo npm**, não à mão: `package.json` alterado e
> depois `npm install --package-lock-only`, que regravou as duas linhas de `name`
> do `package-lock.json`. **Editar o lockfile à mão é o que não se faz** — nome fora
> de sincronia com o `package.json` é justamente o que o `npm ci` da Vercel recusa.

```
plataforma-jairo-o-d-c-v10/
├── apps/
│   ├── admin-web/          → Dashboard Web (Next.js 16.2.2)
│   └── mobile-app/         → App Mobile (Expo 57 / React Native 0.86.3)
├── packages/
│   └── core/               → @jairo/core — cérebro único compartilhado
├── supabase/
│   ├── criar-bd/           → Criação do banco do zero (3 arquivos, ordem 00→01→02)
│   │   ├── plataforma_00_reset.sql    → Demolidor: derruba tudo do CORE
│   │   ├── plataforma_01_schema.sql   → Construtor: schema consolidado v10
│   │   └── plataforma_02_seed.sql     → Hidratador: dados iniciais obrigatórios
│   ├── criar-bd-financeiro/→ 🧩 MÓDULO: banco do Controle Financeiro (01 → 02; o 00 despluga)
│   ├── testes/             → teste_rls.sql (16 travas da plataforma), teste_financeiro.sql
│   │                         (34 travas do módulo), inventario.sql e inventario_financeiro.sql
│   │                         (conferem o schema da plataforma e o do módulo: 15 linhas, só leem)
│   │   └── ambiente-local/ → 🆕 sobe um PostgreSQL descartável e valida o SQL antes do Supabase
│   ├── migrations/         → vazia; ler o README antes do primeiro dado real
│   ├── LEIA-ME-ORDEM.md    → 🆕 qual SQL rodar, em que ordem, em qual situação
│   └── config.toml         → Configuração do Supabase CLI
├── scripts/
│   └── verificar-modulos.mjs  → 🆕 degrau 5: o verificador de LEGO
├── _estudos/               → os HTMLs de cada degrau do projeto
├── MODULOS.md              → 🆕 degrau 5: O MAPA — plataforma × módulos
├── HISTORICO.md            → 🆕 a MEMÓRIA — o que mudou em cada versão, e por quê
└── package.json            → Workspace root
```

> 🧩 **Cada módulo acrescenta 5 pastas com o nome dele:**
> `packages/core/src/modules/<nome>/`, `apps/admin-web/src/app/dashboard/<nome>/`,
> `apps/admin-web/src/components/<nome>/`, `supabase/criar-bd-<nome>/` e
> `supabase/testes/teste_<nome>.sql`. Tudo o que **não** tem nome de módulo é plataforma.
> Hoje há **um** módulo conectado — `financeiro` (prefixo `fin_` no banco). O mapa
> completo, com as soldas e o caminho de desconexão, está em `MODULOS.md`.

---

## Comandos

Na **raiz do repositório**:
```bash
npm install          # Instala as dependências de todos os workspaces
npm run web          # Inicia o admin-web em desenvolvimento (porta 3000)
npm test             # 90 testes do Core (node:test, sem dependências)
npm run modulos:verificar   # o verificador de LEGO (plataforma × módulos)
npm run verificar    # testes + verificador + lint + build, em sequência
npm run ensaio       # 🆕 O ENSAIO GERAL: as SEIS provas de uma vez, banco incluído
```

> 🧪 **O SQL TAMBÉM PODE SER VALIDADO AQUI, E DEVE SER** (a partir de 2026-09-12):
> `supabase/testes/ambiente-local/` sobe um PostgreSQL descartável, aplica o
> `plataforma_01_schema.sql` de verdade e roda o `teste_rls.sql` — as 14 travas deram
> PASSOU localmente **e** no banco publicado. Antes de entregar SQL, rode lá: até este
> degrau, todo arquivo SQL ia para a mão do dono do projeto sem nunca ter sido executado.
> O que o ambiente local **não** prova: GoTrue (login, OAuth), PostgREST e configurações
> de painel. Ver o `README.md` daquela pasta.

> 🎭 **DESDE 18/09/2026, UM COMANDO SÓ FAZ TUDO ISSO: `npm run ensaio`.**
> `scripts/ensaio-geral.mjs` roda as SEIS provas em sequência — testes do Core, verificador
> de LEGO, lint, build, banco PostgreSQL descartável com **todas** as travas (plataforma e
> módulos) e, por fim, o **ENSAIO DE UPGRADE**: ele monta um banco com o schema do ÚLTIMO
> COMMIT e aplica o de agora por cima, que é o que pega SOBRECARGA de função. Ele descobre
> os módulos plugados varrendo as pastas `supabase/criar-bd-<nome>`; não há nome de módulo
> escrito nele, e por isso continua sendo arquivo de plataforma. Sem PostgreSQL na máquina,
> os dois últimos passos são PULADOS com aviso — nunca dados como aprovados.

> ⚠️ **O DONO DO PROJETO NÃO RODA NADA DISSO** (dito em 2026-09-12): o ciclo dele é
> **enviar ao GitHub → a Vercel constrói → ele abre o sistema publicado e testa**, e o
> banco ele confere pelo **SQL Editor do Supabase**. Portanto: **rodar `npm run verificar`
> antes de entregar é responsabilidade de quem escreve o código**, nunca uma tarefa
> delegada a ele. E todo SQL entregue a ele precisa **devolver linhas** — o SQL Editor
> descarta `RAISE NOTICE` (ver `supabase/testes/inventario.sql`, que já responde
> OK/DIVERGE sozinho).

> `packages/core` **não tem script de build** e não precisa de um: é consumido como
> TypeScript cru via `transpilePackages: ["@jairo/core"]` no `next.config.ts` e via
> `metro.config.js` no mobile.
>
> ⚠️ **CORRIGIDO EM 17/09/2026:** este parágrafo dizia que o `package.json` da raiz
> "ainda declara um script de build do core que aponta para um alvo inexistente".
> **Não declara mais.** Os seis scripts da raiz são exatamente os listados acima
> (`web`, `build:web`, `lint:web`, `test`, `modulos:verificar`, `verificar`) — não
> existe `build:core` nem nada parecido. A frase antiga mandava procurar um defeito
> que não está lá.

Em **apps/admin-web**:
```bash
npm run dev          # Servidor de desenvolvimento Next.js
npm run build        # Build de produção
npm run lint         # ESLint 9
```

Em **apps/mobile-app**:
```bash
npm run start        # Servidor Expo
npm run android      # Build Android
npm run ios          # Build iOS
```

### Testes — existem, e a frase antiga dizia o contrário

⚠️ **CORRIGIDO EM 17/09/2026. Esta linha dizia "Não há scripts de teste em nenhum
pacote" — e era a divergência mais perigosa do arquivo**, porque ensinava que não
existe rede de proteção e convidava a entregar código sem rodar nada.

**A verdade:** a **raiz** tem `npm test`, e ele roda **44 testes** de verdade:

```bash
npm test     # node --test "packages/core/**/*.test.ts"  → 90 testes, sem dependência externa
```

⚠️ **ESTE NÚMERO JÁ MENTIU DUAS VEZES** (dizia 44 quando eram 69, e depois quando eram
90). **Conte antes de citar:** `npm test 2>&1 | grep "^. tests"`.

⚠️ **ARQUIVO COM TESTE É ARQUIVO SEM DEPENDÊNCIA, NESTE PROJETO.** O `node --test` **não**
resolve import sem extensão: `from '../../lib/datas'` dentro de um arquivo testado estoura
com `ERR_MODULE_NOT_FOUND`. E escrever `'../../lib/datas.ts'` **quebra o build**, porque o
`tsconfig.json` do admin-web não liga `allowImportingTsExtensions` (TS5097). Quando um
arquivo testado precisa de algo de fora, **passe por parâmetro** — foi o que se fez com os
rótulos dos meses em `dashboardRegras.ts`.

Os arquivos de teste vivem **dentro do `packages/core`**, ao lado do que eles testam
(padrão `*.test.ts`). Os **apps** (`admin-web` e `mobile-app`) é que não têm script de
teste próprio — e é só isso que a frase antiga poderia ter querido dizer.

⚠️ **Rodar `npm test` antes de entregar é obrigação de quem escreve o código**, nunca
tarefa do dono do projeto (ver o aviso do ciclo dele acima).

---

## Versões Exatas das Tecnologias

| Tecnologia | Versão |
|---|---|
| Next.js | 16.2.2 |
| React | 19.2.3 (nos dois apps) |
| React Native | 0.86.3 |
| Expo | ~57.0.20 |
| Expo Router | ~57.0.19 |
| expo-local-authentication | ~57.0.2 |
| expo-secure-store | ~57.0.3 |
| expo-dev-client | ~57.0.18 |
| TypeScript | estrito em todos os pacotes |
| TailwindCSS | 4 (admin-web) |
| Lucide React | `lucide-react@^1.14` (web) · `lucide-react-native@^1.8` (mobile) |

**Atenção:** O Next.js 16 tem breaking changes em relação ao 15.
Antes de mexer em rotas ou middleware do admin-web, consulte `apps/admin-web/AGENTS.md`.

⚠️ **Os pacotes do Expo agora seguem o número do SDK, não a própria linha.** O
`expo-router` pulou de `~6.0.23` para `~57.0.19`, o `expo-secure-store` de `~15.0.8` para
`~57.0.3`, e assim por diante — não é salto de 51 versões, é o esquema de numeração que
mudou para casar com o SDK. Quem vir `~57` num pacote que "estava na 15" não deve tentar
"corrigir" para baixo.

⚠️ **Esta tabela já mentiu.** Em 2026-09-07 ela ainda dizia Expo ~54.0.33 e RN 0.81.5,
enquanto o repositório estava em Expo 57 / RN 0.86.3 — dois SDKs subiram sem que ninguém
atualizasse aqui. **A fonte da verdade são os `package.json`**; esta tabela é conveniência.
Ao desconfiar, confira:

```bash
node -p "Object.entries(require('./apps/mobile-app/package.json').dependencies).map(([k,v])=>k+' '+v).join('\n')"
```

---

## Versões do Sistema

Controladas exclusivamente em `packages/core/src/constants/versions.ts`:

```
WEB_VERSION  = "v10 - 2026-09-11-01"
APP_VERSION  = "v10 - 2026-09-11-02"
```

Convenção de commit: `WEB_v10 YYYY-MM-DD – NN - APP_v10 YYYY-MM-DD - NN`

---

## O Cérebro Único — `@jairo/core` (packages/core)

**Regra absoluta:** toda inteligência de negócio nasce aqui.
Nunca escreva lógica de validação, chamada ao Supabase ou evento de analytics diretamente no admin-web ou no mobile-app. Escreva no core, exporte pelo `src/index.ts`, consuma nos apps.

### Conexão com o Supabase
`src/lib/supabase.ts`
Instância única (Singleton). Detecta o ambiente via `navigator.product`:
- No React Native: aplica fetch customizado compatível com o Expo
- No Next.js: aplica `cache: 'no-store'`
- **Nunca importar React Native no nível de módulo** (quebra o build da Vercel)

Exporta dois clientes:
- `supabase` — cliente anon (RLS ativo). Usado por componentes React no browser.
- `supabaseAdmin` — cliente service role (bypassa RLS). Usado exclusivamente por serviços chamados a partir de Server Actions. **Nunca usar no mobile.**

### Constantes
`src/constants/versions.ts` — versões Web e Mobile

### Analytics (telemetria local — sem provedor externo)
```
src/analytics/
├── eventNames.ts       → constantes de nomes de eventos
├── propertyNames.ts    → constantes de propriedades dos eventos
├── telemetry.ts        → registrador local (capture/identify/group/reset)
└── index.ts            → exportação do módulo
```
Nunca escrever strings de eventos soltos nos apps. Sempre usar as constantes deste módulo.

O `telemetry` grava apenas no console do ambiente atual (`console.debug`): nenhum
`fetch`, cookie, `localStorage` ou chave de API. Se um dia entrar um provedor real,
ele entra **aqui dentro** — os apps não mudam.

```typescript
import { telemetry, ANALYTICS_EVENTS } from '@jairo/core';
telemetry.capture(ANALYTICS_EVENTS.AUTH_ATTEMPT_SUBMIT, { ... });
```

### Serviços de Plataforma
```
src/services/platform/
├── authService.ts        → login (senha), Google, signOut, refresh, triagem, ehDesenvolvedor
├── googleAuthService.ts  → Google OAuth 2.0 do PROPRIETÁRIO (popup e redirecionamento)
├── profileService.ts     → perfil: ler, completar, editar e apagar a conta
├── tenantService.ts      → empresas, membros, permissões, módulos por membro
└── settingsService.ts    → configurações globais (cores, título, emails admin)
```

> `authService.googleSignIn(idToken, papel)` é uma **fachada fina** sobre o
> `googleAuthService.signInComGoogle`: existe para que a guarita tenha uma porta só, sem
> que a tela precise saber qual serviço chamar para cada tipo de acesso. A lógica mora no
> `googleAuthService`.
>
> ⚠️ **Chamava-se `googleSignInOwner` até 13/09/2026.** O `papel`
> (`'OWNER' | 'DEPENDENT'`) só escolhe a triagem e o rótulo da telemetria — **não
> autoriza nada**: não vai ao Google, não vai ao Supabase e não é gravado.

### Exportação
`src/index.ts` — porta de entrada. Exporta tudo: clientes, serviços, tipos, constantes, analytics.

---

## O Banco de Dados — Supabase (PostgreSQL + RLS)

### `supabase/criar-bd/` — Criação do Banco do Zero (v10)

**Esta pasta não contém migrations.** Ela contém os três arquivos que **criam o banco
inteiro do zero**, na ordem `00 → 01 → 02`. O ciclo desta plataforma é *wipe + rebuild*,
não evolução incremental — o nome da pasta diz isso explicitamente.

```
supabase/criar-bd/
├── plataforma_00_reset.sql    → O Demolidor  — TRUNCATE auth.users/identities + DROP das 7 tabelas,
│                                               das funções e dos triggers do CORE
├── plataforma_01_schema.sql   → O Construtor — schema consolidado v10: 2 extensões, 7 tabelas,
│                                               7 RLS ENABLE, 1 seed, 27 funções, 12 policies,
│                                               15 triggers
└── plataforma_02_seed.sql     → O Hidratador — dados iniciais obrigatórios (linha `id = 1` de
                                                `global_settings`), idempotente via DO UPDATE SET
```

⚠️ **ESTE NÚMERO DE FUNÇÕES JÁ MENTIU** (dizia 25 até 17/09/2026, quando eram 27).
Número escrito à mão envelhece em silêncio. **Conte antes de citar:**

```bash
grep -c "^CREATE OR REPLACE FUNCTION\|^CREATE FUNCTION" supabase/criar-bd/plataforma_01_schema.sql
```

**Como executar** (SQL Editor do Supabase — colar cada arquivo inteiro, na ordem):
```
1) plataforma_00_reset.sql    ← apenas em desenvolvimento/teste. DESTRUTIVO.
2) plataforma_01_schema.sql
3) plataforma_02_seed.sql
```

> Em banco novo e vazio, o `plataforma_00_reset.sql` pode ser pulado: o `plataforma_01_schema.sql` já cria
> tudo do zero. Rode o `00` só quando precisar demolir um banco existente antes.

> O `plataforma_01_schema.sql` já embute o mesmo `INSERT` de `global_settings` que está no
> `plataforma_02_seed.sql`. A diferença: o do schema usa `ON CONFLICT DO NOTHING` (só cria se
> faltar), o do seed usa `ON CONFLICT DO UPDATE` (reaplica cores e título). Rodar o
> `02` depois do `01` é o que permite reajustar o white-label sem reset destrutivo.

> **Escopo do `plataforma_00_reset.sql`:** restrito ao CORE. Se algum banco ainda tiver tabelas
> dos módulos antigos (`tasks`, `conciliador_*`, `fin_*`), este script **não** as
> remove — precisam ser derrubadas manualmente uma única vez.

**Se um dia houver migrations de verdade (v10+):** crie uma pasta
`supabase/migrations/` separada, ao lado de `criar-bd/`. A distinção fica explícita:
`criar-bd/` reconstrói do zero, `migrations/` evolui um banco em produção.

#### Histórico: as 7 migrations da v4

O `criar-bd/plataforma_01_schema.sql` é a consolidação de `core_platform_00_schema.sql` até
`core_platform_06_auto_confirm_email.sql`, que foram **apagadas** na v5. A consolidação
eliminou uma race condition real: a `04` derrubava com `DROP POLICY` uma policy criada
na `00` para recriá-la corrigida. No arquivo único, a policy
`"Acesso à Empresa (Dono ou Membro)"` já nasce na forma final (Dono **OU** membro ativo).

Ordem interna obrigatória do `plataforma_01_schema.sql`, que não deve ser reordenada:
funções **antes** das policies que as chamam (`check_is_tenant_member`,
`check_is_tenant_owner`), e trigger **BEFORE** (`on_auth_user_auto_confirm`) antes do
**AFTER** (`on_auth_user_created`).

### Tabelas Principais

**Plataforma:**
- `users` — perfil (id, email, full_name, role, is_superuser, is_client_owner, is_active, `planet` **NOT NULL** default `'TERRA'`, `country` **NOT NULL** default `'BRASIL'`, `state`, `city`, `auth_provider` **NOT NULL** default `'email'`, `profile_completed` **NOT NULL** default `false`)
- `tenants` — empresas (id, tenant_name, slug, owner_id, is_active)
- `tenant_members` — vínculos (tenant_id, user_id, role: OWNER|DEPENDENT|VIEWER, allowed_modules text[], module_configs jsonb)
- `global_settings` — singleton (id=1), white-label (cores, título) e admin_emails
- `audit_log` — trilha de auditoria (tabela, registro_id, operação, ator, antes/depois)
- 🆕 `platform_modules` — **catálogo de módulos** (id, nome, descrição, is_active). Nasce
  **vazia**: quem escreve a linha é o *seed do próprio módulo*, nunca a aplicação
- 🆕 `tenant_modules` — **o que cada empresa contratou** (tenant_id, module_id, is_active).
  Acesso a um módulo = contratado pela empresa **E** liberado ao membro em `allowed_modules`

### Regras Críticas do Banco

- `allowed_modules` em `tenant_members` é `text[]` — nunca string separada por vírgula
- Todo id em `allowed_modules` tem de existir em `platform_modules` **e** estar contratado
  pela empresa em `tenant_modules`: o gatilho `validar_modulos_membro` recusa o resto
- Quem cruza "liberado ao membro" com "contratado pela empresa" é a função
  `modulos_do_membro(tenant_id)` — nunca a tela
- Toda lógica multi-passo no banco deve ser uma única função SQL `SECURITY DEFINER` transacional — nunca uma sequência de chamadas TypeScript separadas
- RLS ativo em todas as tabelas. Escudo: toda query começa com `tenant_id = p_tenant_id`
- Views e funções de módulo usam `SECURITY INVOKER` para respeitar RLS do usuário logado
- Extensão `unaccent` ativada na seed para buscas sem acento

---

## O Site Administrativo — `apps/admin-web`

Next.js 16.2.2 com App Router. Antes de mexer em rotas ou middleware, ler `AGENTS.md`.

### Configurações
- `next.config.ts` — `transpilePackages: ["@jairo/core"]`
- `src/proxy.ts` — renova a sessão SSR a cada requisição e barra celular em `/dashboard`
  - ⚠️ **v10: era `middleware.ts`.** No Next.js 16 a convenção `middleware` está
    depreciada e foi renomeada para `proxy`; o `proxy` roda sempre no runtime
    Node.js (o `middleware` rodava no Edge). O build confirma a troca: ele lista
    `ƒ Proxy (Middleware)` no relatório de rotas.
- ⚠️ **Não existe `src/lib/supabaseAdmin.ts`** — nunca existiu como arquivo, e
  desde a v10 não existe cliente de chave mestra em lugar nenhum da aplicação
- Path alias: `@/*` → `src/*`

### Variáveis de Ambiente
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          ← nunca exposta no navegador
EXPO_PUBLIC_API_URL                ← URL base usada pelo Core para chamar as API Routes
NEXT_PUBLIC_GOOGLE_CLIENT_ID       ← Client ID do Google; o MESMO cadastrado no Supabase
```

> Sem `NEXT_PUBLIC_GOOGLE_CLIENT_ID` o login do Proprietário **não quebra**: a tela troca o
> popup pelo redirecionamento conduzido pelo Supabase. O popup, porém, só existe com ela.

Modelo versionado: `apps/admin-web/.env.example`.

> **Removidas na v4** (nenhum código as lê mais): `RESEND_API_KEY`,
> `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PERSONAL_API_KEY`,
> `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

### Rotas da Aplicação
```
src/app/
├── page.tsx
├── layout.tsx                      → layout raiz (sem provedores externos)
├── auth/
│   ├── actions.ts                  → loginWithCatracaAction (senha + cookies SSR)
│   ├── google-actions.ts           → syncGoogleSessionAction (cookies SSR do popup Google)
│   ├── google/callback/route.ts    → retorno do OAuth por redirecionamento (caminho de reserva)
│   ├── logout/route.ts             → limpa os cookies de sessão (metade servidor do logout)
│   └── complete-profile/page.tsx   → endereço da tela de completar cadastro
├── mobile-blocked/page.tsx         → destino do redirecionamento de user agent móvel
├── privacidade/page.tsx            → política de privacidade (pública, exigida pelo Google OAuth)
└── dashboard/
    ├── page.tsx                    → orquestrador: lobby, dashboard dev ou operacional
    ├── settings/page.tsx
    ├── modulos/page.tsx            → Desenvolvedor: contratar/descontratar módulo por empresa
    └── tenants/page.tsx
```

> 🧩 **AS ROTAS DO MÓDULO NÃO ENTRAM NA LISTA ACIMA** (são do MÓDULO), mas quatro delas
> nasceram em 18/09/2026 e valem um registro aqui pelo que ensinam:
> `dashboards/contas-movimento`, `dashboards/contas-identificadoras`, `conferencia` e
> `conferencia-identificadora`. **As duas de conferência NÃO estão no menu**, e isso é
> cumprimento da decisão de 13/09 (uma só porta por pergunta): só se chega a elas clicando
> no dashboard.

> ⚠️ **AS DUAS ÚLTIMAS LINHAS FORAM CORRIGIDAS EM 17/09/2026.** Esta listagem
> anunciava um `dashboard/tenants/actions.ts` que **não existe** — e omitia
> `dashboard/modulos/page.tsx` e `privacidade/page.tsx`, que existem. Listagem de
> arquivos escrita à mão apodrece; confira com
> `find apps/admin-web/src/app -type f \( -name "*.tsx" -o -name "*.ts" \) | sort`
> antes de confiar nela. (As rotas de `dashboard/financeiro/` não estão aqui de
> propósito: são do MÓDULO, e módulo não entra na listagem da plataforma.)

> Não existe mais a pasta `src/app/actions/` — todas as Server Actions que ela continha
> pertenciam aos módulos removidos. **Restam exatamente DUAS**, ambas em `src/app/auth/`:
> `actions.ts` (login por senha) e `google-actions.ts` (cookies SSR do popup Google) —
> são os dois únicos arquivos do admin-web com `"use server"` no topo. A tela de
> empresas (`dashboard/tenants/page.tsx`) **não usa Server Action**: é um componente
> `"use client"` que chama o `tenantService` do Core, e ele chama as funções `admin_*`
> do banco — que conferem `is_superuser()` lá dentro. Esse é o desenho da v10.

### API Routes — ⚠️ TODAS REMOVIDAS NA v10

> **Nenhuma das rotas listadas abaixo existe mais.** As nove `/api/*` rodavam com
> a chave mestra e **não pediam identificação**: quem soubesse o endereço criava
> empresas, promovia usuários e trocava as cores do sistema. Autenticá-las seria
> remendo; o desenho certo é o banco decidir. Cada operação virou uma função
> `admin_*` no PostgreSQL, que confere `is_superuser()` com a sessão de quem
> chama — e a mesma chamada serve à web e ao aplicativo.
>
> | Rota antiga | O que faz hoje |
> |---|---|
> | `GET /api/admin/users` | `admin_list_users()` |
> | `GET /api/admin/user-tenants` | `admin_list_user_tenants(uuid)` |
> | `POST /api/admin/sync-tenants` | `admin_sync_user_tenants(uuid, jsonb, uuid[])` |
> | `GET /api/users/pending` | `admin_list_users()` (a tela filtra) |
> | `POST /api/users/promote` | `admin_promote_to_owner(uuid, text)` |
> | `POST /api/settings` | `admin_update_global_settings(jsonb)` |
> | `GET /api/settings` | `settingsService.getGlobalSettings()` (leitura pública) |
> | `GET /api/tenants` | removida — estava quebrada (pedia a coluna `name`, que não existe) |
> | `POST /api/notify-admin` | removida — só escrevia no log do servidor |
>
> A listagem original fica abaixo como registro do que existia.

### API Routes (registro histórico — v9)
```
src/app/api/
├── admin/                          → ⚠️ porta HTTP do Painel de Engenharia do MOBILE
│   ├── users/route.ts              → GET  todos os usuários (tenantService.getAllUsers)
│   ├── user-tenants/route.ts       → GET  ?userId= — empresas de um usuário
│   └── sync-tenants/route.ts       → POST cria/desativa/reabilita empresas + ajusta o papel
├── notify-admin/route.ts           → registra novo cadastro no log do servidor
├── settings/route.ts
├── tenants/route.ts
└── users/
    ├── pending/route.ts
    └── promote/route.ts
```

> `auth/verify-email/` e `analytics/audit-logs/` foram apagadas na v4: a primeira
> servia ao gate de confirmação de e-mail, a segunda consultava a API do PostHog.

### Componentes — Separação por Área

**Autenticação:**
```
src/components/auth/
├── Catraca.tsx             → modo BYPASS: sempre libera, sem rede nem chave de API
├── hooks/useAuthLogic.ts
└── views/
    ├── MainMenuView.tsx          → SEM botão de cadastro (v7)
    ├── AccessOptionsView.tsx
    ├── LoginGoogleView.tsx       → PROPRIETÁRIO e DEPENDENTE: só o botão do Google
    ├── CompleteProfileView.tsx   → cadastro pela metade (obrigatório, sem "voltar")
    ├── LoginFormsView.tsx        → DESENVOLVEDOR: e-mail + senha
    ├── SignUpView.tsx            → só alcançável pelo desvio de planeta
    ├── TenantSelectorView.tsx
    └── MiscViews.tsx             → inclui `waiting-team` (Dependente sem convite)
```

> ⚠️ **`LoginGoogleOwnerView.tsx` NÃO EXISTE MAIS** (13/09/2026): virou
> `LoginGoogleView.tsx`, com a prop `papel`. O `AuthInterface` roteia `login-owner` **e**
> `login-dependent` para ele, e deixa só `login-developer` no formulário de senha.
>
> ⚠️ **O Dependente passou a entrar pelo Google porque não tinha como entrar de jeito
> nenhum.** Ele caía no formulário de senha, e para ter senha precisaria se cadastrar — mas
> o botão de cadastro saiu do menu na v7 e o `SignUpView` só é alcançável pelo desvio de
> planeta. A porta do Google cria a conta no primeiro acesso.

**Dashboard — Perfil (fatiado por responsabilidade):**
```
src/components/dashboard/profile/
├── ProfileModal.tsx          → moldura e escolha do painel
├── useProfileModal.ts        → estado e chamadas de serviço
├── ProfileDetailsView.tsx    → leitura
├── ProfileEditForm.tsx       → edição
└── DeleteAccountConfirm.tsx  → confirmação da exclusão
```

**Utilitários compartilhados:**
```
src/lib/logout.ts             → encerra as DUAS metades da sessão (navegador + cookies)
src/lib/mobileBlock.ts        → fonte única do bloqueio móvel (rota, mensagem, regex de user agent)
src/lib/erro.ts               → tira a mensagem legível do `unknown` do `catch` (mata o `catch (e: any)`)
src/lib/empresaDoContexto.ts  → achata o embed `tenants` do PostgREST (vem objeto OU array de um)
src/lib/googleClientId.ts     → fonte única do NEXT_PUBLIC_GOOGLE_CLIENT_ID; diz se há popup
src/hooks/useBrazilCities.ts  → cidades do IBGE (cadastro e edição de perfil)
src/hooks/useIsMobile.ts      → largura da janela < 768px (breakpoint `md`)
src/types/plataforma.ts       → tipos da plataforma compartilhados pelas telas do admin-web
```

> ⚠️ **AS TRÊS LINHAS DE `src/lib/` DO MEIO ENTRARAM EM 17/09/2026** — os arquivos
> já existiam, a listagem é que os omitia. Confira com `ls apps/admin-web/src/lib`
> antes de concluir que algo "não existe no projeto".

**Provedores:**
```
src/components/providers/
└── GoogleAuthProvider.tsx  → casca "use client" do Google Identity Services;
                              sai da frente quando não há Client ID configurado
```

**Dashboard:**
```
src/components/dashboard/
├── DashboardHeader.tsx
└── views/
    ├── OperationalDashboardView.tsx
    ├── DeveloperDashboardView.tsx
    └── LobbyView.tsx
```

**Plataforma:**
```
src/components/platform/
└── team/
    └── TeamManagementModal.tsx
```

**Utilitários:**
```
src/components/
├── MobileBlocker.tsx       → cortina de bloqueio em telas < 768px; montada no layout raiz
└── SearchableSelect.tsx    → select com busca; aceita `id` para vincular um <label>
```

> 📱 **O bloqueio móvel tem duas camadas, e só uma delas vale.** O `MobileBlocker`
> mede a **largura real da janela** e cobre toda rota — é o portão de verdade. O
> middleware barra por **user agent** apenas em `/dashboard`, redirecionando para
> `/mobile-blocked`; user agent se falsifica em dois cliques, então essa camada é
> conveniência (evita renderizar o painel), não segurança. O `MobileBlocker` **não
> renderiza em `/mobile-blocked`**: aquela página já é a mensagem, e o overlay
> enterraria o botão "Ir para a Home" dela.
>
> ⚠️ **`ipad` está fora da regex do middleware de propósito** — tablet em paisagem
> é uso permitido pela própria mensagem. Quando estreito demais, quem barra é a
> camada de largura.

> A pasta `src/components/analytics/` (com o `AuditLogView.tsx`) e a
> `src/components/providers/` (com o `PostHogProvider.tsx`) foram apagadas na v4.
> O `AuditLogView` já estava sem consumidor desde a remoção dos módulos, e dependia
> inteiramente da API do PostHog.

---

## O Aplicativo Mobile — `apps/mobile-app`

Expo 57 / React Native 0.86.3 com Nova Arquitetura ativada.
Roteamento via Expo Router 57.

### Configurações
- `metro.config.js` — vigia `workspaceRoot` para resolver `@jairo/core`
- `babel.config.js` — tradução de código moderno para nativo
- `app.json` — nome: "Plataforma Jairo O D C", scheme: "plataformajairo"
- Path alias: `@/*` → `src/*`

### Variáveis de Ambiente
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
```

Modelo versionado: `apps/mobile-app/.env.example`.
`EXPO_PUBLIC_POSTHOG_KEY` foi removida na v4.

### Estrutura de Rotas

```
app/
├── _layout.tsx              → layout raiz + porteiro (boot, sessão, biometria)
├── +html.tsx                → casca HTML, só na web
├── +not-found.tsx
├── modal.tsx
├── auth/
│   └── google.tsx           → retorno do deep link plataformajairo://auth/google
├── central-comandos.tsx     → Painel de Engenharia: triagem de usuários e empresas
├── ajustes-globais.tsx      → Painel de Engenharia: white-label (título, e-mails, cores)
├── (auth)/                  → guarita: tudo antes de entrar
│   ├── _layout.tsx
│   ├── index.tsx            → menu principal
│   ├── login.tsx
│   ├── signup.tsx
│   ├── complete-profile.tsx
│   ├── select-tenant.tsx
│   ├── about.tsx
│   └── contact.tsx
└── (tabs)/                  → painel: barra de abas NATIVA do sistema
    ├── _layout.tsx          → NativeTabs
    ├── index.tsx            → painel (cliente ou engenharia, pelo papel)
    └── perfil.tsx           → Meu Perfil (escondido do Desenvolvedor)
```

> ⚠️ **`app/auth/` NÃO É O GRUPO `app/(auth)/`.** Com parênteses é grupo e
> some da URL; sem parênteses é segmento real. A rota do retorno do Google
> precisa responder em `/auth/google`, exatamente como está cadastrado no
> Supabase — por isso ela fica fora do grupo.

> ⚠️ **Não existe `app/index.tsx`.** Ele foi absorvido pelo `app/_layout.tsx` na
> v9 porque `(auth)/index.tsx` também responde em `/` — duas rotas no mesmo
> endereço, e o Expo Router não escolhe entre elas.

> A aba `two.tsx` foi removida junto com o módulo de Tarefas — ela era o dashboard de tarefas
> inteiro (rotulado como "Ajustes" no tab bar por engano histórico). A segunda aba de hoje é
> `perfil`, e ela é condicional: ver "Abas nativas — v9" abaixo.

### Componentes e Telas Mobile
```
components/
├── auth/RegisterForm.tsx
├── client/ClientDashboard.tsx
└── developer/DeveloperDashboard.tsx

screens/
├── ProfileScreen.tsx        → orquestrador dos três painéis do Meu Perfil
├── profile/                 → useProfileScreen, ProfileIdentity, ProfileDetailsView,
│                              ProfileEditForm, DeleteAccountConfirm, ProfileRow, iniciais
├── admin/                   → Painel de Engenharia (v9)
│   ├── CommandCenterScreen.*    → triagem de usuários + clientes operacionais
│   ├── TenantManagerModal.*     → gerenciar as empresas de um usuário
│   ├── TenantLists.tsx          → habilitadas + histórico
│   ├── UserListItem.tsx         → um usuário na lista
│   ├── GlobalSettingsScreen.*   → white-label
│   ├── ColorField.tsx           → hexadecimal + amostra ao vivo (não há input color no RN)
│   ├── useCommandCenter.ts      → lista e divide pendentes/operacionais
│   ├── useTenantManager.ts      → estado do gerenciador + gravação
│   └── useGlobalSettingsScreen.ts
├── AboutScreen.tsx
└── SupportScreen.tsx
```

> ⚠️ **`screens/admin/` é a ÚNICA parte do app que fala HTTP em vez de Supabase.**
> As operações do Painel de Engenharia exigem service role, e o Desenvolvedor do
> mobile não tem sessão Supabase para a RLS reconhecer. Ver `adminApiService`.

### Otimização v9 — gestos, ciclo de vida e tema animado

Três frentes entraram na v9, cada uma em arquivo próprio (regra de ouro), todas
com o carimbo `[OTIMIZADO PARA MÁXIMA PERFORMANCE]` no TSDoc.

| Arquivo | Papel |
|---|---|
| `src/lib/gestureRuntime.ts` | Fonte única de "há gestos nativos?" + `require` preguiçoso |
| `src/components/GestureRoot.tsx` | `GestureHandlerRootView` real, ou um `View` |
| `src/components/GestureArea.tsx` | `GestureDetector` real, ou nada na árvore |
| `src/hooks/useSheetDragGesture.ts` | Arrasto para fechar a folha do `SearchableSelect` |
| `src/hooks/usePermissionWatch.ts` | Realtime + `AppState`, extraído do `_layout.tsx` |
| `src/context/ThemeAnimationContext.tsx` | Shared values das cores do white-label |
| `src/hooks/useAnimatedThemeColor.ts` | Consome o contexto: fundo, texto e borda animados |

⚠️ **A detecção de gestos NÃO pergunta pelo ambiente, e não deve passar a
perguntar.** `Constants.executionEnvironment` do `expo-constants` devolve
`storeClient` tanto no Expo Go quanto num development build com `expo-dev-client`
— justamente os dois casos que precisam ser distinguidos. Quem responde é
`TurboModuleRegistry.get('RNGestureHandlerModule')`, e a checagem ainda confirma
que o módulo traz as funções da v3 (`flushOperations`,
`updateGestureHandlerConfig`, `installUIRuntimeBindings`): um módulo da era v2
responde ao nome e só estoura depois, no primeiro gesto.

⚠️ **O `GestureHandlerRootView` volta por `require()`, nunca por `import`.** O
`import` estático é içado e avaliado em todo ambiente — foi ele que matava o
Expo Go no arranque, e é por isso que a v8 arrancou os imports em vez de
protegê-los com `try/catch`. O erro acontece na avaliação do módulo, não no JSX.

⚠️ **O canal Realtime cai só em `background`, nunca em `inactive`.** O iOS entra
em `inactive` a cada central de controle ou seletor de apps; derrubar o websocket
ali gastaria mais bateria do que mantê-lo aberto. E o retorno ao `active` remonta
o canal por um `getSession()` explícito — `onAuthStateChange` **não** dispara ao
voltar do background, então confiar nele deixaria a vigilância morta pelo resto
da sessão, em silêncio.

⚠️ **O canal vive num `useRef`, não numa variável de efeito.** São dois efeitos
(autenticação e ciclo de vida) que precisam falar do mesmo canal; um `let` em
cada um daria a cada efeito a sua própria cópia, e o corte em background nunca
aconteceria — sem erro nenhum para denunciar.

**Perfis de build** (`eas.json`, em `apps/mobile-app/`): `development` (APK + dev client),
`preview` (APK interno) e `production` (app-bundle, com `autoIncrement`). Os
gestos funcionam nos três; no Expo Go o app sobe igual, sem eles.

### Menus do sistema — v9

Dois hooks e um componente, todos sem dependência nova: quem desenha o menu é o
sistema operacional.

| Arquivo | Papel |
|---|---|
| `src/hooks/useNativeActionSheet.ts` | Menu de ações: `ActionSheetIOS` no iOS, `AlertDialog` no Android |
| `src/hooks/useNativeContextMenu.ts` | Fachada fina sobre o anterior, para o gesto de segurar |
| `src/components/NativeContextMenu.tsx` | Envoltório `Pressable` com `onLongPress` |

⚠️ **`ActionSheetAndroid` NÃO EXISTE.** O React Native expõe `ActionSheetIOS` e
mais nada nessa família — uma busca por `ActionSheetAndroid` em todo o
`node_modules/react-native` não devolve ocorrência nenhuma. Escrever
`ActionSheetAndroid.showActionSheetWithOptions` estoura no aparelho com
`ReferenceError`. No Android, o menu desenhado pelo sistema é o `AlertDialog`,
que é o que `Alert.alert` abre.

⚠️ **No máximo TRÊS ações no Android.** O `AlertDialog` tem três papéis de botão
(positivo, negativo, neutro) e a partir do quarto o `Alert` simplesmente não o
mostra. O hook avisa em `__DEV__` em vez de fingir que coube.

⚠️ **Não use action sheet para o `SearchableSelect`.** As listas dele têm 250
países e 5.570 municípios: no Android o teto acima mata a ideia, e no iOS seria
uma parede rolante sem campo de busca — pior que a folha atual, que filtra
enquanto se digita. Action sheet é para punhado de ações, não para catálogo.

⚠️ **O `UIMenu` do iOS 13 não é isto, e não está exposto pelo React Native.**
Aquele menu com fundo escurecido, prévia levantada e ícones SF Symbols exige um
módulo nativo de terceiro (`react-native-context-menu-view`), com suporte fraco
no Android e recompilação a cada SDK. Decisão do dono do projeto (2026-09-06):
ficar no núcleo. Se um dia mudar, a troca acontece inteira dentro de
`useNativeContextMenu` — as telas só conhecem `abrir(itens)`.

### Abas nativas — v9

A barra de abas passou de `<Tabs>` (React Navigation, desenhada em JavaScript)
para `<NativeTabs>` de `expo-router/unstable-native-tabs`, que instancia o
controlador de abas REAL de cada plataforma: `UITabBarController` no iOS e
`BottomNavigationView` no Android, via `RNSTabsHostIOS` / `RNSTabsHostAndroid`
do `react-native-screens`. **Zero dependência nova.**

| Arquivo | Papel |
|---|---|
| `app/(tabs)/_layout.tsx` | `NativeTabs` + gatilhos; esconde "Perfil" do Desenvolvedor |
| `app/(tabs)/perfil.tsx` | Endereço da segunda aba (reexporta a tela) |
| `src/screens/ProfileScreen.tsx` | Meu Perfil: leitura + sair, com confirmação nativa |
| `src/hooks/useSessionRole.ts` | Papel da sessão, para compor a barra |
| `src/components/InstitutionalFooter.tsx` | Rodapé © + versão, agora dentro do conteúdo |

⚠️ **Não instale `@react-navigation/bottom-tabs`.** O expo-router traz o
navegador embutido em `build/react-navigation/bottom-tabs`; o pacote avulso
colocaria uma segunda cópia no bundle, em versão que ninguém garante casar.

⚠️ **A barra nativa não desenha cabeçalho.** O título do white-label migrou para
o `<Stack.Screen name="(tabs)">` de `app/_layout.tsx`, que já tinha `settings` em
mãos. Isso eliminou de quebra a **segunda** busca de `global_settings` que o
`(tabs)/_layout.tsx` fazia a cada abertura do painel.

⚠️ **A barra nativa é dona da borda inferior.** O rodapé institucional não cabe
mais abaixo dela: virou o último elemento do conteúdo de cada aba, fixo logo
acima da barra. Ver `components/InstitutionalFooter.tsx`.

⚠️ **Nunca alterne `hidden` depois de a barra montar.** O Expo Router remonta o
navegador e zera o estado — a aba trocaria sozinha sob o dedo do usuário. Por
isso o `(tabs)/_layout.tsx` espera `useSessionRole().carregando` terminar antes
de renderizar: a barra nasce com a composição final e nunca mais muda.

⚠️ **Esconder aba não é controle de acesso.** O papel vem do cofre do aparelho,
que é gravável por quem tem o aparelho. Quem protege dado é a RLS — o mesmo erro
do `sessionStorage.dev_vip_access` documentado acima.

**Ícones:** `sf` (SF Symbols) no iOS e `md` (Material Symbols) no Android — do
sistema, não de fonte empacotada. Foi por isso que o `lucide-react-native` saiu
da barra: um ícone nosso ficaria correto e ainda assim estrangeiro ali.

⚠️ **`unstable-` no caminho de importação é aviso de verdade.** A API pode mudar
em versão menor do expo-router. Se ela quebrar, o `<Tabs>` anterior está no
commit `9a41664` e volta com um `git checkout`.

**Abas por papel:** usuários comuns veem `Início` e `Perfil`; o Desenvolvedor vê
só `Início`, porque não tem linha em `public.users` para um perfil carregar.
## Segurança de Autenticação — v10

### Proprietário **e Dependente** — Google OAuth 2.0

1. `LoginGoogleView` mostra **só** o botão do Google (sem e-mail, sem senha)
2. O popup devolve um ID Token; `authService.googleSignIn(idToken, papel)` →
   `googleAuthService.signInComGoogle` troca por sessão via
   `supabase.auth.signInWithIdToken`
3. `ensure_google_user_profile` confirma o perfil em `public.users` (rede de segurança:
   o gatilho `on_auth_user_created` já é o caminho normal)
4. `syncGoogleSessionAction` espelha a sessão nos cookies HTTP — sem isso o servidor não
   enxerga o login feito no navegador
5. Triagem por papel (`encaminharPorPapel`): sem vínculo, o Proprietário vai para
   `waiting-approval` (espera o Desenvolvedor) e o Dependente para `waiting-team`
   (espera o dono da empresa); com um vínculo, entra; com vários, escolhe

> **Quem valida o token é o Supabase**, contra o Client ID cadastrado no provedor Google.
> Validar o ID Token no navegador seria teatro: um cliente comprometido validaria o que
> quisesse. Por isso o Core não tem nenhuma função `validateGoogleToken`.

> ⚠️ **O papel escolhido na guarita é lembrado em `papelDoAcesso`, gravado no clique** —
> nunca deduzido da `view` na hora da triagem. O "Completar Cadastro" fica no meio do
> caminho, e ali a tela já é outra.

### Desenvolvedor — e-mail + senha

A catraca anti-bot (Cloudflare Turnstile) foi removida. O fluxo hoje é:

1. `Catraca.tsx` é renderizado no login, mas **sempre libera** (bypass) — sem token,
   sem rede, sem chave de API
2. `loginWithCatracaAction` chama direto o `authService.signIn`
3. Sessão gravada nos cookies HTTP via `createServerClient` + `setSession()` no servidor
   — elimina o loop "Aguardando Triagem"
4. Não há confirmação de e-mail: após o cadastro o usuário já pode entrar

> **Se um dia voltar a haver verificação anti-bot**, ela entra dentro do `Catraca.tsx`
> e volta a condicionar o submit do `LoginFormsView` — a Server Action já está isolada.

### Acesso de Desenvolvedor (Painel de Engenharia)

> 🔄 **REESCRITO NA v10.** O texto abaixo descreve o desenho ANTIGO e está
> mantido como registro. **Hoje não existe credencial fixa:** o Desenvolvedor é
> um usuário real do Supabase com `is_superuser = true` em `public.users`, criado
> à mão pelo painel (ver `plataforma_02_seed.sql`). Quem confere o papel é o
> banco, dentro das funções `admin_*` e da `is_superuser()`.

**Como era até a v9** — a credencial era **fixa no código**, em
`packages/core/src/services/platform/authService.ts`:

```typescript
if (email === 'admin@pjodc.ia' && pass === '1qaz') { ... }
```

Não há variável de ambiente, rota de servidor nem hash. Funciona sem nenhuma configuração,
inclusive numa máquina limpa — foi por isso que a versão com bcrypt foi revertida.

> ⚠️ **Riscos conhecidos e aceitos** (decisão do dono do projeto, 2026-08-31):
> - A senha está em texto puro no repositório e no bundle do navegador.
> - O e-mail é lowercase e a senha é `1qaz` minúsculo — `1QAZ` **não** funciona.
> - O privilégio é mantido em `sessionStorage.setItem('dev_vip_access','true')`, que o
>   navegador controla: dá para setar essa chave pelo DevTools e entrar sem senha.
>
> Se um dia isso for endurecido, a correção certa é `is_superuser` no banco com
> verificação server-side por RLS — **não** basta esconder a senha, porque o portão
> real é o `sessionStorage`.

---

## Analytics — telemetria local

- Eventos e propriedades centralizados em `packages/core/src/analytics/`
- A captura é feita pelo `telemetry` (`console.debug`), sem provedor externo
- A trilha de auditoria cruzada com o PostHog não existe mais

---

## Padrões Obrigatórios ao Criar Código

### Adicionar novo serviço de plataforma
1. Criar em `packages/core/src/services/platform/<nomeService>.ts`
2. Exportar em `packages/core/src/index.ts`
3. Consumir via `import { nomeService } from '@jairo/core'`

### Adicionar novo módulo

> 📖 **O procedimento completo está em `MODULOS.md`, na raiz** — com as 10 regras, os
> pontos de solda e os roteiros de conectar e desconectar. O resumo:

1. **As 5 pastas**, todas com o nome do módulo:
   `packages/core/src/modules/<nome>/` (regras + `manifesto.ts`),
   `apps/admin-web/src/app/dashboard/<nome>/` (telas),
   `apps/admin-web/src/components/<nome>/`,
   `supabase/criar-bd-<nome>/` (`<nome>_00_reset` / `_01_schema` / `_02_seed`),
   `supabase/testes/teste_<nome>.sql`
2. Nunca acrescentar DROPs nem CREATEs de módulo aos arquivos de `supabase/criar-bd/` —
   essa pasta é exclusiva do CORE
3. Nunca compartilhar tabelas entre módulos, e nunca importar um módulo de dentro de outro
4. **Os 3 pontos de solda** (e só eles): `modules/registro.ts` (2 linhas), `core/src/index.ts`
   (1 linha) e a linha que o **seed do módulo** grava em `platform_modules`
5. Serviços de módulo usam o cliente **`anon`**, protegidos por RLS; o que exigir privilégio
   vira função `SECURITY DEFINER` com a checagem dentro do banco
   — ⚠️ **a regra anterior mandava usar `supabaseAdmin`, que não existe desde a v10**
6. Banco primeiro, tela por último: o `teste_<nome>.sql` prova o isolamento entre empresas
   **antes** de existir interface
7. Ao terminar: `npm run modulos:verificar` e atualizar o `MODULOS.md` no mesmo commit

### Uso do cliente Supabase
- Componentes React no browser: `import { supabase } from '@jairo/core'`
- Serviços de módulo chamados por Server Actions: `import { supabaseAdmin } from '@jairo/core'`
- SSR: usar `@supabase/ssr` com cookies (configurado no middleware)

### Datas e Fusos Horários
- Nunca `toISOString()` para datas de emissão/vencimento
- Usar "Midnight Local" para datas do Brasil
- No banco: `(coluna AT TIME ZONE 'America/Sao_Paulo')::date`
- Formatação: `.toLocaleString('sv-SE')`

---

## Dependências Principais por App

**admin-web:** `@supabase/ssr`, `@supabase/supabase-js`, `@react-oauth/google`, `tailwindcss@4`, `lucide-react`

**mobile-app:** `@supabase/supabase-js`, `expo-local-authentication`, `expo-secure-store`, `expo-router`

**core:** `@supabase/supabase-js`

> `recharts` (admin-web) e `xlsx`/SheetJS (core) foram **desinstalados** junto com os módulos:
> eram usados só pelos gráficos e pelos parsers de planilha do Conciliador.
>
> Na v4 saíram também `posthog-js`, `resend` e `@marsidev/react-turnstile` (admin-web),
> junto das integrações que os usavam.

---

## O Que NÃO Fazer (Proibições Absolutas)

- ❌ Nunca reintroduzir o cliente de chave mestra (`supabaseAdmin`) no Core — ele foi removido na v10; operação administrativa é função `admin_*` no banco, com `is_superuser()` conferido lá dentro
- ❌ Nunca criar rota HTTP (`/api/*`) ou Server Action que escreva no banco sem verificar a sessão de quem chamou — a documentação do Next.js avisa que Server Action é alcançável por POST direto
- ❌ Nunca declarar `SUPABASE_SERVICE_ROLE_KEY` em `.env` lido pela aplicação (web ou mobile); se uma rotina de manutenção precisar, o cliente nasce e morre dentro dela
- ❌ Nunca conceder permissão de tabela ao `authenticated` sem pensar na coluna: `GRANT UPDATE (colunas)` é o que impede um usuário de gravar `is_superuser` no próprio perfil
- ❌ Nunca escrever policy sem a cláusula `TO` — o padrão do PostgreSQL é PUBLIC, e foi assim que a lista de usuários ficou aberta até a v9
- ❌ Nunca confiar em `sessionStorage`, `SecureStore` ou qualquer marca no cliente como autorização — o papel vem do banco (`is_superuser()`)
- ❌ Nunca importar React Native no nível de módulo dentro de `packages/core`
- ❌ Nunca salvar `allowed_modules` como string separada por vírgula — desde a v10 a coluna é `text[]` de verdade (até a v9 ela era `text` e os tipos do TypeScript mentiam)
- ❌ Nunca guardar valor monetário em ponto flutuante — centavos inteiros no código (`lib/dinheiro.ts`), `numeric(14,2)` ou `bigint` no banco
- ❌ Nunca gravar data de vencimento/competência como `timestamptz` — use `date`; `timestamptz` é para o INSTANTE de um registro
- ❌ Nunca calcular fuso à mão (`-3 horas`) — use `lib/datas.ts`, que trata o horário de verão pelo `Intl`
- ❌ Nunca quebrar uma operação transacional do banco em chamadas TypeScript separadas — usar uma função SQL única
- ❌ Nunca reportar resultado de teste SQL por `RAISE NOTICE` — o SQL Editor do Supabase descarta mensagens do servidor e mostra `Success. No rows returned`; grave os vereditos numa tabela e termine o arquivo com um `SELECT`
- ❌ Nunca citar o nome de um módulo em arquivo da plataforma fora dos 3 pontos de solda declarados no `MODULOS.md` — rode `npm run modulos:verificar` antes de entregar
- ❌ Nunca fazer um módulo importar outro módulo — o que os dois precisam sobe para a plataforma
- ❌ Nunca alterar tabela, função ou policy da plataforma a pedido de um módulo — o módulo cria as próprias tabelas com o prefixo dele e aponta para a plataforma por chave estrangeira
- ❌ Nunca cadastrar um módulo no catálogo (`platform_modules`) pela aplicação — quem grava é o seed do módulo, e o reset dele apaga
- ❌ Nunca liberar módulo a um membro sem a empresa ter contratado — são duas chaves, e o gatilho recusa
- ❌ Nunca exigir `allowed_modules` do PROPRIETÁRIO — a coluna é a chave que ele entrega à tripulação dele; para o dono da empresa vale o que ela contratou (`modulos_do_membro` trata os dois casos)
- ❌ Nunca chamar `admin_list_tenant_modules` de tela do Proprietário — ela confere `is_superuser()` e devolve 42501; a função dele é `modulos_contratados(uuid)`
- ❌ Nunca chamar `salvarDependente` sem a lista de módulos — o parâmetro tem `= []` por padrão e a gravação APAGA as permissões que o integrante já tinha
- ❌ Nunca escrever `REVOKE … ON ALL FUNCTIONS IN SCHEMA public` (nem `GRANT` amplo) em arquivo da plataforma — "ALL FUNCTIONS" inclui as dos MÓDULOS plugados, a `rls_auto_enable()` do ambiente e as das extensões; a plataforma revoga **nome a nome**, só do que ela criou
- ❌ Nunca conceder `EXECUTE` a uma função nova sem o `REVOKE … FROM PUBLIC` antes — no PostgreSQL toda função nasce executável por PUBLIC, e `anon` herda de PUBLIC; só o GRANT não fecha nada
- ❌ Nunca confiar em `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` — o comando é aceito, grava zero linhas em `pg_default_acl` e não muda nada (ele só subtrai de privilégio que o próprio `ALTER DEFAULT PRIVILEGES` concedeu)
- ❌ Nunca ler "não recebe GRANT" como "está fechada" — sem GRANT a função fica no padrão do PostgreSQL, que é PUBLIC
- ❌ Nunca deixar um arquivo de teste SQL morrer com o erro cru do PostgreSQL — quando ele estoura, o `SELECT` final não roda e some até o resultado dos testes que passaram; ponha um porteiro no topo que diga qual arquivo rodar
- ❌ Nunca deduzir o papel escolhido na guarita a partir da `view` no momento da triagem — o "Completar Cadastro" fica no meio do caminho e a tela já é outra; guarde o papel em estado, no clique
- ❌ Nunca mandar um Dependente sem vínculo para a tela `waiting-approval` — ela diz que o Desenvolvedor está analisando, e quem precisa agir é o dono da empresa; a tela dele é a `waiting-team`
- ❌ Nunca importar um ícone direto de `lucide-react` numa tela de módulo — usar o registro (`components/financeiro/IconeFin.tsx`); a v1 renomeou o catálogo (`Trash2`→`Trash`, `Unlock`→`LockOpen`, `Filter`→`Funnel`) e o nome antigo devolve `undefined` sem acusar erro de build
- ❌ Nunca mudar o `RETURNS TABLE` de uma função com `CREATE OR REPLACE` — o PostgreSQL recusa com `cannot change return type of existing function` e o arquivo idempotente para no meio; ponha um `DROP FUNCTION IF EXISTS` (com os PARÂMETROS antigos) imediatamente antes
- ❌ Nunca fazer `JOIN` simples de tabela de módulo para `public.users` numa função de listagem — a RLS de `users` esconde os colegas e as LINHAS somem da lista; use `LEFT JOIN`, para a linha ficar e só a coluna vir vazia
- ❌ Nunca levar a lista de permissões de um módulo para uma tela da plataforma — a plataforma passaria a conhecer o negócio da peça; declare `rotaConfiguracao` no manifesto e deixe a plataforma só desenhar o link
- ❌ Nunca chamar `useSearchParams()` sem um `<Suspense>` **acima** do componente que o chama — o `npm run build` falha (não avisa) com "should be wrapped in a suspense boundary"; `<Suspense>` dentro do próprio componente não resolve
- ❌ Nunca abrir menu de linha com `position: absolute` dentro de tabela que rola — ele é recortado pelo `overflow`; usar `fixed` com `getBoundingClientRect`, e abrir para cima quando não couber embaixo
- ❌ Nunca oferecer "EDITAR" numa perna de transferência — as duas pernas são amarradas (RN-23) e alterar uma deixa o saldo da outra conta errado para sempre; o caminho é excluir (o banco apaga as duas) e lançar de novo
- ❌ Nunca filtrar no navegador uma lista que o banco já sabe buscar — a lista carregada é só a primeira página do cadastro, e a tela diria "nada encontrado" sobre algo que existe
- ❌ Nunca ler CSV com `split('\n')` + `split(',')` — quebra com vírgula dentro de aspas, quebra de linha dentro de aspas, `""` literal, e com o ponto e vírgula que o Excel brasileiro usa; percorrer com estado é a única forma
- ❌ Nunca detectar o separador de um CSV sem respeitar aspas — um campo com quebra de linha faz a "primeira linha" terminar no meio das aspas e o separador sai errado
- ❌ Nunca esquecer de remover o BOM (`﻿`) de arquivo salvo pelo Excel — o primeiro registro fica visualmente idêntico e diferente para o banco, e entra duplicado para sempre
- ❌ Nunca decodificar arquivo de planilha só como UTF-8 — o Excel em português salva em Windows-1252 e os acentos viram lixo **sem erro nenhum**; tente UTF-8 primeiro e caia para Windows-1252 se aparecer `�` (nunca o contrário: o Windows-1252 aceita qualquer byte e corromperia um UTF-8 válido em silêncio)
- ❌ Nunca gravar lote chamando a função de um em um pelo TypeScript — uma função de banco que recebe o array faz uma viagem só e devolve o relatório; queda de conexão no meio de um laço deixa metade gravada sem ninguém saber qual
- ❌ Nunca comparar duplicata de cadastro por igualdade de texto — a regra é `fin_normalizar` (sem acento, sem espaço, maiúsculas), a mesma do índice único; comparar cru deixa passar e o índice derruba a instrução inteira no fim
- ❌ Nunca deixar um teste com número esperado escrito à mão quando ele pode ser contado do catálogo — ele falha com o código certo e ensina a ignorar o vermelho
- ❌ Nunca escrever teste que dependa do estado deixado por outro teste do mesmo arquivo — inserir um terceiro no meio quebra o primeiro, apontando para o lugar errado
- ❌ Nunca voltar um mês com `setMonth(getMonth() - 1)` a partir do dia que se tem — em 31/03 isso devolve 3 de MARÇO, sem erro nenhum, e o botão "mês anterior" parece não funcionar; ancore no dia 1 e pegue o último dia com `new Date(ano, mes + 1, 0)`
- ❌ Nunca escrever cálculo de data dentro de um componente de tela — no Core ele é testável pelo `npm test`; na tela, só clicando
- ❌ Nunca fazer um atalho de período partir de hoje quando há data na tela — o clique repetido devolveria sempre o mesmo mês
- ❌ Nunca usar uma classe utilitária do Tailwind sem conferir que ela existe — `animate-fade-in` esteve escrita em 10 telas sem definição nenhuma, e classe inexistente não quebra o build nem acusa nada; o Tailwind 4 traz de fábrica só `spin`, `ping`, `pulse` e `bounce`
- ❌ Nunca deixar uma função de busca do módulo devolver cadastro desativado — a RN-06 manda o inativo sumir das listas de lançamento novo, e sem o filtro ele some da lista e reaparece ao digitar
- ❌ Nunca chamar `useEffect` depois de um `return` antecipado num componente — a contagem de hooks tem de ser igual em toda renderização; ponha o `if` DENTRO do efeito
- ❌ Nunca estimar trabalho de módulo pela memória sem abrir o arquivo — `fin_buscar_contas_movimento` existia desde o degrau 7, com GRANT, e nunca tinha sido chamada
- ❌ Nunca deixar dois campos de mesmo nome na mesma tela com comportamentos diferentes — um digitável e o outro não ensina uma coisa e cobra outra
- ❌ Nunca entregar teste novo sem tê-lo visto FALHAR uma vez — reaplique o schema sem a correção e confirme que ele acusa; teste que nunca falhou é decoração
- ❌ Nunca acrescentar parâmetro a uma função do banco com `CREATE OR REPLACE` sem derrubar a assinatura antiga — lista de parâmetros diferente não substitui, cria uma SOBRECARGA, e a versão velha continua com o GRANT que o arquivo lhe deu; medido em 14/09/2026, ficaram duas `fin_transferir` alcançáveis
- ❌ Nunca ensaiar só a instalação limpa ao mudar assinatura de função — num banco vazio não há função antiga para sobrar, e é exatamente aí que a sobrecarga se esconde; monte um banco com o schema anterior e aplique o novo por cima
- ❌ Nunca repetir a regra de deslocamento da ordem (RN-12) fora de `fin_abrir_espaco_na_ordem` — a cópia é a que esquece o `p_excluir_id`, e aí o lançamento editado empurra a si mesmo
- ❌ Nunca conceder `GRANT` a função interna de módulo — chamada de dentro de uma `SECURITY DEFINER` ela não precisa, e exposta deixaria embaralhar o extrato alheio sem checagem de permissão; exclua-a do teste do caminho feliz, com o motivo escrito
- ❌ Nunca ler `42501 Sem permissao` de um módulo como problema de permissão antes de conferir o seed — sem a linha do módulo em `platform_modules`, a `fin_pode()` nega tudo, e a mensagem não menciona catálogo nenhum
- ❌ Nunca rodar o `plataforma_00_reset.sql` com um módulo ainda instalado — o `DROP TABLE … CASCADE` de `tenants` e `users` destrói em silêncio as 8 chaves estrangeiras das tabelas `fin_*` para a plataforma, as tabelas SOBREVIVEM, e reaplicar o schema do módulo NÃO as recria (`CREATE TABLE IF NOT EXISTS` pula o bloco inteiro); o reset do MÓDULO vem primeiro — ver `supabase/LEIA-ME-ORDEM.md`
- ❌ Nunca supor que reaplicar um schema idempotente conserta uma tabela existente — `CREATE TABLE IF NOT EXISTS` não compara nada: constraint perdida, coluna nova e default alterado ficam de fora para sempre, sem um aviso
- ❌ Nunca gravar arquivo com `open(p, "wb").write(s.encode())` — o `open` é avaliado ANTES do `encode` e trunca o arquivo; se a codificação estourar, sobra ZERO byte. Codifique para `bytes` numa variável e só então abra o arquivo (zerou o `CLAUDE.md` em 16/09/2026, recuperado do commit)
- ❌ Nunca prender uma sugestão de campo só ao que MUDA quando a tela foi feita para NÃO mudar — o bônus N2 mantém conta e data após gravar, e a sugestão de ordem, presa a `[contaId, data]`, nunca mais rodava; um contador que só cresce é o jeito de dizer "pergunte de novo, mesmo que nada tenha mudado"
- ❌ Nunca deixar uma sugestão automática rodar durante a EDIÇÃO de um registro — ela sobrescreve o dado real pelo palpite e a gravada seguinte move o registro sem avisar; a guarda vai no EFEITO, nunca dentro da busca, senão ela lê o valor antigo do fecho quando `limparFormulario` zera o modo de edição
- ❌ Nunca conferir privilégio de função com `has_function_privilege('anon', …)` num arquivo de diagnóstico — ele ESTOURA se o papel não existir e derruba o arquivo inteiro; use `aclexplode` com `JOIN` em `pg_roles`, e trate `proacl IS NULL` como ABERTA A PUBLIC
- ❌ Nunca gravar arquivo com `open(caminho, "w")` em script de edição — ele TRUNCA antes de codificar, e um caractere que a codificação recusa deixa o arquivo com ZERO byte; monte o texto inteiro, chame `.encode('utf-8')` e só então abra em `"wb"`
- ❌ Nunca tornar clicável a linha de uma tabela sem cortar a propagação (`stopPropagation`) nas células que JÁ têm ação própria — a caixa de conferir e o botão do menu sobem o clique até a `<tr>`, e a ação pedida some sob a janela que abriu por cima; não quebra build, não acusa erro e só aparece no dedo de quem usa
- ❌ Nunca montar uma ficha de detalhe com os campos que a linha da lista já tem — a função do extrato devolve o recorte que serve para somar saldo, não o registro inteiro; busque por `id`, sob demanda, em vez de alargar o `RETURNS TABLE` e fazer toda a lista carregar o que quase ninguém abre
- ❌ Nunca editar **o próprio `CLAUDE.md`** (nem o `HISTORICO.md`) com script Python em modo texto — os dois são **CRLF**, e `open(...).read()` + `"\n".join(...)` reescreve as ~1.100 quebras de linha em silêncio: em 17/09/2026 isso transformou um diff de **84 linhas** em **1.349**, escondendo a alteração real. Antes de editar por script, **meça**: `python -c "print(b'\r\n' in open('CLAUDE.md','rb').read())"`. Em arquivo CRLF, use a ferramenta de edição ou leia/escreva em binário
- ❌ Nunca usar `String.replace(a, b)` com um texto `b` que contenha `$$` — numa STRING de substituição, `$$` do JavaScript significa **um cifrão literal**, e `DO $$` do PostgreSQL vira `DO $`, quebrando o bloco inteiro (medido em 18/09/2026: o psql acusou dez erros de sintaxe seguidos, nenhum deles apontando para a causa). Passe uma FUNÇÃO: `s.replace(a, () => b)` entrega o texto cru. Vale para `$&`, `$1` e `$\`` pelo mesmo motivo
- ❌ Nunca guardar em estado de componente aquilo que precisa sobreviver a um "VOLTAR" — o `router.back()` traz a página e **remonta o componente**, e o ano escolhido volta ao padrão; quem navegou até 2023 recomeça o caminho. O que descreve a TELA (ano, filtro ligado) mora na URL; o que é do momento (uma janela aberta) mora no estado
- ❌ Nunca navegar para um endereço lido da URL sem conferir que ele é interno — `?voltar=` é escrito por quem quiser, e um `//site.externo` levaria a pessoa para fora do sistema com um clique que parece inofensivo; exija `startsWith('/')` **e** `!startsWith('//')`
- ❌ Nunca esconder célula de relatório LINHA A LINHA quando existe uma linha de TOTAL — foi o erro da 2ª rodada de 18/09/2026: num mês em que só uma conta se mexeu, as outras ficavam em branco e **a soma do que se via deixava de bater com o total**, que continuava contando o dinheiro delas. Quem decide é a COLUNA: ou o mês inteiro aparece (todas as contas, inclusive as paradas), ou o mês inteiro sai zerado (contas e total) — nos dois casos a soma fecha. E o que se mostra no mês parado é `0,00`, nunca o vazio: coluna em branco parece tabela quebrada, coluna de zeros se lê como "não houve movimento"
- ❌ Nunca juntar linhas de uma grade pelo id da conta quando a mesma conta pode aparecer em dois blocos — a receita é dividida por `propriedade` do LANÇAMENTO, então "VENDA" existe em RECEITAS PRÓPRIAS **e** em RECEITAS DE TERCEIROS; o bloco tem de entrar na chave, senão uma das duas some levando os valores junto
- ❌ Nunca supor que um arquivo é LF porque a extensão dele "costuma ser" — **`financeiro_01_schema.sql`, `financeiro_00_reset.sql`, `teste_financeiro.sql` e `datas.test.ts` são CRLF**, e em 18/09/2026 um `head`+`cat`+`tail` e um `sed` do Git Bash os converteram para LF em silêncio: o diff do schema saiu com **2.885 linhas** onde a alteração real era de **611**. **MEÇA ANTES DE EDITAR POR SCRIPT, arquivo a arquivo**: `node -e "console.log(require('fs').readFileSync(process.argv[1]).includes(Buffer.from('\r\n')))" ARQUIVO`. E **confira depois**: `git diff --numstat` contra `git diff --numstat --ignore-cr-at-eol` — se os dois números não baterem, as quebras de linha foram reescritas
- ❌ Nunca capturar a saída de `pg_ctl start` num `spawnSync` — o SERVIDOR que ele deixa de pé HERDA o pipe, e o `spawnSync` só retorna quando o pipe fecha, ou seja, quando o banco morre; medido em 18/09/2026, o script ficou **quinze minutos parado com 0% de CPU e sem mensagem nenhuma**. Use `stdio: 'ignore'`: a saída do servidor já vai para o arquivo do `-l`
- ❌ Nunca tratar "o arquivo de prova não devolveu veredito nenhum" como aprovação — ou ele estourou antes do `SELECT` final, ou quem lê a saída está lendo errado (em 18/09/2026 o ensaio procurava `| OK |` num veredito que é a ÚLTIMA coluna e termina em `| OK`, sem barra); **"não sei" é vermelho**
- ❌ Nunca editar um `.html` de `_estudos/` sem MEDIR as quebras de linha dele antes — **eles não são todos iguais**: medido em 18/09/2026, só `engenharia-reversa-total-2026-09-16.html` e `modulo-financeiro-especificacao.html` são CRLF; os outros catorze são LF. Ler em modo texto sem `newline=''` um arquivo CRLF reescreve as ~2.400 quebras em silêncio, e o diff de uma alteração de quatro trechos vira 2.400 linhas. Esta regra já disse "eles são CRLF", o que era falso para a maioria — **a regra é medir, nunca supor**
- ❌ Nunca tratar `[]` e `NULL` como a mesma coisa num parâmetro de SELEÇÃO — `NULL` quer dizer "não estou escolhendo, leve tudo" e `[]` quer dizer "desmarquei tudo, não leve nada"; confundi-los faz o botão DESMARCAR TODOS apagar o mês inteiro, que é o contrário exato do que a pessoa pediu (vale no SQL, no serviço do Core e na tela — os três têm trava para isso)
- ❌ Nunca deixar um parâmetro que RESTRINGE uma operação destrutiva (uma lista de ids) SUBSTITUIR o filtro em vez de se somar a ele — os ids escolhem DENTRO da fronteira, nunca a dispensam; valendo sozinhos, uma chamada forjada apagaria qualquer registro da empresa, de qualquer data, driblando a conferência de período que a tela mostrou (trava 32 do `teste_financeiro.sql`)
- ❌ Nunca deixar a seleção por registro fora da identidade da simulação — marcar ou desmarcar uma caixa depois de conferir deixa o botão pedindo o número velho, exatamente como trocar a data deixaria; a seleção entra no `mesmoFiltro`, comparada sem depender da ordem
- ❌ Nunca listar registros para uma escolha destrutiva sem TETO explícito e sem avisar quando a lista foi cortada — o `pesquisar` do Core pagina (50 por padrão), e um período com 300 lançamentos mostraria 50: a pessoa marcaria as 50 achando que marcou o mês, e o número da conferência viria 300; ao bater no teto, RECUSE seguir em vez de trabalhar sobre um recorte em silêncio
- ❌ Nunca tornar a linha clicável numa tabela cuja linha já tem uma ação de sentido OPOSTO — na lixeira a linha oferece RESTAURAR e a caixa marca para APAGAR DE VEZ; linha que faz as duas coisas é receita de clique errado (na lista de exclusão, onde os dois gestos querem o mesmo, a linha inteira alterna e o `<input>` é `readOnly`, para o clique não contar duas vezes)
- ❌ Nunca escrever função que apague linhas de `audit_log` sem o filtro `tabela = '<prefixo>_...'` — sem ele, um WHERE errado leva a auditoria de `users`, de `tenants` e de todas as empresas; e lembre que apagar trilha é o ÚNICO ponto onde informação some de vez, então simule e mostre quantos registros deixarão de poder ser restaurados
- ❌ Nunca pôr o `BEGIN;` DEPOIS do porteiro que ele deveria proteger — o cliente que ignora erro imprime a recusa e **segue para a instrução seguinte**, que passa a ser o próprio `BEGIN;`: a transação abre DEPOIS do erro e o estrago acontece inteiro; medido em 17/09/2026 no `financeiro_00_reset.sql`, onde as 4 tabelas do módulo caíram com a trava fechada
- ❌ Nunca usar `CREATE TEMP TABLE` dentro de função `SECURITY DEFINER` — o PostgreSQL procura relações em `pg_temp` ANTES do `search_path` declarado, então quem chama pode criar uma tabela temporária com aquele nome na sessão dele e a função passa a trabalhar sobre ela; use variável (`uuid[]`, `jsonb[]` + `unnest`), que não existe fora da função
- ❌ Nunca dar `DEFAULT false` (ou nenhum default) ao parâmetro que decide se uma função destrutiva APAGA — o padrão tem de ser SIMULAR, para que esquecer o argumento seja inofensivo; o caminho seguro precisa ser o caminho preguiçoso
- ❌ Nunca deixar a tela contar quantos registros uma operação em massa vai atingir — quem conta tem de ser a MESMA função que executa, percorrendo o mesmo conjunto; com duas contagens, um dia a tela diz 137, o banco apaga 141, e o número da confirmação vira mentira
- ❌ Nunca liberar a confirmação de uma operação em massa sem comparar o FILTRO ATUAL com o filtro que gerou a simulação — conferir setembro (137) e trocar a data para janeiro deixaria o botão dizendo 137 sobre outro período; guarde o par `{filtro, relatório}` e invalide quando divergirem (`avaliarExclusao`, no Core, com teste)
- ❌ Nunca apagar parte de uma transferência num filtro por período — expanda o conjunto por `transferencia_id` ANTES de conferir fechamento e de apagar, e diga no relatório quantos registros saem de FORA do filtro pedido; meia transferência apagada inventa dinheiro na outra conta, para sempre
- ❌ Nunca ler `audit_log` numa função de módulo sem os quatro filtros juntos (`fin_pode`, `tabela`, `operacao` e `dados_antes->>'tenant_id'`) — ela é da plataforma, só o Desenvolvedor a lê por RLS, e `SECURITY DEFINER` desliga a RLS lá dentro; sem o filtro de empresa, um Proprietário leria as exclusões de todas as empresas do sistema
- ❌ Nunca escrever `WHERE tenant_id = …` ao consultar `audit_log` — **essa coluna não existe**; a empresa mora dentro do jsonb, em `dados_antes->>'tenant_id'`
- ❌ Nunca contar objetos "de tudo que há no schema `public`" num arquivo de diagnóstico da plataforma — com um módulo instalado, as 4 contagens do `inventario.sql` davam DIVERGE e as 24 funções do módulo apareciam como "SOBRANDO" (medido em 17/09/2026); a plataforma conta **as próprias peças, pelo nome**, e quando precisar ignorar as de módulo deduz o prefixo de `platform_modules.funcao_limpeza`, nunca escrevendo o nome de um módulo
- ❌ Nunca confiar só na CONTAGEM de funções para provar que um schema foi aplicado — contar pega a que sumiu e a que sobrou, não a que MUDOU DE FORMA; a conferência de ASSINATURA (linha 17 do `inventario_financeiro.sql`) é o que pega parâmetro trocado sem alterar o total
- ❌ Nunca acrescentar função a um módulo sem acrescentá-la ao `<modulo>_00_reset.sql` no MESMO commit — as duas de importação ficaram de fora desde 13/09/2026 e só apareceram em 17/09, ao ENSAIAR o reset num banco de verdade: ele dizia "pronto" deixando duas funções vivas
- ❌ Nunca confiar num porteiro SQL sem envolver o arquivo inteiro em `BEGIN;` … `COMMIT;` — medido em 17/09/2026: o `psql -f` **sem** `ON_ERROR_STOP` imprime a recusa do porteiro e **segue para a instrução seguinte**, derrubando tudo com o aviso já rolado para fora da tela; o SQL Editor do Supabase aborta sozinho (manda o arquivo como lote único, que o PostgreSQL embrulha em transação implícita), mas um porteiro que só protege num cliente é meio porteiro
- ❌ Nunca detectar "há módulo instalado" num arquivo da plataforma procurando o NOME de uma tabela de módulo (`to_regclass('public.fin_…')`) — seria uma quarta solda clandestina e ficaria cega para o segundo módulo; procure **o dano**: chave estrangeira de tabela que não é da plataforma apontando para tabela que o script vai derrubar, mais linha sobrando em `platform_modules`
- ❌ Nunca escrever num documento um número que foi contado à mão sem, na mesma linha, o comando que o recalcula — em 17/09/2026 três números estavam errados ao mesmo tempo (CLAUDE.md dizia 25 funções onde há 27; `LEIA-ME-ORDEM.md` dizia "os 8 arquivos" listando 10; o README do ambiente local dizia "14 linhas, todas PASSOU" onde o teste tem 16) e nenhum deles quebra nada — eles só ensinam o errado
- ❌ Nunca supor que o `npm run modulos:verificar` entende comentário de várias linhas — o `ehComentario` dele é **linha a linha** (`scripts/verificar-modulos.mjs`), então a linha de continuação de um `{/* … */}` que não começa com `//`, `*` ou `--` é acusada como código; é falso positivo, mas a correção certa é tirar o nome do módulo do comentário, nunca relaxar o verificador
- ❌ Nunca somar SALDOS de meses diferentes — saldo é acumulado, e a soma de doze saldos finais é a soma de doze fotografias do MESMO dinheiro (como somar o peso de uma pessoa medido em doze meses e dizer que ela pesa 280 kg); o número do ano é a coluna de DEZEMBRO. Valor de FLUXO (o que passou no mês) se soma; valor ACUMULADO não
- ❌ Nunca chamar de "saldo" um número de conta IDENTIFICADORA — ela não tem `saldo_abertura_centavos` no banco: ela explica dinheiro, não guarda; a coluna da conferência dela chama-se **ACUMULADO**, começa em zero e não tem linha de "SALDO INICIAL"
- ❌ Nunca esconder cadastro DESATIVADO de um RELATÓRIO de saldos — a RN-06 manda o inativo sumir das listas de LANÇAMENTO, e está certa; num relatório, encerrar uma conta com dinheiro dentro faria o TOTAL encolher em silêncio (marque como INATIVA e mostre)
- ❌ Nunca deixar a TELA somar as linhas de total de um dashboard — elas vêm do banco junto com as linhas das contas, marcadas por `linha_tipo`, exatamente como o `fin_extrato` já faz; com duas contas do mesmo número, um dia a tela e o papel divergem
- ❌ Nunca fazer import de RUNTIME num arquivo do Core que tenha teste — o `node --test` não resolve caminho sem extensão (`ERR_MODULE_NOT_FOUND`) e o `.ts` explícito quebra o `next build` (TS5097, `allowImportingTsExtensions` desligado); o que vier de fora entra por PARÂMETRO
- ❌ Nunca copiar parâmetro de URL para dentro do estado com `useEffect` — além de o ESLint recusar (`react-hooks/set-state-in-effect`), a cópia desfaz na renderização seguinte o que a pessoa acabou de digitar; o estado nasce `null` e o valor em uso é `estado ?? o que veio na URL`
- ❌ Nunca escrever curinga de caminho terminado em asterisco-barra dentro de comentário de bloco — esse par FECHA o comentário, o resto do texto vira código, e o erro de sintaxe aparece dezenas de linhas depois da causa
- ❌ Nunca usar `shell: true` no `spawnSync` com caminho ABSOLUTO no Windows — "C:\Program Files\..." quebra no espaço e o processo tenta rodar "C:\Program"; o `shell` só é necessário para comando de nome curto (`npm`, que lá é um `.cmd`)
- ❌ Nunca mandar tabela de 13 ou 14 colunas para A4 em RETRATO — sobram 1,20 cm por coluna e "27.650,00" não cabe; use o campo `orientacao: "paisagem"` do `prepararImpressao.ts` (ausente = retrato, como sempre foi)
- ❌ Nunca implementar "este usuário vê menos" filtrando na TELA — o valor viaja até o navegador e se lê com a tecla F12, na aba de rede, em texto puro; **esconder numa tela é conforto, não enviar é segurança**. No modo percentual do DINHEIRO DO PERÍODO quem decide é `fin_dinheiro_do_periodo`, que devolve os valores em NULO (trava 46)
- ❌ Nunca prometer sigilo que outra permissão desfaz — o modo percentual não esconde nada de quem tem `extrato_ver`, `lc_ver_todos`, `imprimir`, `orc_ver` ou `cm_ver` (a lista está em `PERMISSOES_QUE_REVELAM_VALOR`); a tela de CONFIGURAÇÕES **avisa** dizendo quais, e oferece retirá-las — avisar, e não bloquear, porque decidir pelo dono da empresa seria errado
- ❌ Nunca guardar competência ("MÊS – ANO") como texto nem como dois inteiros — texto não ordena (`01/2027` viria antes de `09/2026`) e dois inteiros obrigam todo filtro de intervalo a um `OR`; use `date` travada no dia 1, com `CHECK (EXTRACT(DAY FROM competencia) = 1)` — sem o CHECK o banco passa a ter DUAS "SETEMBRO / 2026" e a tela mostra o mesmo mês duas vezes
- ❌ Nunca deixar o relatório de orçamento mostrar só as contas ORÇADAS — a conta em que se gastou e não se orçou some da tela, e é justamente o gasto que ninguém planejou; o bloco `FORA` existe para isso
- ❌ Nunca criar uma permissão cujo efeito seja VER MENOS — ela ficaria invertida ("ter" = "ver menos") e um dia alguém marca a caixa achando que está dando acesso; modo de exibição e lista de itens visíveis são CONFIGURAÇÃO, e moram em campos próprios do `module_configs`, não no array de permissões
- ❌ Nunca deixar uma função de banco receber o id de um registro sem receber TAMBÉM a empresa e conferir quem está chamando — a `fin_proxima_ordem` passou onze dias assim (pedia conta e data, tinha GRANT para `authenticated`) e devolvia a contagem de lançamentos de qualquer conta de qualquer empresa a qualquer pessoa logada; e **filtrar por empresa não basta**, porque quem chama informa a empresa: é a checagem de PERMISSÃO (`fin_pode`) que pergunta se quem chama é de lá
- ❌ Nunca escolher a permissão de uma função de apoio pela tela que a chamou primeiro — a sugestão de ordem serve ao NOVO LANÇAMENTO (`lc_criar`) e à TRANSFERÊNCIA (`transferencia`); exigir só a primeira deixaria o campo vazio, sem explicação, para quem só transfere
- ❌ Nunca deixar uma frase de tela afirmar que uma ação é irreversível sem reconferir se ainda é — "ESTA AÇÃO NÃO PODE SER DESFEITA" ficou dois dias na PESQUISAR depois de a LIXEIRA nascer, ensinando o contrário do que o sistema faz; e é pior do que não avisar, porque quem lê aquilo não vai procurar o que acha perdido
- ❌ Nunca prometer numa tela um caminho que a permissão de quem está lendo não abre — "dá para restaurar em CONFIGURAÇÕES" é falso para quem não tem `lc_excluir_lote`; para esse, a verdade é dizer que EXISTE o registro e a quem pedir (o Core decide em `recadoDeExclusao`, com teste)
- ❌ Nunca escrever na tela um número que o banco usa como PADRÃO ("os últimos 30 dias") sem oferecer a escolha — a função aceitava o período desde o começo, só a tela nunca passava; quem excluiu algo há 45 dias abria a lixeira, não encontrava e concluía que tinha sumido de vez
- ❌ Nunca ler "o gatilho de auditoria não cobre INSERT" como "não dá para mostrar o primeiro registro" — o primeiro fechamento não está na auditoria **porque ainda está vivo na tabela**; a resposta é unir as duas fontes (linha viva + trilha), nunca mexer no gatilho da plataforma a pedido de um módulo
- ❌ Nunca decidir a cor ou o estilo de uma linha comparando o TEXTO que veio do banco — `e.operacao.startsWith('EXCLUIU')` funciona até alguém reescrever a frase; quem decide é um campo de dado (`em_vigor`), que não muda quando a redação muda
- ❌ Nunca criar arquivo com múltiplas responsabilidades distintas
- ❌ Nunca misturar lógica de plataforma com módulo, nem módulo com módulo
- ❌ Nunca usar `toISOString()` para datas que precisam respeitar UTC-3
- ❌ Nunca criar strings de eventos de telemetria avulsas — usar `ANALYTICS_EVENTS` do Core
- ❌ Nunca reintroduzir SDK de serviço externo (analytics, e-mail, anti-bot) sem passar pelo Core
- ❌ Nunca colocar chave de API ou segredo de terceiro no código — usar variável de ambiente
  (exceção consciente: a credencial do Painel de Engenharia, documentada acima)
- ❌ Nunca gravar `users.country` como `NULL` — a coluna é `NOT NULL` e o padrão é `'BRASIL'`
- ❌ Nunca gravar `users.auth_provider` como `NULL` — é `NOT NULL` e o padrão é `'email'`
- ❌ Nunca rotear `login-owner` nem `login-dependent` para o `LoginFormsView` — os dois entram só por Google; o formulário de senha ficou para o Desenvolvedor
- ❌ Nunca detectar o provedor consultando `auth.identities` dentro do gatilho `on_auth_user_created` — a identidade ainda não existe naquele instante; usar `raw_app_meta_data->>'provider'`
- ❌ Nunca criar perfil em `public.users` por `upsert` do cliente anon — não há policy de INSERT; usar a função `SECURITY DEFINER` `ensure_google_user_profile`
- ❌ Nunca usar `@supabase/auth-helpers-nextjs` — descontinuado e ausente do projeto; o padrão aqui é `@supabase/ssr`
- ❌ Nunca fazer logout chamando só `authService.signOut()` no admin-web — a sessão também vive nos cookies HTTP; usar `encerrarSessao()` de `src/lib/logout.ts`
- ❌ Nunca escrever uma função `SECURITY DEFINER` que age sobre um id recebido por parâmetro sem compará-lo com `auth.uid()` — o RLS não protege dentro de `SECURITY DEFINER`
- ❌ Nunca renderizar `COUNTRIES`/`BRAZIL_STATES` como string em `<option>` — são `{ label, value }[]`; usar o `SearchableSelect`
- ❌ Nunca chamar `.from('public.users')` no PostgREST — o nome da tabela é `users`; com o prefixo dá 404
- ❌ Nunca resolver tenantId via `.single()` em `tenant_members` — o usuário pode ter múltiplos vínculos; passe o tenant como prop/parâmetro explícito
- ❌ Nunca reutilizar o cliente Supabase após erro de constraint para executar rollback — criar novo cliente
- ❌ Nunca usar `supabase` (anon client) em serviços chamados por Server Actions — usar `supabaseAdmin`
- ❌ Nunca usar `GROUP BY` + `ORDER BY coluna_não_agrupada` via CTE em funções PostgreSQL — usar subquery correlacionada
- ❌ Nunca usar `document.addEventListener('mousedown', fechar)` para fechar dropdowns inline — usar `'click'` para não bloquear o evento do botão
- ❌ Nunca espalhar o objeto do formulário (`...item`) no payload de inserção — mapear explicitamente apenas as colunas que existem na tabela
- ❌ Nunca importar `react-native-gesture-handler` por `import` estático no mobile — o módulo é avaliado em todo ambiente e mata o Expo Go no arranque; usar `carregarGestos()` de `src/lib/gestureRuntime.ts`
- ❌ Nunca detectar Expo Go por `Constants.executionEnvironment` — `storeClient` também cobre development builds; sondar o módulo nativo com `TurboModuleRegistry.get`
- ❌ Nunca guardar um canal Realtime numa variável local de `useEffect` quando outro efeito precisa encerrá-lo — cada efeito ficaria com a sua cópia; usar `useRef`
- ❌ Nunca derrubar o canal Realtime em `AppState === 'inactive'` — o iOS passa por esse estado a cada gesto trivial; só `background` significa que o usuário foi embora
- ❌ Nunca contar com `onAuthStateChange` para remontar algo ao voltar do background — ele reage a login/logout/refresh, não ao ciclo de vida do app
- ❌ Nunca aplicar um estilo de `useAnimatedStyle` num `View` comum — só os componentes do Reanimated o entendem, e num `View` cru ele falha em silêncio
- ❌ Nunca usar `ActionSheetAndroid` — o símbolo não existe no React Native; no Android o menu do sistema é o `AlertDialog`, aberto por `Alert.alert`
- ❌ Nunca passar mais de 3 ações a um menu nativo no Android — o `AlertDialog` só tem três papéis de botão e as excedentes somem
- ❌ Nunca instalar `@react-navigation/bottom-tabs` neste projeto — o expo-router já traz o navegador embutido; instalar duplica a cópia no bundle
- ❌ Nunca passar `component` a um `<Stack.Screen>` do expo-router — ali as telas vêm dos arquivos de `app/`, e a prop é ignorada
- ❌ Nunca fixar `userInterfaceStyle` no `ActionSheetIOS` — omitir faz o menu seguir a aparência do sistema, que é o comportamento nativo
- ❌ Nunca importar um ícone direto de `lucide-react-native` numa tela — usar o registro de `src/components/icon/Icon.tsx`; a v1 renomeou o catálogo e o nome antigo devolve `undefined` sem acusar erro de build
- ❌ Nunca usar `import * as Lucide from 'lucide-react-native'` — o curinga arrasta o catálogo inteiro para o bundle
- ❌ Nunca escrever `fontSize`/`fontWeight` solto num `StyleSheet` de tela — usar `TIPOGRAFIA` de `src/constants/Typography.ts`
- ❌ Nunca escrever margem ou recheio fora da grade de 8pt — usar `ESPACO` de `src/constants/Spacing.ts`
- ❌ Nunca temar um componente do mobile passando `backgroundColor` pelo `style` — cor de texto não se herda em React Native; usar a prop `escuro`
- ❌ Nunca pôr uma tela que não é aba dentro de `app/(tabs)/` — o `NativeTabs` monta um gatilho por rota do grupo e ela vira aba
- ❌ Nunca espalhar tipografia em `authStyles.campo` — o `SearchableSelect` o aplica num `Pressable`, e `TextStyle` não é atribuível a `ViewStyle`
- ❌ Nunca contornar rota nova com `as Href` no `router.push` — `.expo/types/router.d.ts` é gerado; rodar `npx expo start` uma vez
- ❌ Nunca cadastrar a URI do app (`exp://…`, `plataformajairo://…`) no Google Cloud Console — quem se apresenta ao Google é o Supabase, com `https://<ref>.supabase.co/auth/v1/callback`; a URI do app vai na lista de Redirect URLs do **Supabase**
- ❌ Nunca tentar fazer o login Google do mobile funcionar no Expo Go — o GoTrue rejeita o esquema `exp://` (literal e curinga, ambos testados); use development build, onde o endereço é `plataformajairo://auth/google`
- ❌ Nunca interpretar "o navegador parou numa página estranha" como falha do app — quando o `redirect_to` não casa com a lista do Supabase, o GoTrue cai **silenciosamente** na Site URL, sem erro nenhum
- ❌ Nunca chamar `tenantService` ou `settingsService.updateGlobalSettings` direto do mobile — usam `supabaseAdmin`; no aparelho a porta é o `adminApiService`, que fala com `/api/admin/*`
- ❌ Nunca deixar `EXPO_PUBLIC_API_URL` em `localhost` para uso em aparelho — `localhost` no telemóvel é o telemóvel; use o IP da máquina na rede ou a URL publicada
- ❌ Nunca dar valor padrão à URL base de operações que ESCREVEM no banco — um host chutado grava noutra implantação em silêncio
- ❌ Nunca esperar `<input type="color">` no React Native — ele não existe; use campo hexadecimal com amostra, e só pinte a amostra com hexadecimal válido
- ❌ Nunca tratar "remover empresa" como exclusão — é `is_active = false`, e o histórico com "Reabilitar" depende disso
- ❌ Nunca ler o deep link do OAuth com `Linking.useURL()` numa rota de callback — com o app já aberto ele devolve `null` para sempre (o evento `url` disparou antes de a tela montar); espere a SESSÃO pelo supabase-js
- ❌ Nunca confiar só no `WebBrowser.openAuthSessionAsync` para receber o retorno do OAuth no mobile — o Expo Router escuta o mesmo deep link, e sem a rota `app/auth/google.tsx` o app cai em "Endereço não encontrado" (`+not-found`)
- ❌ Nunca criar chave estrangeira SIMPLES de tabela de módulo para outra tabela de módulo — a chave é composta `(tenant_id, id)`, senão um registro de uma empresa aponta para o cadastro de outra (RN-29)
- ❌ Nunca calar `react-hooks/set-state-in-effect` com `eslint-disable` — mover a busca para uma função `async` dentro do efeito e só mudar o estado depois do `await`
- ❌ Nunca passar dados para a guia de impressão por `sessionStorage` (é por aba) nem pela URL (estoura o tamanho) — usar a chave temporária do `localStorage`, apagada na leitura
- ❌ Nunca escrever "Página 1" num rodapé de impressão — o CSS não conhece o número da página fora das caixas de margem do `@page`, que nenhum navegador implementa; quem numera é o diálogo do navegador
- ❌ Nunca supor o tipo de retorno de um agregado no PostgreSQL — `SUM(bigint)` devolve `numeric`, e a função só compila com o `::bigint` explícito
- ❌ Nunca pôr `ORDER BY` com expressão depois de um `UNION` — mover a ordenação para dentro de uma CTE, com uma coluna que marque o bloco
- ❌ Nunca concluir que o OAuth do mobile está configurado porque o da web funciona — popup usa "Origens JavaScript autorizadas", redirecionamento usa "URIs de redirecionamento"; são metades independentes do mesmo OAuth client

---

## Pulos do Gato — Lições Aprendidas

Estas lições nasceram durante o desenvolvimento dos módulos que já foram removidos, mas o
aprendizado é genérico (Supabase, PostgreSQL, React) e continua valendo para a plataforma.
Os exemplos foram reescritos com nomes de tabela neutros.

---

### 1. supabaseAdmin obrigatório para serviços chamados por Server Actions

**Problema:** Serviços do `@jairo/core` que usam o cliente `supabase` (anon) falham com erro de RLS
quando chamados a partir de Server Actions. Em contexto servidor, o cliente anon não tem acesso aos
cookies do browser, logo `auth.uid()` retorna NULL, e qualquer política RLS que dependa de
`auth.uid()` bloqueia a operação com:
`"new row violates row-level security policy for table '...'"`

**Solução:** Todo serviço chamado por Server Actions deve usar `supabaseAdmin` em vez de `supabase`.
A segurança é garantida pela validação de sessão no nível da action, não pelo RLS.

```typescript
// ❌ ERRADO para serviços chamados por Server Actions:
import { supabase } from '../../lib/supabase';
await supabase.from('minha_tabela').insert(...)

// ✅ CORRETO:
import { supabaseAdmin } from '../../lib/supabase';
await supabaseAdmin!.from('minha_tabela').insert(...)
```

---

### 2. GROUP BY via CTE bloqueia ORDER BY coluna não agrupada no PostgreSQL

**Problema:** Quando uma função PostgreSQL usa um CTE (`WITH ... AS (SELECT ...)`) e depois faz
`GROUP BY` no alias do CTE, o banco NÃO reconhece dependências funcionais pelo primary key.
`ORDER BY p.created_at` falha com:
`"column must appear in the GROUP BY clause or be used in an aggregate function"`
mesmo que `p.id` (primary key) esteja no GROUP BY.

**Solução:** Usar subquery correlacionada para agregar os filhos em vez de LEFT JOIN + GROUP BY.
É mais legível, resolve o problema de escopo e não exige GROUP BY.

```sql
-- ❌ ERRADO (GROUP BY via CTE — ORDER BY created_at falha):
WITH pais_filtrados AS (SELECT p.* FROM pai p WHERE ...)
SELECT p.id, jsonb_agg(f.*) FROM pais_filtrados p
LEFT JOIN filho f ON f.pai_id = p.id
GROUP BY p.id, p.data, ...
ORDER BY p.data DESC, p.created_at DESC;  -- ← ERRO

-- ✅ CORRETO (subquery correlacionada):
SELECT p.id, p.created_at,
  COALESCE((SELECT jsonb_agg(...) FROM filho f WHERE f.pai_id = p.id), '[]')
FROM pai p WHERE ...
ORDER BY p.data DESC, p.created_at DESC;  -- ← FUNCIONA
```

---

### 3. mousedown vs click no fechamento de dropdowns flutuantes

**Problema:** Usar `document.addEventListener('mousedown', fechar)` para fechar dropdowns causa
falha silenciosa nos botões de ação dentro do dropdown. O `mousedown` dispara ANTES do React
processar qualquer evento. A sequência é:
1. Usuário clica em EDITAR dentro do dropdown
2. `mousedown` no documento → `fechar()` → `menuAberto = null` (estado agendado)
3. React re-renderiza → dropdown desmonta (botão EDITAR some)
4. `click` tenta disparar no botão que já foi desmontado → nada acontece

**Solução:** Usar `'click'` em vez de `'mousedown'`. Com `click`, o React processa o `onClick` do
botão interno antes do evento subir ao documento, garantindo que a ação execute antes do fechamento.
O `stopPropagation` também deve ser no `onClick` (não `onMouseDown`) do container do dropdown.

```typescript
// ❌ ERRADO — fecha antes de executar a ação:
document.addEventListener('mousedown', fechar);
// no container: onMouseDown={(e) => e.stopPropagation()}

// ✅ CORRETO — executa a ação antes de fechar:
document.addEventListener('click', fechar);
// no container: onClick={(e) => e.stopPropagation()}
```

---

### 4. position:fixed para dropdowns dentro de containers overflow

**Problema:** Dropdowns com `position: absolute` dentro de modais com `overflow-y: auto` são
clipados (cortados) pelo container scroll. O menu some atrás do modal.

**Solução:** Usar `position: fixed` com coordenadas calculadas via `getBoundingClientRect()` no
momento do clique. O menu flutua sobre tudo, independente de overflow.

```typescript
// No onClick do botão que abre o menu — DETECTAR ESPAÇO DISPONÍVEL:
const rect = e.currentTarget.getBoundingClientRect();
const ALTURA_MENU = 106; // aprox. 3 itens de 35px
const espacoAbaixo = window.innerHeight - rect.bottom;
setMenuPos({
  top: espacoAbaixo < ALTURA_MENU + 8
    ? rect.top - ALTURA_MENU - 4   // abre para CIMA (evita esconder atrás da taskbar)
    : rect.bottom + 4,             // abre para BAIXO (padrão)
  right: window.innerWidth - rect.right,
});
```

---

### 5. Árvore hierárquica com MAX (não COUNT) para numeração permanente

**Problema:** Usar `COUNT(filhos)` para gerar o próximo número hierárquico causa colisão após
exclusões. Se "1.1" é excluído, o próximo filho vira "1.1" novamente — conflito com registros
históricos que referenciavam o número antigo.

**Solução:** Usar `MAX(último segmento numérico dos filhos existentes) + 1`. O número é imutável
após atribuído. Exclusões não reordenam os irmãos.

```typescript
// ❌ ERRADO — colisão após exclusão:
const proximo = filhosExistentes.length + 1;

// ✅ CORRETO — preserva numeração mesmo após exclusões:
const segmentos = filhos.map(f => parseInt(f.nivel_numerico.split('.').pop() || '0'));
const proximo = Math.max(0, ...segmentos) + 1;
```

---

### 6. Mapeamento explícito de colunas ao inserir (nunca espalhar o objeto do formulário)

**Problema:** Espalhar o objeto do formulário no payload de inserção (`...item`) leva TODOS
os campos do estado do frontend para o banco, incluindo campos auxiliares de UI como
`*_label`, que não existem na tabela. O Supabase retorna:
`"Could not find the 'xxx_label' column of 'minha_tabela' in the schema cache"`

**Solução:** Mapear explicitamente apenas as colunas que existem no banco:

```typescript
// ❌ ERRADO — espalha campos de label do frontend:
const payload = itens.map(item => ({ ...item, tenant_id, pai_id }));

// ✅ CORRETO — apenas colunas reais do banco:
const payload = itens.map(item => ({
  tenant_id,
  pai_id,
  descricao: item.descricao,
  quantidade: item.quantidade,
  valor_unitario: item.valor_unitario,
  valor_total: item.valor_total,
}));
```

---

### 7. isTypingRef — evitar cursor saltando para o final em inputs controlados

**Problema:** Em inputs controlados com `type="text"` que formatam o valor (ex: números
em formato BRL), um `useEffect([valorExterno])` que atualiza o estado local de string
dispara a cada tecla pressionada (porque o pai atualiza o estado ao receber o novo valor),
resetando o cursor para o final do input.

**Solução:** Usar um `useRef` como flag para ignorar o `useEffect` quando a mudança
veio do próprio usuário:

```typescript
const montadoRef = useRef(false);
const isTypingRef = useRef(false);

const handleChange = (e) => {
  isTypingRef.current = true;      // sinaliza: mudança veio do usuário
  setInputStr(e.target.value);
  onValorChange(parse(e.target.value));
};

useEffect(() => {
  if (!montadoRef.current) { montadoRef.current = true; return; }
  if (isTypingRef.current) { isTypingRef.current = false; return; } // ignora
  setInputStr(formatar(valorExterno)); // só atualiza se veio de fora
}, [valorExterno]);
```

---

### 8. Dropdown que abre para cima quando próximo à borda inferior

**Problema:** Dropdown com `position: fixed` e `top: rect.bottom + 4` fica escondido
atrás da barra de tarefas do sistema quando o botão está próximo da borda inferior.

**Solução:** Verificar o espaço disponível antes de posicionar:

```typescript
const ALTURA_MENU = 106; // aprox. 3 botões × 35px
const espacoAbaixo = window.innerHeight - rect.bottom;
setPos({
  top: espacoAbaixo < ALTURA_MENU + 8
    ? rect.top - ALTURA_MENU - 4  // abre para cima
    : rect.bottom + 4,            // abre para baixo (padrão)
  right: window.innerWidth - rect.right,
});
```

---

### 9. `redirect_uri_mismatch` num OAuth intermediado aponta para o INTERMEDIÁRIO, não para o seu app

**Problema:** no OAuth conduzido pelo Supabase (`signInWithOAuth`), o `redirectTo` que o app
informa **não é** o `redirect_uri` que chega ao Google. São dois saltos:

```
app ──(redirectTo: plataformajairo://…)──►  Supabase  ──(redirect_uri: https://<ref>.supabase.co/auth/v1/callback)──►  Google
                                                ◄── volta aqui primeiro ──┘
     ◄──(só agora o deep link é usado)──────────┘
```

Ler o `Erro 400: redirect_uri_mismatch` como "a URI do app está errada" leva a cadastrar
`exp://`, `localhost` e IP privado no Google Console — valores que o Google **nunca compara**
e que ele ainda recusa por formato. O erro estava dizendo outra coisa: falta o callback do
**intermediário** na lista.

**Solução:** cadastrar cada endereço no painel de quem o consome.

```
Google Cloud Console › URIs de redirecionamento  →  https://<ref>.supabase.co/auth/v1/callback
Supabase › URL Configuration › Redirect URLs     →  plataformajairo://auth/google
```

⚠️ **A igualdade é exata, query string incluída.** O cadastro deste projeto tinha
`…/auth/v1/callback?provider=google`; o Supabase envia sem a query. Um caractere a mais e o
Google recusa. E o `?provider=google` é a confusão natural: é o parâmetro do *endpoint do
Supabase*, não do cadastro no Google.

**Generalizando:** vale para qualquer OAuth com intermediário (Supabase, Auth0, Firebase,
Clerk). O provedor de identidade só conhece o intermediário; o seu deep link é assunto entre
você e o intermediário. **Pergunte sempre "quem faz a chamada ao Google?"** — o `redirect_uri`
pertence a quem faz a chamada, não a quem recebe o usuário no fim.

**Armadilha de diagnóstico associada:** o caminho do popup (`signInWithIdToken`, usado pela
web) não passa por redirect URI nenhum. Um login web saudável **não é evidência** de que o
OAuth client está configurado para o mobile — é a mesma credencial exercitada por outra
metade. Ver `apps/mobile-app/src/lib/oauthDiagnostics.ts`, que imprime os dois endereços
lado a lado no Metro.
