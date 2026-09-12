/**
 * 🧾 TIPOS GLOBAIS DO MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/types/index.ts
 *
 * O que mora aqui: formatos que ATRAVESSAM camadas — a sessão que o layout
 * monta, o dashboard consome e o serviço grava; o contexto de empresa que o
 * Core devolve.
 *
 * O que NÃO mora aqui: props de componente (ficam no `.types.ts` ao lado do
 * componente) e tipos de um fluxo só (ficam no arquivo do fluxo, como
 * `hooks/auth/types.ts`). Um arquivo de tipos que cresce sem esse critério vira
 * o depósito onde todo mundo importa tudo, e o grafo de dependências fecha em
 * ciclo.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PAPÉIS E SESSÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Papéis que a guarita conhece.
 *
 * ⚠️ `DEVELOPER` NÃO É UM VALOR DA COLUNA `tenant_members.role` — ela só aceita
 * OWNER | DEPENDENT | VIEWER. É um contexto de interface, gravado no cofre do
 * aparelho DEPOIS de o banco confirmar `is_superuser()` (ver
 * `hooks/auth/usePasswordLogin.ts`). Misturar os dois conjuntos é o que faz
 * alguém consultar `tenant_members` por 'DEVELOPER' e receber lista vazia.
 */
export type UserRole = 'OWNER' | 'DEPENDENT' | 'VIEWER' | 'DEVELOPER';

/** Papéis que o `getUserTenants` do Core aceita como filtro. */
export type TenantRole = Extract<UserRole, 'OWNER' | 'DEPENDENT' | 'VIEWER'>;

/** Quem está logado e em que empresa — o que o dashboard precisa saber. */
export interface SessionUser {
  userId: string | null;
  email: string | null;
  tenantId: string | null;
  role: UserRole | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPRESA E VÍNCULO
// ─────────────────────────────────────────────────────────────────────────────

/** Empresa, como o Core a devolve aninhada no vínculo. */
export interface TenantSummary {
  tenant_name: string;
  slug?: string;
  is_active?: boolean;
  /** Dono da empresa. `is_active: false` bloqueia a entrada de todos os membros. */
  users?: {
    full_name?: string | null;
    email?: string | null;
    is_active?: boolean;
  } | null;
}

/**
 * Vínculo usuário↔empresa (`tenant_members`).
 *
 * ✅ v10 — `allowed_modules` É `string[]` AQUI E `text[]` NO BANCO. Até a v9 o
 * tipo dizia `string[]` enquanto a coluna era `text`: o dia em que houvesse um
 * módulo, `.map()` quebraria a tela. Agora os dois lados concordam.
 */
export interface TenantMemberContext {
  tenant_id?: string;
  role: TenantRole | string;
  allowed_modules?: string[] | null;
  module_configs?: Record<string, unknown> | null;
  tenants: TenantSummary | TenantSummary[] | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/** Tom de uma mensagem exibida ao usuário. */
export type MessageType = 'success' | 'error' | 'info';

export interface FeedbackMessage {
  text: string;
  type: MessageType;
}

/** Estado de uma operação assíncrona, para telas que mostram os três casos. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
