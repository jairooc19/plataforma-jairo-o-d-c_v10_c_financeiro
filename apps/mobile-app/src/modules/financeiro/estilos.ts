import { StyleSheet } from 'react-native';

import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA, PESO, TAMANHO } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

/**
 * 🎨 OS ESTILOS DO MÓDULO NO APLICATIVO (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/estilos.ts
 *
 * ⚠️ ESTE ARQUIVO NÃO INVENTA COR, CORPO NEM FOLGA. A cor nasce em
 * `constants/Colors.ts`, o corpo em `constants/Typography.ts` e a folga em
 * `constants/Spacing.ts` — todos da plataforma. Aqui só se COMPÕE o que é
 * específico destas telas.
 *
 * ⚠️ NÃO EXISTE TAILWIND AQUI. As telas do módulo no site usam classes
 * (`text-xs font-black uppercase`); em React Native não há CSS nem cascata, e
 * traduzir classe por classe produziria um arquivo ilegível. As medidas abaixo
 * são as equivalentes em token.
 *
 * 📱 OS CORPOS SÃO MAIORES QUE OS DO SITE, DE PROPÓSITO. A tela do site usa 11px
 * em vários rótulos; num telefone a 30 cm do olho isso é pequeno demais. O menor
 * corpo usado aqui é `TAMANHO.dica` (11pt), e só em rótulo de uma palavra.
 */
export const estilosFin = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────────
  // MOLDURA
  // ─────────────────────────────────────────────────────────────────────────
  tela: { flex: 1, backgroundColor: BRAND.background },
  conteudo: { padding: ESPACO.lg, paddingBottom: ESPACO.xxxl },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESPACO.xl },

  // ─────────────────────────────────────────────────────────────────────────
  // CABEÇALHO DA TELA
  // ─────────────────────────────────────────────────────────────────────────
  topo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.sm },
  titulo: { ...TIPOGRAFIA.subtitulo, fontWeight: PESO.forte, letterSpacing: 0.3 },

  /** "EMPRESA · SETEMBRO / 2026 · 63% DO MÊS DECORRIDO" */
  contexto: {
    ...TIPOGRAFIA.dica,
    color: BRAND.textMuted,
    letterSpacing: 0.8,
    marginTop: ESPACO.xs,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCO (RECEITA, DESPESA, RESULTADO, OUTRAS, FORA)
  // ─────────────────────────────────────────────────────────────────────────
  bloco: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginTop: ESPACO.lg,
  },
  /** O bloco FORA se distingue por cor, porque o conteúdo dele é outro. */
  blocoFora: { backgroundColor: BRAND.warningSoft },

  blocoTitulo: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
    letterSpacing: 1.4,
  },
  blocoNota: {
    ...TIPOGRAFIA.legenda,
    marginTop: ESPACO.sm,
  },

  /** A linha de TOTAL, separada do resto por um traço. */
  divisorTotal: {
    marginTop: ESPACO.lg,
    paddingTop: ESPACO.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND.border,
  },

  linhas: { marginTop: ESPACO.md, gap: ESPACO.lg },

  // ─────────────────────────────────────────────────────────────────────────
  // A BARRA DE CONSUMO
  // ─────────────────────────────────────────────────────────────────────────
  barraTopo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: ESPACO.sm,
  },
  barraNome: {
    ...TIPOGRAFIA.legenda,
    fontWeight: PESO.forte,
    color: BRAND.text,
    flexShrink: 1,
  },

  /**
   * ⚠️ `fontVariant: ['tabular-nums']` FAZ OS ALGARISMOS TEREM A MESMA LARGURA.
   * Sem isso, os valores "dançam" a cada recarga — o "1" é mais estreito que o
   * "8" na maioria das fontes, e uma coluna de números parece desalinhada.
   */
  barraValores: {
    ...TIPOGRAFIA.dica,
    color: BRAND.textMuted,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    flexShrink: 1,
  },

  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: ESPACO.md, marginTop: ESPACO.xs },

  /** A calha da barra. `overflow: 'hidden'` recorta o preenchimento no raio. */
  calha: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: BRAND.surfaceVariant,
    overflow: 'hidden',
    position: 'relative',
  },
  preenchimento: { height: '100%' },

  /**
   * 🎁 A MARCA DO RITMO DO MÊS — o risquinho vertical.
   *
   * ⚠️ ELA FICA FORA DO `overflow: hidden`? NÃO — fica dentro, e por isso é um
   * `position: 'absolute'` irmão do preenchimento. Dentro da calha ela é
   * recortada pelo mesmo raio, que é o desejado; fora dela, atravessaria a linha
   * inteira da tela.
   */
  marcaRitmo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: BRAND.textMuted,
  },

  percentual: {
    width: 52,
    textAlign: 'right',
    fontSize: TAMANHO.legenda,
    lineHeight: 18,
    fontWeight: PESO.forte,
    fontVariant: ['tabular-nums'],
  },

  situacao: {
    ...TIPOGRAFIA.dica,
    letterSpacing: 0.8,
    marginTop: ESPACO.xs,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SELETOR DE COMPETÊNCIA
  // ─────────────────────────────────────────────────────────────────────────
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusField,
    marginTop: ESPACO.lg,
    paddingHorizontal: ESPACO.xs,
  },

  /**
   * ⚠️ 44pt DE ALVO, E NÃO O TAMANHO DO ÍCONE. A seta desenhada tem 24pt; a área
   * tocável tem 44, que é o mínimo do HIG da Apple e o que o dedo realmente
   * acerta. Alvo pequeno funciona no rato do computador e falha no telefone — e
   * aqui não há rato.
   */
  seletorBotao: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PLATFORM.radiusField,
  },
  seletorMes: {
    ...TIPOGRAFIA.secao,
    fontWeight: PESO.forte,
    letterSpacing: 0.6,
    textAlign: 'center',
    flexShrink: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // O BOTÃO "VALORES + %" × "SÓ %"
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * ⚠️ `flexWrap` PORQUE SÃO DOIS CONTROLES NUMA LINHA ESTREITA. O seletor de
   * exibição e o botão "MEUS LANÇAMENTOS" não cabem lado a lado num telefone de
   * 360dp; sem a quebra, o segundo sairia da tela — e em React Native o que sai da
   * tela não aparece cortado: simplesmente some.
   */
  barraAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ESPACO.sm,
    marginTop: ESPACO.md,
  },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    minHeight: 44,
    paddingHorizontal: ESPACO.lg,
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderColor: BRAND.primaryEdge,
    backgroundColor: BRAND.surface,
  },
  botaoSecundarioTexto: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.primary,
    letterSpacing: 0.8,
  },
  /**
   * O seletor de duas posições. A "calha" cinza com as duas opções dentro é o que
   * faz ler como interruptor, e não como dois botões soltos — sem ela, a posição
   * inativa pareceria um botão desligado.
   */
  seletorModo: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: PLATFORM.radiusField,
    backgroundColor: BRAND.surfaceVariant,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  posicaoModo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.xs,
    minHeight: 40,
    paddingHorizontal: ESPACO.md,
    borderRadius: PLATFORM.radiusField - 2,
  },
  /** A posição em vigor: fundo próprio, para saltar da calha. */
  posicaoModoAtiva: { backgroundColor: BRAND.surface },
  /** Em vigor, mas imposta pelo Proprietário — sem o azul, que sugere escolha. */
  posicaoModoTravada: { backgroundColor: BRAND.surface },
  posicaoModoTexto: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
    letterSpacing: 0.8,
  },
  posicaoModoTextoAtiva: { color: BRAND.primary },
  posicaoModoTextoInerte: { color: BRAND.textFaint },

  // ─────────────────────────────────────────────────────────────────────────
  // AVISOS E ESTADOS
  // ─────────────────────────────────────────────────────────────────────────
  aviso: {
    flexDirection: 'row',
    gap: ESPACO.md,
    backgroundColor: BRAND.surfaceVariant,
    borderRadius: PLATFORM.radiusField,
    padding: ESPACO.lg,
    marginTop: ESPACO.lg,
  },
  avisoTexto: { ...TIPOGRAFIA.legenda, flexShrink: 1 },

  vazioTitulo: {
    ...TIPOGRAFIA.subtitulo,
    fontWeight: PESO.forte,
    textAlign: 'center',
    marginTop: ESPACO.lg,
  },
  vazioTexto: { ...TIPOGRAFIA.legenda, textAlign: 'center', marginTop: ESPACO.sm },

  // ─────────────────────────────────────────────────────────────────────────
  // A PORTA DO MÓDULO
  // ─────────────────────────────────────────────────────────────────────────
  portaLista: { gap: ESPACO.md, marginTop: ESPACO.lg },

  // ─────────────────────────────────────────────────────────────────────────
  // MEUS LANÇAMENTOS (19/09/2026)
  // ─────────────────────────────────────────────────────────────────────────
  listaLancamentos: { marginTop: ESPACO.md },
  itemLancamento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACO.md,
    minHeight: 56,
    paddingVertical: ESPACO.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  itemTitulo: { ...TIPOGRAFIA.legenda, fontWeight: PESO.forte, color: BRAND.text },
  itemDetalhe: { ...TIPOGRAFIA.dica, color: BRAND.textMuted, marginTop: 2 },
  itemValor: {
    ...TIPOGRAFIA.legenda,
    fontWeight: PESO.forte,
    fontVariant: ['tabular-nums'],
  },

  /**
   * A ficha abre como folha por cima, e não como tela empilhada.
   *
   * ⚠️ É UMA CONSULTA, NÃO UM DESTINO. Empilhar uma rota para ver seis campos
   * poria a ficha no histórico de navegação: o botão físico de voltar do Android
   * passaria a desfazer "abri a ficha" em vez de "entrei na lista", que é o que a
   * pessoa espera desfazer.
   */
  fichaFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  ficha: {
    maxHeight: '85%',
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: PLATFORM.radiusCard,
    borderTopRightRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
  },
  fichaTitulo: {
    ...TIPOGRAFIA.subtitulo,
    fontWeight: PESO.forte,
    marginBottom: ESPACO.md,
  },
  fichaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ESPACO.md,
    paddingVertical: ESPACO.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.borderSoft,
  },
  fichaRotulo: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
    letterSpacing: 0.8,
    flexShrink: 0,
  },
  fichaValor: {
    ...TIPOGRAFIA.legenda,
    color: BRAND.text,
    textAlign: 'right',
    flexShrink: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // A TELA DE LANÇAMENTO (19/09/2026)
  // ─────────────────────────────────────────────────────────────────────────
  rotuloCampo: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
    letterSpacing: 1,
    marginBottom: ESPACO.sm,
  },
  espacoCampo: { marginTop: ESPACO.lg },

  /**
   * ⚠️ O CAMPO DE DINHEIRO NÃO USA O `Input` DA PLATAFORMA, e a razão é o "R$"
   * fixo à esquerda: aquele componente põe ÍCONE nessa posição, não texto. Forçar
   * um ícone de cifrão traria um desenho estrangeiro ao lado de um número.
   */
  campoDinheiro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    minHeight: 48,
    paddingHorizontal: ESPACO.md,
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  campoDinheiroSimbolo: {
    ...TIPOGRAFIA.legenda,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
  },
  campoDinheiroTexto: {
    flex: 1,
    ...TIPOGRAFIA.corpo,
    color: BRAND.text,
    fontVariant: ['tabular-nums'],
    paddingVertical: ESPACO.sm,
  },

  // ── O campo que abre uma folha (conta movimento, data) ──────────────────
  campoSelecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACO.sm,
    minHeight: 48,
    paddingHorizontal: ESPACO.md,
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  campoSelecaoInerte: { opacity: 0.5 },
  campoSelecaoTexto: { ...TIPOGRAFIA.corpo, color: BRAND.text, flexShrink: 1 },
  campoSelecaoVazio: { color: BRAND.textFaint },

  // ── A folha que abre por cima (Modal) ───────────────────────────────────
  folha: { flex: 1, backgroundColor: BRAND.background, paddingTop: ESPACO.xxl },
  folhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    paddingHorizontal: ESPACO.lg,
  },
  folhaBusca: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: ESPACO.md,
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
    ...TIPOGRAFIA.corpo,
    color: BRAND.text,
  },
  folhaFechar: { minHeight: 48, justifyContent: 'center', paddingHorizontal: ESPACO.md },
  folhaFecharTexto: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.primary,
    letterSpacing: 0.8,
  },
  folhaDica: {
    ...TIPOGRAFIA.dica,
    color: BRAND.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: ESPACO.lg,
    paddingVertical: ESPACO.md,
  },
  folhaItem: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: ESPACO.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  folhaItemAtivo: { backgroundColor: BRAND.primarySoft },
  folhaItemTexto: { ...TIPOGRAFIA.corpo, color: BRAND.text },
  folhaItemTipo: { ...TIPOGRAFIA.dica, color: BRAND.textMuted, marginTop: 2 },

  // ── O calendário ────────────────────────────────────────────────────────
  calendarioTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACO.lg,
    marginBottom: ESPACO.md,
  },
  semana: { flexDirection: 'row', paddingHorizontal: ESPACO.lg },
  semanaLetra: {
    flex: 1,
    textAlign: 'center',
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.sm,
  },
  /**
   * ⚠️ `width: '14.2857%'` É 1/7 EXATO. Com `flex: 1` as células da última linha
   * (que quase nunca são sete) se esticariam para preencher a fila, e os dias
   * deixariam de ficar alinhados com os da linha de cima.
   */
  celula: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PLATFORM.radiusField,
  },
  celulaEscolhida: { backgroundColor: BRAND.primary },
  celulaTexto: { ...TIPOGRAFIA.corpo, color: BRAND.text },
  celulaTextoEscolhido: { color: BRAND.onPrimary, fontWeight: PESO.forte },
  celulaTextoHoje: { color: BRAND.primary, fontWeight: PESO.forte },

  // ── O tipo travado pelo tipo da conta ───────────────────────────────────
  tipoTravado: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: ESPACO.md,
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surfaceVariant,
  },
  tipoTravadoTexto: { ...TIPOGRAFIA.corpo, fontWeight: PESO.forte, color: BRAND.text },
  tipoTravadoMotivo: { ...TIPOGRAFIA.dica, color: BRAND.textMuted, marginTop: 2 },

  /** O rodapé explicativo do formulário — o mesmo texto do site. */
  notaDoFormulario: {
    ...TIPOGRAFIA.dica,
    color: BRAND.textMuted,
    letterSpacing: 0.6,
    marginTop: ESPACO.lg,
  },

  /** A conta que não está no orçamento: o lançamento grava, mas não há barra. */
  semBarra: {
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BRAND.border,
    backgroundColor: BRAND.surfaceVariant,
    padding: ESPACO.lg,
  },

  duasOpcoes: { flexDirection: 'row', gap: ESPACO.sm },
  /** ⚠️ 48pt de altura: é alvo de toque, não rótulo. */
  opcao: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PLATFORM.radiusField,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.surface,
  },
  opcaoAtiva: { borderColor: BRAND.primary, backgroundColor: BRAND.primarySoft },
  opcaoTexto: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.textMuted,
    letterSpacing: 0.8,
  },
  opcaoTextoAtiva: { color: BRAND.primary },

  /**
   * A área tocável de uma conta na lista do DINHEIRO DO PERÍODO.
   *
   * ⚠️ A MARGEM NEGATIVA É DE PROPÓSITO: ela devolve o espaço que o `padding`
   * consumiu, para o realce do toque ser MAIOR que a barra sem empurrar o layout.
   * É o mesmo gesto que a tela do site faz com `p-3 -m-3`.
   */
  linhaTocavel: {
    borderRadius: PLATFORM.radiusField,
    padding: ESPACO.sm,
    margin: -ESPACO.sm,
  },
});
