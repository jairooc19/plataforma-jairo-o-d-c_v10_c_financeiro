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
 * ---------------------------------------------------------------------------
 * O QUE ESTÁ PLUGADO HOJE (17/09/2026): UM MÓDULO — `financeiro`
 * ---------------------------------------------------------------------------
 * ⚠️ ESTE COMENTÁRIO DIZIA "Hoje a lista está VAZIA" ATÉ 17/09/2026 — e o
 * código logo abaixo já importava e registrava o `MANIFESTO_FINANCEIRO`. Quem
 * lesse só o comentário concluiria que a plataforma está sem peça nenhuma e
 * que as duas linhas de solda ainda precisavam ser escritas.
 *
 * A prova da regra R9 do `MODULOS.md` (a plataforma não depende de nenhuma
 * peça) continua valendo, mas agora ela se faz APAGANDO as duas linhas de
 * solda — não observando uma lista vazia.
 *
 * Como as duas linhas de solda se parecem, para conectar o próximo módulo:
 *
 *   import { MANIFESTO_XXXXX } from './xxxxx/manifesto';   // ← solda 1
 *
 *   export const MODULOS_INSTALADOS: ManifestoDeModulo[] = [
 *     MANIFESTO_FINANCEIRO,
 *     MANIFESTO_XXXXX,                                     // ← solda 2
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
import { MANIFESTO_FINANCEIRO } from './financeiro/manifesto';   // ← SOLDA

/**
 * Os módulos plugados nesta instalação.
 *
 * A ordem desta lista é a ordem dos cartões no painel do cliente.
 */
export const MODULOS_INSTALADOS: ManifestoDeModulo[] = [
  MANIFESTO_FINANCEIRO,                                          // ← SOLDA
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

/**
 * O rótulo "MÓDULO: X" / "MÓDULOS: X · Y" desta instalação — ou `null` se não há
 * nenhum módulo plugado.
 *
 * ===========================================================================
 * ⚠️ POR QUE ESTA FUNÇÃO EXISTE, E POR QUE ELA É A CORREÇÃO DE UM ATALHO ERRADO
 * ===========================================================================
 * Em 19/09/2026 o dono do projeto pediu que a marca do aplicativo mostrasse, na
 * linha abaixo do nome da plataforma, **"MÓDULO: CONTROLE FINANCEIRO"**.
 *
 * O caminho óbvio seria escrever essa frase na tela da guarita. Isso seria uma
 * **quarta solda clandestina**: um arquivo da plataforma passaria a citar o nome
 * de um módulo, o `npm run modulos:verificar` acusaria R1/R8 — com razão — e, pior
 * que a violação formal, a frase **viraria mentira** em dois momentos previsíveis:
 * quando um segundo módulo fosse plugado, e no dia em que o financeiro fosse
 * desplugado (a marca continuaria anunciando um módulo que não existe mais).
 *
 * Aqui a frase é **derivada do registro**: o texto vem do `nome` de cada
 * manifesto, que é do módulo. A plataforma pede o rótulo e desenha — sem saber
 * quantos módulos são, nem quais. Plugar o segundo não exige tocar em tela
 * nenhuma; desplugar o último faz a linha desaparecer sozinha.
 *
 * ⚠️ MAIÚSCULAS AQUI, E NÃO NA TELA. O aplicativo escreve rótulos em maiúsculas,
 * e `textTransform` não existe em todos os componentes de todas as plataformas com
 * o mesmo resultado. Fazendo no dado, o telefone e qualquer outro consumidor
 * futuro leem a mesma coisa.
 */
export function rotuloDosModulosInstalados(): string | null {
  if (MODULOS_INSTALADOS.length === 0) return null;

  const nomes = MODULOS_INSTALADOS.map((modulo) => modulo.nome.toUpperCase()).join(' · ');
  const prefixo = MODULOS_INSTALADOS.length === 1 ? 'MÓDULO' : 'MÓDULOS';

  return `${prefixo}: ${nomes}`;
}
