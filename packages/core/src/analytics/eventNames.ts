/**
 * 🧠 DICIONÁRIO DE EVENTOS - PLATAFORMA JAIRO O D C v10
 * Este arquivo é a única fonte de verdade para nomes de eventos de telemetria.
 * Centralizado no CORE para garantir consistência entre Web e Mobile.
 *
 * ⚠️ NUNCA ESCREVA UMA STRING DE EVENTO SOLTA NA TELA. Até a v9 o dashboard da
 * web capturava `'tenant_selected_in_lobby'`, `'tenant_switch_requested'` e
 * `'navigated_via_dev_console'` como literais — três eventos que não existiam
 * neste dicionário e que ninguém encontraria procurando por aqui. Eles viraram
 * as constantes da seção 2.4.
 */

export const ANALYTICS_EVENTS = {
  // --- FASE 1: FLUXO ANÔNIMO & INTERESSE ---
  VIEW_LANDING_PAGE: 'view_landing_page',     // Acesso inicial ao domínio
  VIEW_HELP_SECTION: 'view_help_section',     // Curiosidade na seção de Ajuda
  VIEW_ABOUT_SYSTEM: 'view_about_system',     // Curiosidade sobre a plataforma
  CLICK_ENGINEERING_PANEL: 'click_engineering_panel', // Monitoramento de acesso ao Painel Dev

  // --- FASE 1.2: FLUXO DE LOGIN (FUNIL) ---
  LOGIN_MODAL_OPENED: 'login_modal_opened',   // Clicou no ícone principal de login
  LOGIN_ROLE_SELECTED: 'login_role_selected', // Escolheu entre Proprietário/Dependente/Veja
  LOGIN_VIEW_ONLY_NOTICE: 'login_view_only_notice', // Visualizou aviso de "Apenas Veja"

  // --- FASE 2: SEGURANÇA & PERÍCIA (AUTH) ---
  AUTH_ATTEMPT_SUBMIT: 'auth_attempt_submit',   // Clicou em "Entrar no Sistema"
  AUTH_ATTEMPT_SUCCESS: 'auth_attempt_success', // Login bem-sucedido
  AUTH_ATTEMPT_FAILED: 'auth_attempt_failed',   // Falha (detecção de robôs/brute force)

  // --- FASE 2.1: LOGIN GOOGLE (EXCLUSIVO DO PROPRIETÁRIO) ---
  AUTH_GOOGLE_ATTEMPT: 'auth_google_attempt',             // Popup devolveu credencial
  AUTH_GOOGLE_OWNER_SUCCESS: 'auth_google_owner_success', // Sessão criada via Google
  AUTH_GOOGLE_OWNER_FAILED: 'auth_google_owner_failed',   // Falha dentro do serviço do Core
  AUTH_GOOGLE_FAILED: 'auth_google_failed',               // Falha no fluxo da tela

  // --- FASE 2.2: PAINEL DE ENGENHARIA (v10) ---
  // O acesso técnico deixou de ser uma credencial fixa no código e virou um
  // login normal com `is_superuser` no banco. Estes eventos registram o uso.
  AUTH_DEVELOPER_SUCCESS: 'auth_developer_success', // Entrou como Desenvolvedor
  AUTH_DEVELOPER_DENIED: 'auth_developer_denied',   // Logou, mas não é superusuário

  // --- FASE 2.3: CICLO DE VIDA DO PERFIL E DA SESSÃO ---
  AUTH_LOGOUT: 'auth_logout',               // Saiu (navegador + cookies)
  PROFILE_COMPLETED: 'profile_completed',   // Fechou o cadastro no primeiro acesso
  PROFILE_UPDATED: 'profile_updated',       // Editou o perfil depois
  ACCOUNT_DELETED: 'account_deleted',       // Apagou a própria conta em definitivo

  // --- FASE 2.4: CONTEXTO DE EMPRESA E ADMINISTRAÇÃO ---
  TENANT_SELECTED: 'tenant_selected',               // Escolheu a empresa no lobby/seletor
  TENANT_SWITCH_REQUESTED: 'tenant_switch_requested', // Pediu para trocar de empresa
  TENANTS_SYNCED: 'tenants_synced',                 // Desenvolvedor gravou as empresas
  SETTINGS_UPDATED: 'settings_updated',             // Desenvolvedor gravou o white-label
  DEV_PANEL_NAVIGATION: 'dev_panel_navigation',     // Navegou por dentro do painel técnico

  // --- FASE 2.5: OPERACIONAL (LOGADOS) ---
  REPORT_GENERATED: 'report_generated',
} as const;

// Tipo exportado para garantir que o TypeScript ajude no preenchimento automático
export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
