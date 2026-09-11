/**
 * 🧾 TIPOS GLOBAIS DO MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/types/index.ts
 *
 * O que mora aqui: formatos que ATRAVESSAM camadas — a sessão que o layout
 * monta, o dashboard consome e o serviço grava; o contexto de empresa que veio
 * do Core como `any` e precisava de forma.
 *
 * O que NÃO mora aqui: props de componente (ficam no `.types.ts` ao lado do
 * componente) e tipos de um fluxo só (ficam no arquivo do fluxo, como
 * `hooks/auth/types.ts`). Um arquivo de tipos que cresce sem esse critério vira
 * o depósito onde todo mundo importa tudo, e o grafo de dependências fecha em
 * ciclo.
 *
 * ⚠️ ESTES TIPOS DESCREVEM O QUE O `@jairo/core` DEVOLVE — não o substituem.
 * O Core é a fonte de verdade do formato; se um campo mudar lá, muda aqui.
 * Foram escritos porque `contextData: any` e `tenantData: any` apagavam
 * exatamente a informação que o TypeScript existe para guardar.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PAPÉIS E SESSÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Papéis que a guarita conhece.
 *
 * ⚠️ `DEVELOPER` NÃO EXISTE NO BANCO. A coluna `tenant_members.role` só aceita
 * OWNER | DEPENDENT | VIEWER; o Desenvolvedor é um contexto puramente local,
 * gravado no cofre pelo `usePasswordLogin` porque a credencial dele é fixa no
 * Core e nunca passa pelo GoTrue. Misturar os dois conjuntos é o que faz alguém
 * tentar consultar `tenant_members` por 'DEVELOPER' e receber lista vazia.
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
  slug: string;
  is_active?: boolean;
  /** Dono da empresa. `is_active: false` bloqueia a entrada de todos os membros. */
  users?: {
    full_name: string;
    email: string;
    is_active: boolean;
  };
}

/**
 * Vínculo usuário↔empresa (`tenant_members`).
 *
 * ⚠️ `allowed_modules` é `text[]` no banco — NUNCA uma string separada por
 * vírgula. É proibição explícita do CLAUDE.md, e o tipo aqui é a primeira
 * barreira contra ela.
 */
export interface TenantMemberContext {
  tenant_id: string;
  role: TenantRole;
  allowed_modules?: string[];
  module_configs?: Record<string, unknown>;
  tenants: TenantSummary;
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
