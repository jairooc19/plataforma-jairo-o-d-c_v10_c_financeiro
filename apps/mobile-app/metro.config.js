const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Identifica a raiz do projeto e a raiz da pasta mobile
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. MONITORIZAÇÃO AMPLIADA
// Faz o Metro vigiar a raiz do monorepo para detetar mudanças no @jairo/core
config.watchFolders = [workspaceRoot];

// 2. RESOLUÇÃO DE DEPENDÊNCIAS (ESTRATÉGIA MONOREPO)
// Ensina o Metro a procurar pacotes primeiro localmente e depois na raiz
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. MAPEAMENTO DE MÓDULOS CRÍTICOS (ALINHAMENTO COM @JAIRO/CORE)
// Garante que o Core e as bibliotecas base usem sempre a mesma instância
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@jairo/core': path.resolve(workspaceRoot, 'packages/core'),
};

// 4. SUPORTE A EXPO ROUTER (WORKSPACE RESOLUTION)
// Garante que plugins como expo-router sejam resolvidos corretamente
config.resolver.disableHierarchicalLookup = false;

module.exports = config;