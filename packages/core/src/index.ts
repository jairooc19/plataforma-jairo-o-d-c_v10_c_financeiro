// packages/core/src/index.ts

/**
 * 🧠 INDEX CENTRAL DO CORE: Ponto de entrada único (PJODC v4)
 * Este arquivo centraliza todas as exportações dos serviços e bibliotecas
 * para que o Admin-Web e o Mobile App utilizem a mesma lógica.
 * * Versão: v4 (Plataforma pura — sem módulos funcionais)
 */

// 1. Bibliotecas e Conexões Base
export * from './lib/supabase';
export * from './lib/apiBaseUrl';

// 2. Serviços de Plataforma (A Espinha Dorsal)
export * from './services/platform/adminApiService';
export * from './services/platform/authService';
export * from './services/platform/googleAuthService';
export * from './services/platform/profileService';
export * from './services/platform/settingsService';
export * from './services/platform/tenantService';

// 3. Módulos Funcionais (Gavetas de Funcionalidades)
// Nenhum módulo instalado nesta versão.

// 4. Constantes Globais e Versão
export * from './constants/versions';
export * from './constants/locations';

// 5. Telemetria e Analytics (local, sem provedor externo)
// Centraliza nomes de eventos, propriedades e o registrador local de eventos
export * from './analytics';