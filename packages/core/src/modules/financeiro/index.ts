/**
 * 💰 MÓDULO CONTROLE FINANCEIRO — porta de entrada (PJODC v10)
 * Local: packages/core/src/modules/financeiro/index.ts
 *
 * Reúne o que o módulo oferece aos aplicativos. Quem consome importa de
 * `@jairo/core`, como em qualquer serviço da plataforma.
 *
 * 📖 `MODULOS.md` na raiz · especificação em `_estudos/`.
 */

export * from './manifesto';
export * from './tipos';
export * from './cadastroService';
export * from './importacao';
export * from './lancamentoService';
export * from './extratoService';
export * from './manutencaoService';
export * from './manutencaoRegras';
export * from './permissaoService';
