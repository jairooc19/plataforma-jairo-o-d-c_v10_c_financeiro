/**
 * 🏷️ DICIONÁRIO DE PROPRIEDADES - PLATAFORMA JAIRO O D C v4
 * Define as chaves de metadados que acompanham os eventos de telemetria.
 * Essencial para filtragem, agrupamento e perícia técnica nos registros locais.
 */

export const ANALYTICS_PROPERTIES = {
  // --- CONTEXTO DE IDENTIDADE & MULTI-TENANCY ---
  TENANT_ID: 'tenant_id',       // UUID da empresa
  USER_ROLE: 'user_role',       // Papel no sistema (OWNER ou DEPENDENT)
  USER_EMAIL: 'user_email',     // E-mail para identificação direta
  FULL_NAME: 'full_name',       // Nome completo do usuário

  // --- FLUXO DE LOGIN & SEGURANÇA ---
  SELECTED_ROLE: 'selected_role', // O que o usuário clicou
  ATTEMPT_STATUS: 'attempt_status', // success ou failure
  AUTH_PROVIDER: 'auth_provider',   // Como a conta autenticou: 'email' ou 'google'
  AUTH_FLOW: 'auth_flow',           // Qual porta foi usada: owner, dependent, developer
  ERROR_MESSAGE: 'error_message',   // Detalhe do erro
  ERROR_CODE: 'error_code',         // Código técnico do erro
  
  // --- NAVEGAÇÃO & ORIGEM ---
  ORIGIN_SECTION: 'origin_section', // De onde ele veio
  PAGE_PATH: 'page_path',           // Caminho da URL atual
} as const;

// Tipo para auxílio do IntelliSense
export type AnalyticsPropertyName = typeof ANALYTICS_PROPERTIES[keyof typeof ANALYTICS_PROPERTIES];