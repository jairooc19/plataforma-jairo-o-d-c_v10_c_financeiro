# Plataforma Jairo O D C — v10

Monorepo npm workspaces com dashboard web, app mobile e um núcleo de lógica compartilhada.

| Pacote | O que é | Stack |
|---|---|---|
| `apps/admin-web` | Dashboard administrativo | Next.js 16.2.2 · React 19.1.0 · Tailwind 4 |
| `apps/mobile-app` | Aplicativo mobile | Expo ~54 · React Native 0.81.5 · Expo Router 6 |
| `packages/core` | `@jairo/core` — cérebro único (serviços, tipos, telemetria) | TypeScript estrito |
| `supabase/` | Criação do banco (PostgreSQL + RLS) | Supabase |

> `packages/core` é consumido como TypeScript cru — não tem build. O web usa
> `transpilePackages: ["@jairo/core"]`; o mobile resolve via `metro.config.js`.

---

## Começando

```bash
npm install     # na raiz — instala todos os workspaces
npm run web     # sobe o admin-web em http://localhost:3000
```

Variáveis de ambiente: copie os modelos versionados.

```bash
cp apps/admin-web/.env.example  apps/admin-web/.env.local
cp apps/mobile-app/.env.example apps/mobile-app/.env
```

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | admin-web | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | admin-web | |
| `SUPABASE_SERVICE_ROLE_KEY` | admin-web | **nunca** exposta no navegador |
| `EXPO_PUBLIC_API_URL` | ambos | URL base das API Routes |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile-app | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile-app | |

---

## Banco de Dados — `supabase/criar-bd/`

Esta plataforma faz **wipe + rebuild**: o banco é derrubado e recriado do zero, não
evoluído por migrations incrementais. Por isso a pasta se chama `criar-bd/` e não
`migrations/`.

```
supabase/criar-bd/
├── plataforma_00_reset.sql    O Demolidor  — TRUNCATE auth.users/identities + DROP de todo o CORE
├── plataforma_01_schema.sql   O Construtor — schema consolidado v10 (extensões, tabelas, RLS,
│                                             funções, policies, triggers, constraints)
└── plataforma_02_seed.sql     O Hidratador — dados iniciais obrigatórios (global_settings id=1)
```

### Como criar o banco

Abra o **SQL Editor** do Supabase e cole cada arquivo inteiro, **nesta ordem**:

```
1) plataforma_00_reset.sql    ⚠️ DESTRUTIVO — apaga todos os usuários. Só em dev/teste.
2) plataforma_01_schema.sql
3) plataforma_02_seed.sql
```

Em um projeto Supabase novo e vazio você pode **pular o `00`**: o `plataforma_01_schema.sql` já cria
tudo do zero. Rode o `00` apenas para demolir um banco que já tem estrutura.

O que o `plataforma_01_schema.sql` cria:

| Objeto | Qtde |
|---|---|
| Extensões (`uuid-ossp`, `unaccent`) | 2 |
| Tabelas (`users`, `global_settings`, `tenants`, `tenant_members`) | 4 |
| `ENABLE ROW LEVEL SECURITY` | 4 |
| Funções PL/pgSQL | 6 |
| Policies RLS | 12 |
| Triggers em `auth.users` | 2 |

A ordem interna das seções do `plataforma_01_schema.sql` **não pode ser reordenada**: as funções
precisam existir antes das policies que as chamam, e o trigger `BEFORE INSERT`
(auto-confirmação de e-mail) precisa vir antes do `AFTER INSERT` (criação do perfil).

### ⚠️ O Supabase CLI não usa `criar-bd/`

`supabase db reset` procura por `supabase/migrations/`, que não existe mais neste projeto.
O comando roda **sem aplicar schema nenhum**. A criação do banco é manual, pelo SQL Editor,
conforme acima.

O `config.toml` aponta `db.seed.sql_paths` para `./criar-bd/plataforma_02_seed.sql`, então o seed é
a única parte que o CLI consegue aplicar sozinho.

### Migrations de verdade (v10+)

Se um dia o banco precisar evoluir sem ser derrubado, crie `supabase/migrations/` **ao
lado** de `criar-bd/`. A separação fica explícita: `criar-bd/` reconstrói do zero,
`migrations/` evolui um banco em produção.

---

## Comandos

**Raiz:**
```bash
npm install     # instala todos os workspaces
npm run web     # atalho para o dev do admin-web
```

**`apps/admin-web`:**
```bash
npm run dev     # servidor de desenvolvimento
npm run build   # build de produção
npm run lint    # ESLint 9
```

**`apps/mobile-app`:**
```bash
npm run start   # servidor Expo
npm run android
npm run ios
```

Não há scripts de teste em nenhum pacote.

> O `package.json` da raiz declara `core:build`, que aponta para um alvo inexistente no
> `@jairo/core`. Ele falha ao ser executado e não deve ser usado — o core não precisa de build.

---

## Arquitetura em uma frase

Toda lógica de negócio nasce em `packages/core`, é exportada por `src/index.ts` e consumida
pelos apps. Nunca escreva validação, chamada ao Supabase ou evento de telemetria direto no
`admin-web` ou no `mobile-app`.

Regras completas, convenções obrigatórias e lições aprendidas: **[`CLAUDE.md`](./CLAUDE.md)**.
Detalhes de rotas e middleware do Next.js 16: `apps/admin-web/AGENTS.md`.

---

## Versões

Controladas em `packages/core/src/constants/versions.ts` — altere **apenas** esse arquivo.

```
WEB_VERSION = "v10 - 2026-09-11-01"
APP_VERSION = "v10 - 2026-09-11-02"
```
