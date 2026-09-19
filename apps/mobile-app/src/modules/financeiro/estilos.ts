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
  barraAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    marginTop: ESPACO.md,
  },
  botaoModo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    minHeight: 44,
    paddingHorizontal: ESPACO.lg,
    borderRadius: PLATFORM.radiusField,
    backgroundColor: BRAND.primarySoft,
  },
  /** Bloqueado pelo Proprietário: cinza, e sem resposta ao toque. */
  botaoModoTravado: { backgroundColor: BRAND.surfaceVariant },
  botaoModoTexto: {
    ...TIPOGRAFIA.dica,
    fontWeight: PESO.forte,
    color: BRAND.primary,
    letterSpacing: 1,
  },
  botaoModoTextoTravado: { color: BRAND.textMuted },

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
  portaSecao: { ...TIPOGRAFIA.secao, fontWeight: PESO.medio, marginTop: ESPACO.xl },
});
