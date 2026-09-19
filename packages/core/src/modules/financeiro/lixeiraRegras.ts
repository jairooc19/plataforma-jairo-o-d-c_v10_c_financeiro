/**
 * ♻️ AS JANELAS DE TEMPO DA LIXEIRA (PJODC v10)
 * Local: packages/core/src/modules/financeiro/lixeiraRegras.ts
 *
 * ===========================================================================
 * ⚠️ POR QUE ISTO EXISTE — "30 DIAS" ERA UM NÚMERO ESCOLHIDO POR MIM
 * ===========================================================================
 * A `fin_listar_exclusoes` sempre aceitou um `p_desde`; o que faltava era a
 * tela oferecer a escolha. Até 18/09/2026 ela nunca passava esse parâmetro, e
 * o banco caía no padrão dele — 30 dias —, que eu escolhi sozinho no estudo de
 * 17/09 e escrevi como fato na tela ("OS ÚLTIMOS 30 DIAS").
 *
 * Quem excluiu um lançamento há 45 dias abria a lixeira, não o encontrava e
 * concluía, sem culpa, que ele tinha sumido de vez. Ele estava lá.
 *
 * ⚠️ A LISTA MORA NO CORE, E NÃO NA TELA, pelo mesmo motivo de sempre: a
 * pergunta "que janelas existem?" tem de ter UMA resposta. Se a tela tivesse a
 * dela, o dia em que aparecesse uma segunda tela de lixeira — ou o aplicativo
 * do celular — nasceria com outra lista, e ninguém notaria.
 *
 * ⚠️ O CÁLCULO DA DATA NÃO ESTÁ AQUI: ele é `diasAtras`, em `lib/datas.ts`,
 * que é testado pelo `npm test`. Aqui há só a lista e a tradução de uma
 * escolha em data — e a diferença importa, porque conta de data feita à mão é
 * onde o horário de verão morde.
 */

import { diasAtras } from '../../lib/datas';

/** Uma opção do seletor de período da lixeira. */
export interface JanelaDaLixeira {
  /** O valor que vai para o `<select>` — e para a URL, se um dia for. */
  chave: string;
  /** O que a pessoa lê. */
  rotulo: string;
  /** Quantos dias para trás. `null` = desde o começo de tudo. */
  dias: number | null;
}

/**
 * ⚠️ O PADRÃO CONTINUA SENDO 30 DIAS, e isso é deliberado. Esta lista alimenta
 * um ecrã que tem um botão de APAGAR DE VEZ: o padrão precisa mostrar MENOS, e
 * ver mais precisa ser um gesto consciente. É o mesmo princípio do `p_simular`
 * das funções destrutivas — o caminho seguro é o caminho preguiçoso.
 */
export const JANELAS_DA_LIXEIRA: JanelaDaLixeira[] = [
  { chave: '7', rotulo: 'ÚLTIMOS 7 DIAS', dias: 7 },
  { chave: '30', rotulo: 'ÚLTIMOS 30 DIAS', dias: 30 },
  { chave: '90', rotulo: 'ÚLTIMOS 90 DIAS', dias: 90 },
  { chave: '180', rotulo: 'ÚLTIMOS 6 MESES', dias: 180 },
  { chave: '365', rotulo: 'ÚLTIMO ANO', dias: 365 },
  { chave: 'tudo', rotulo: 'DESDE O COMEÇO', dias: null },
];

/** A janela usada quando a tela abre. */
export const JANELA_PADRAO_DA_LIXEIRA = '30';

/**
 * A data mais antiga que o sistema pode ter — o "desde o começo".
 *
 * ⚠️ NÃO É UM TRUQUE FEIO, É O CONTRÁRIO DE UM. A alternativa seria mudar a
 * função do banco para que `p_desde` nulo passasse a significar "tudo" — mas
 * nulo lá já significa "30 dias", está escrito na assinatura e é o padrão
 * SEGURO. Trocar o sentido de um valor que já existe é como renomear uma rua:
 * quem tinha o endereço antigo chega ao lugar errado, em silêncio. Uma data
 * anterior ao próprio PostgreSQL diz a mesma coisa sem mexer em nada.
 */
export const COMECO_DE_TUDO = '1970-01-01';

/**
 * Traduz a escolha da tela na data que vai ao banco.
 *
 * @param chave uma das `JANELAS_DA_LIXEIRA`. Desconhecida cai no padrão de 30
 *              dias — nunca em "tudo": diante de um valor que não entendo, a
 *              resposta certa é a mais estreita, não a mais larga.
 */
export function desdeDaJanela(chave: string, hoje?: string): string {
  const janela = JANELAS_DA_LIXEIRA.find((j) => j.chave === chave);
  if (janela && janela.dias === null) return COMECO_DE_TUDO;
  return diasAtras(janela?.dias ?? 30, hoje);
}

/** O rótulo da janela, para a tela repetir na frase que descreve a lista. */
export function rotuloDaJanela(chave: string): string {
  return JANELAS_DA_LIXEIRA.find((j) => j.chave === chave)?.rotulo ?? 'ÚLTIMOS 30 DIAS';
}
