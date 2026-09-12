/**
 * ⚡ O REGISTRO DE MÓDULOS — O SOQUETE DO LEGO (PJODC v10)
 * Local: packages/core/src/modules/registro.ts
 *
 * ===========================================================================
 * ⚠️ ESTE É O PONTO DE SOLDA Nº 1. É O ÚNICO ARQUIVO DA PLATAFORMA QUE PODE
 * CITAR O NOME DE UM MÓDULO.
 * ===========================================================================
 *
 * CONECTAR um módulo = acrescentar duas linhas aqui (o `import` do manifesto e
 * a entrada na lista). DESCONECTAR = apagar ou comentar essas duas linhas.
 * Nada mais no código da plataforma precisa saber que o módulo existe.
 *
 * Hoje a lista está VAZIA, e isso está certo: nenhum módulo foi criado. A
 * plataforma funciona inteira assim — essa é a prova de que ela não depende de
 * nenhuma peça (regra R9 do `MODULOS.md`).
 *
 * ---------------------------------------------------------------------------
 * COMO FICA QUANDO O PRIMEIRO MÓDULO CHEGAR
 * ---------------------------------------------------------------------------
 *   import { MANIFESTO_FINANCEIRO } from './financeiro/manifesto';   // ← solda
 *
 *   export const MODULOS_INSTALADOS: ManifestoDeModulo[] = [
 *     MANIFESTO_FINANCEIRO,                                          // ← solda
 *   ];
 *
 * ---------------------------------------------------------------------------
 * ⚠️ ESTAR NO REGISTRO NÃO DÁ ACESSO A NADA
 * ---------------------------------------------------------------------------
 * O registro responde "este módulo existe e tem estas telas". Quem responde
 * "você pode abrir" é o banco, em duas camadas: a empresa contratou
 * (`tenant_modules`) E o membro foi liberado (`tenant_members.allowed_modules`),
 * cruzadas pela função `modulos_do_membro()`. Esconder ou mostrar cartão nunca
 * foi controle de acesso — é a mesma lição do `sessionStorage` da v9.
 *
 * 📖 `MODULOS.md` na raiz do repositório é o mapa completo.
 */

import type { ManifestoDeModulo } from './tipos';

/**
 * Os módulos plugados nesta instalação.
 *
 * A ordem desta lista é a ordem dos cartões no painel do cliente.
 */
export const MODULOS_INSTALADOS: ManifestoDeModulo[] = [
  // (nenhum módulo conectado — ver `MODULOS.md`)
];

/**
 * Cruza a lista de identificadores que veio do banco com os manifestos dos
 * módulos realmente instalados.
 *
 * ⚠️ UM IDENTIFICADOR SEM MANIFESTO É IGNORADO EM SILÊNCIO, DE PROPÓSITO. Se
 * um módulo foi desplugado do código mas ainda há membros com ele em
 * `allowed_modules`, o menu simplesmente não desenha o cartão — em vez de
 * quebrar a tela do cliente com um destino que não existe mais. A limpeza
 * dessas sobras é responsabilidade do reset do módulo (regra B5).
 *
 * @param permitidos os ids vindos de `modulos_do_membro()` ou de `allowed_modules`
 */
export function modulosDoMembro(permitidos: string[] | null | undefined): ManifestoDeModulo[] {
  if (!permitidos || permitidos.length === 0) return [];
  return MODULOS_INSTALADOS.filter((modulo) => permitidos.includes(modulo.id));
}

/** Procura um manifesto pelo id. `undefined` quando o módulo não está plugado. */
export function manifestoDoModulo(id: string): ManifestoDeModulo | undefined {
  return MODULOS_INSTALADOS.find((modulo) => modulo.id === id);
}
