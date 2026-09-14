# Plataforma Jairo O D C — v10

Monorepo npm workspaces com dashboard web, app mobile e um núcleo de lógica compartilhada.

| Pacote | O que é | Stack (conferida nos `package.json`) |
|---|---|---|
| `apps/admin-web` | Dashboard administrativo | Next.js 16.2.2 · React 19.2.3 · Tailwind 4 |
| `apps/mobile-app` | Aplicativo mobile | Expo ~57.0.20 · React Native 0.86.3 · Expo Router ~57.0.19 |
| `packages/core` | `@jairo/core` — cérebro único (serviços, tipos, dinheiro, datas, telemetria) | TypeScript estrito |
| `supabase/` | Criação do banco, testes de acesso e migrations futuras | PostgreSQL 17 + RLS |

> `packages/core` é consumido como TypeScript cru — não tem build. O web usa
> `transpilePackages: ["@jairo/core"]`; o mobile resolve via `metro.config.js`.

---

## Começando

```bash
npm install     # na raiz — instala todos os workspaces
npm run web     # sobe o admin-web em http://localhost:3000
npm test        # testes do núcleo (dinheiro e datas), sem instalar nada
npm run verificar   # testes + lint + build do admin-web, em sequência
```

Variáveis de ambiente: copie os modelos versionados.

```bash
cp apps/admin-web/.env.example  apps/admin-web/.env.local
cp apps/mobile-app/.env.example apps/mobile-app/.env
```

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | admin-web | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | admin-web | Chave pública; a RLS é quem protege |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | admin-web | Opcional: sem ela, o login usa redirecionamento |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile-app | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile-app | |

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` e `EXPO_PUBLIC_API_URL` deixaram de existir na
> v10.** A chave mestra alimentava seis rotas HTTP sem autenticação; as operações
> administrativas viraram funções no banco que conferem `is_superuser()`. Ver o
> [`HISTORICO.md`](./HISTORICO.md).

---

## Banco de Dados — `supabase/`

```
supabase/
├── criar-bd/        Criação do zero (wipe + rebuild)
│   ├── plataforma_00_reset.sql    O Demolidor  — ⚠️ apaga TODOS os usuários
│   ├── plataforma_01_schema.sql   O Construtor — tabelas, RLS, funções, grants
│   └── plataforma_02_seed.sql     O Hidratador — white-label + passo do Desenvolvedor
├── migrations/      Vazia por enquanto. Ler o README de lá antes do primeiro dado real.
└── testes/
    └── teste_rls.sql   Prova, dentro do banco, que as travas de acesso funcionam
```

### Como criar o banco

Abra o **SQL Editor** do Supabase e cole cada arquivo inteiro, **nesta ordem**:

```
1) plataforma_00_reset.sql    ⚠️ DESTRUTIVO — apaga todos os usuários. Só em dev/teste.
2) plataforma_01_schema.sql
3) plataforma_02_seed.sql
```

Em um projeto novo e vazio você pode **pular o `00`**.

O que o `plataforma_01_schema.sql` cria:

| Objeto | Qtde |
|---|---|
| Extensões (`uuid-ossp`, `unaccent`) | 2 |
| Tabelas (`users`, `global_settings`, `tenants`, `tenant_members`, `audit_log`) | 5 |
| `ENABLE ROW LEVEL SECURITY` | 5 |
| Funções PL/pgSQL e SQL | 19 |
| Policies RLS (todas com `TO`) | 10 |
| Triggers | 10 |

### 🔧 Passo obrigatório: criar o Desenvolvedor

A v10 removeu a credencial fixa que vivia no código (`admin@pjodc.ia` / `1qaz`).
O acesso técnico agora é um usuário real:

1. Supabase → **Authentication → Users → Add user** (marque *Auto Confirm*);
2. no SQL Editor:

```sql
update public.users
   set is_superuser = true, is_active = true, profile_completed = true,
       full_name = 'DESENVOLVEDOR', planet = 'TERRA', country = 'BRASIL',
       state = 'SP', city = 'SAO PAULO'
 where email = 'coloque-o-email-aqui';
```

Sem esse passo, o Painel de Engenharia não abre para ninguém.

### Conferir as travas de segurança

Cole `supabase/testes/teste_rls.sql` no SQL Editor. Ele cria três usuários de
teste, verifica dez comportamentos (visitante anônimo não lê usuários, usuário
comum não vira superusuário nem cria empresa, o Desenvolvedor cria pela função
transacional, a data grava a hora certa…) e termina em `ROLLBACK` — não deixa
rastro.

### ⚠️ O Supabase CLI não usa `criar-bd/`

`supabase db reset` procura por `supabase/migrations/`, que hoje só tem um README.
A criação do banco é manual, pelo SQL Editor, conforme acima.

---

## Comandos

**Raiz:**
```bash
npm install       # instala todos os workspaces
npm run web       # dev do admin-web
npm test          # node --test sobre packages/core
npm run modulos:verificar   # o verificador de LEGO (plataforma x modulos)
npm run lint:web
npm run build:web
npm run verificar # os quatro acima, em ordem
```

**`apps/mobile-app`:**
```bash
npm run start   # servidor Expo
npm run android
npm run ios
```

> O login Google do mobile **não funciona no Expo Go** (o Supabase rejeita o
> esquema `exp://`). Use `eas build --profile development`. Detalhes em
> `apps/mobile-app/AGENTS.md`.

---

## Arquitetura em uma frase

Toda lógica de negócio nasce em `packages/core`, é exportada por `src/index.ts` e consumida
pelos apps. Nunca escreva validação, chamada ao Supabase ou evento de telemetria direto no
`admin-web` ou no `mobile-app`.

Quem autoriza é **o banco**: RLS em todas as tabelas, privilégios por coluna e
funções `admin_*` que conferem `is_superuser()`. Esconder um botão nunca foi
controle de acesso.

A plataforma é o **Sol**; cada módulo é uma **peça de LEGO** que se pluga e se
despluga. O mapa dessa montagem — o que é plataforma, o que é módulo, os pontos
de solda e os roteiros de conectar/desconectar — é **[`MODULOS.md`](./MODULOS.md)**,
e `npm run modulos:verificar` confere as regras dele em segundos.

Regras completas, convenções obrigatórias e lições aprendidas: **[`CLAUDE.md`](./CLAUDE.md)**.
O que mudou em cada versão, e por quê: **[`HISTORICO.md`](./HISTORICO.md)**.
Detalhes de rotas e proxy do Next.js 16: `apps/admin-web/AGENTS.md`.

---

## Versões

Controladas em `packages/core/src/constants/versions.ts` — altere **apenas** esse arquivo.

```
WEB_VERSION = "v10 - 2026-09-11-01"
APP_VERSION = "v10 - 2026-09-11-02"
```
