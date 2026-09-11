import { Platform, type TextStyle } from 'react-native';
import { BRAND } from './Colors';

/**
 * 🔤 HIERARQUIA TIPOGRÁFICA (PJODC v10)
 * Local: apps/mobile-app/src/constants/Typography.ts
 *
 * v9: [100% NATIVO — TOKEN]
 *
 * Antes desta refatoração cada tela declarava o seu próprio `fontSize` e
 * `fontWeight` no `StyleSheet` — e o resultado era mensurável: havia títulos de
 * 17, 20, 22 e 24pt cumprindo a mesma função em telas diferentes, e nove pesos
 * distintos entre `'600'` e `'900'`. Uma escala existe para que "título de
 * seção" seja UMA decisão tomada uma vez, não uma opinião nova por arquivo.
 *
 * 📏 A ESCALA TEM SEIS DEGRAUS E NÃO MAIS. Cada degrau que se acrescenta é um
 * degrau que alguém vai escolher errado — se `subtitulo` e `corpo` têm 1pt de
 * diferença, a diferença não comunica nada e só multiplica as opções.
 *
 * ⚖️ TRÊS PESOS, TAMBÉM POR LIMITE DELIBERADO: 400, 600 e 700. O peso 900 saiu
 * de cena nesta refatoração e a razão é nativa, não estética — a São Francisco
 * (iOS) e a Roboto (Android) têm `Black` de verdade, e usá-la em rótulo de 10pt
 * borra a contraforma das letras em tela de densidade média. Aplicativos de
 * transporte usam `semibold` para tudo que precisa de ênfase e reservam o peso
 * máximo ao número grande de uma métrica.
 *
 * 🔠 NÃO HÁ FAMÍLIA DE FONTE DECLARADA, e isso é o ponto. Omitir `fontFamily`
 * faz o React Native usar a fonte do SISTEMA: São Francisco no iOS, Roboto no
 * Android. É ela que o usuário vê no resto do aparelho, é ela que respeita a
 * configuração de tamanho de texto da acessibilidade, e é ela que faz o app não
 * parecer importado. Empacotar uma fonte própria seria o caminho mais rápido
 * para um app que parece um site.
 */

/** Os únicos pesos que a plataforma usa. */
export const PESO = {
  regular: '400',
  medio: '600',
  forte: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * 📐 A ESCALA, em pontos.
 *
 * `numeroGrande` está fora da progressão de propósito: ele não é um degrau de
 * texto, é o valor de uma métrica (`StatCard`), e existe para ser lido de
 * relance, à distância do braço.
 */
export const TAMANHO = {
  titulo: 26,
  subtitulo: 18,
  secao: 16,
  corpo: 15,
  legenda: 13,
  dica: 11,
  numeroGrande: 30,
} as const;

/**
 * 📖 ALTURA DE LINHA — sempre declarada, nunca deixada ao padrão.
 *
 * ⚠️ O PADRÃO DO REACT NATIVE NÃO É O MESMO NAS DUAS PLATAFORMAS. Sem
 * `lineHeight`, o iOS herda a métrica da fonte e o Android aplica a sua própria
 * folga — o mesmo parágrafo fica visivelmente mais espaçado num dos dois, e a
 * diferença só aparece quando se põem os dois aparelhos lado a lado. Declarar
 * fecha a questão.
 *
 * A razão é ~1.3 para títulos (linhas curtas, o espaço atrapalha) e ~1.45 para
 * corpo (linhas longas, o espaço ajuda a achar a próxima).
 */
const ALTURA = {
  titulo: 32,
  subtitulo: 24,
  secao: 22,
  corpo: 22,
  legenda: 18,
  dica: 15,
  numeroGrande: 34,
} as const;

/**
 * 🎨 OS ESTILOS PRONTOS.
 *
 * ⚠️ É UM OBJETO CONGELADO, NÃO UM `StyleSheet.create`, e a diferença importa
 * aqui: `StyleSheet.create` devolve identificadores opacos que não se pode
 * espalhar nem sobrescrever campo a campo. Estes estilos existem justamente
 * para serem compostos — `[TIPOGRAFIA.secao, { color: BRAND.primary }]` — e um
 * identificador opaco continuaria funcionando nesse array, mas
 * `{ ...TIPOGRAFIA.secao, marginTop: 8 }` não. Objetos simples aceitam as duas
 * formas.
 *
 * 🎯 A COR VEM JUNTO, e é a decisão que impede o erro mais comum da escala:
 * aplicar `TIPOGRAFIA.legenda` e esquecer que legenda é cinza, deixando um texto
 * de apoio com o mesmo peso visual do conteúdo principal. Quem precisar de outra
 * cor sobrescreve — e aí está declarando uma exceção, que é o que ela é.
 */
export const TIPOGRAFIA = Object.freeze({
  /** Título de tela. Um por tela, no topo. */
  titulo: {
    fontSize: TAMANHO.titulo,
    lineHeight: ALTURA.titulo,
    fontWeight: PESO.forte,
    color: BRAND.text,
    letterSpacing: -0.5,
  } as TextStyle,

  /** Subtítulo de tela, ou título de cartão grande. */
  subtitulo: {
    fontSize: TAMANHO.subtitulo,
    lineHeight: ALTURA.subtitulo,
    fontWeight: PESO.medio,
    color: BRAND.text,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Título de bloco dentro de uma tela ("MÓDULOS OPERACIONAIS"). */
  secao: {
    fontSize: TAMANHO.secao,
    lineHeight: ALTURA.secao,
    fontWeight: PESO.medio,
    color: BRAND.text,
  } as TextStyle,

  /** Texto corrente. */
  corpo: {
    fontSize: TAMANHO.corpo,
    lineHeight: ALTURA.corpo,
    fontWeight: PESO.regular,
    color: BRAND.text,
  } as TextStyle,

  /** Descrição de cartão, texto de apoio. Cinza por definição. */
  legenda: {
    fontSize: TAMANHO.legenda,
    lineHeight: ALTURA.legenda,
    fontWeight: PESO.regular,
    color: BRAND.textMuted,
  } as TextStyle,

  /** Rótulo miúdo, formato esperado, marca d'água. */
  dica: {
    fontSize: TAMANHO.dica,
    lineHeight: ALTURA.dica,
    fontWeight: PESO.regular,
    color: BRAND.textFaint,
  } as TextStyle,

  /**
   * Rótulo de campo e de métrica: caixa alta, espaçado.
   *
   * ⚠️ O `letterSpacing` NÃO É ENFEITE em caixa alta. Maiúsculas têm todas a
   * mesma altura e, sem folga entre elas, o olho perde a fronteira das palavras
   * — é a razão de toda placa de sinalização espaçar versal.
   */
  rotulo: {
    fontSize: TAMANHO.dica,
    lineHeight: ALTURA.dica,
    fontWeight: PESO.medio,
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,

  /** O número de uma métrica. Único lugar do peso máximo. */
  numeroGrande: {
    fontSize: TAMANHO.numeroGrande,
    lineHeight: ALTURA.numeroGrande,
    fontWeight: PESO.forte,
    color: BRAND.text,
    letterSpacing: -1,
    // Números de largura fixa: sem isto um contador que vai de 9 para 10 empurra
    // o que estiver ao lado, e uma latência que oscila entre 98 e 102 ms treme.
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  /** Texto de botão. Sem caixa alta — ver a nota em `Button.styles.ts`. */
  botao: {
    fontSize: TAMANHO.corpo,
    lineHeight: ALTURA.corpo,
    fontWeight: PESO.medio,
    letterSpacing: Platform.OS === 'ios' ? -0.2 : 0.2,
  } as TextStyle,
});

export type NomeTipografia = keyof typeof TIPOGRAFIA;
