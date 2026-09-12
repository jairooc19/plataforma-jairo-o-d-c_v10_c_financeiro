// packages/core/src/index.ts

/**
 * 🧠 INDEX CENTRAL DO CORE: Ponto de entrada único (PJODC v10)
 * Este arquivo centraliza todas as exportações dos serviços e bibliotecas
 * para que o Admin-Web e o Mobile App utilizem a mesma lógica.
 *
 * ⚠️ O QUE SAIU NA v10:
 *   • `supabaseAdmin` (cliente de chave mestra) — as operações administrativas
 *     viraram funções no banco, com conferência de `is_superuser()`.
 *   • `adminApiService` e `apiBaseUrl` — existiam só para o aplicativo alcançar
 *     as rotas `/api/admin/*` do site, que não pediam identificação. As rotas
 *     foram removidas; a chamada agora é a mesma nos dois ambientes.
 *
 * ✅ O QUE ENTROU:
 *   • `lib/dinheiro` — valores monetários em centavos inteiros (base do
 *     C FINANCEIRO).
 *   • `lib/datas` — data de calendário × instante, com o fuso do Brasil.
 *   • `constants/padroes` — os padrões de fábrica do white-label, agora numa
 *     fonte única.
 */

// 1. Bibliotecas e Conexões Base
export * from './lib/supabase';
export * from './lib/dinheiro';
export * from './lib/datas';

// 2. Serviços de Plataforma (A Espinha Dorsal)
export * from './services/platform/authService';
export * from './services/platform/googleAuthService';
export * from './services/platform/profileService';
export * from './services/platform/settingsService';
export * from './services/platform/tenantService';
export * from './services/platform/moduleService';

// 3. MÓDULOS — O SOQUETE DO LEGO
//
// ⚠️ `modules/registro.ts` é O PONTO DE SOLDA Nº 1: o único arquivo da
// plataforma que pode citar o nome de um módulo. A linha abaixo exporta o
// registro e os tipos; o módulo em si entra em `modules/<nome>/` e ganha uma
// linha de `export` aqui (ponto de solda nº 2). Ver `MODULOS.md` na raiz.
//
// Nenhum módulo instalado nesta versão — e a plataforma funciona inteira assim.
export * from './modules/tipos';
export * from './modules/registro';

// 4. Constantes Globais e Versão
export * from './constants/versions';
export * from './constants/padroes';
export * from './constants/locations';

// 5. Telemetria e Analytics (local, sem provedor externo)
export * from './analytics';
