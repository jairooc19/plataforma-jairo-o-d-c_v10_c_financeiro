import { StyleSheet } from 'react-native';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS COMPARTILHADOS DA GUARITA MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/authStyles.ts
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 *
 * ⚠️ ESTE ARQUIVO NÃO É A FONTE DA PALETA NEM DA ESCALA. A cor nasce em
 * `constants/Colors.ts`, o corpo de texto em `constants/Typography.ts` e a folga
 * em `constants/Spacing.ts`. Aqui só se COMPÕE o que é específico das telas de
 * autenticação — e mesmo isso vem encolhendo a cada refatoração, o que é o
 * sinal de que está no caminho certo.
 *
 * 🔁 `CORES` CONTINUA EXPORTADO POR COMPATIBILIDADE, mas é só um apelido de
 * `BRAND`. Código novo deve importar `useTheme()` ou `BRAND` diretamente —
 * manter os dois nomes vivos indefinidamente recria o problema que a
 * consolidação resolveu.
 *
 * 📦 O QUE SOBROU AQUI: tela, rolagem, título, subtítulo e a caixa de mensagem.
 * Botão, campo e cartão vivem em `components/button/`, `components/input/` e
 * `components/card/` — eles não são "de autenticação", são de toda a aplicação.
 */

/** @deprecated Apelido de `BRAND` (`constants/Colors.ts`). Prefira `useTheme()`. */
export const CORES = {
  fundo: BRAND.background,
  cartao: BRAND.surface,
  borda: BRAND.border,
  texto: BRAND.text,
  textoFraco: BRAND.textMuted,
  azul: BRAND.primary,
  azulClaro: BRAND.primarySoft,
  erro: BRAND.error,
  erroFundo: BRAND.errorSoft,
  sucesso: BRAND.success,
  sucessoFundo: BRAND.successSoft,
  ambar: BRAND.warning,
  ambarFundo: BRAND.warningSoft,
};

export const authStyles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: BRAND.background },

  /**
   * 📏 A MARGEM LATERAL CAIU DE 24 PARA 16, que é `ESPACO.lg` e a margem padrão
   * de toda tela do app. Vinte e quatro de cada lado num telefone de 360dp
   * deixava 312dp de conteúdo; com 16 sobram 328. Num formulário de e-mail, são
   * esses 16 pontos que decidem se "voce@exemplo.com" cabe na linha ou some
   * atrás de reticências.
   */
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: ESPACO.lg,
    paddingVertical: ESPACO.xl,
  },

  /** @deprecated Use `<Card>` (`components/card/Card.tsx`). */
  cartao: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.xl,
  },

  /**
   * 🔠 O TÍTULO PERDEU A CAIXA ALTA E O PESO 900. Em versal, "USUÁRIO
   * PROPRIETÁRIO" ocupa quase toda a largura de um telefone estreito e quebra em
   * duas linhas; em caixa mista cabe numa. E o peso `900` da São Francisco em
   * 26pt fecha as contraformas do "a" e do "e" — o Black da fonte foi desenhado
   * para manchete de jornal, não para título de tela de 4 polegadas.
   */
  titulo: {
    ...TIPOGRAFIA.titulo,
    textAlign: 'center',
  },

  subtitulo: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
    marginTop: ESPACO.sm,
  },

  /** @deprecated Use a prop `label` do `<Input>`. */
  rotulo: {
    ...TIPOGRAFIA.rotulo,
    marginBottom: ESPACO.xs,
    marginTop: ESPACO.lg,
  },

  /**
   * A MOLDURA de um campo: linha inferior e altura. Sem tipografia.
   *
   * ⚠️ ESTE ESTILO PRECISA SER `ViewStyle` PURO, e a separação não é
   * arrumação. O `SearchableSelect` o aplica em DOIS papéis diferentes: num
   * `Pressable` (o gatilho que abre a folha) e num `TextInput` (a busca dentro
   * dela). Um `StyleSheet` que misture `fontSize`/`color` vira `TextStyle` aos
   * olhos do TypeScript, e o `Pressable` passa a recusá-lo — foi exatamente o
   * erro que apareceu quando a tipografia foi espalhada aqui dentro. Texto de
   * campo vem de `campoTexto`, abaixo.
   *
   * @deprecated Para um campo de formulário use `<Input>`
   * (`components/input/Input.tsx`). Isto sobrevive para o `SearchableSelect`,
   * que não é um campo de texto e precisa apenas da mesma moldura.
   */
  campo: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingVertical: ESPACO.md,
    minHeight: 56,
  },

  /** O TEXTO de um campo. Componha com `campo` onde houver texto de verdade. */
  campoTexto: TIPOGRAFIA.corpo,

  espacoBotao: { marginTop: ESPACO.xl },
  espacoBotaoCurto: { marginTop: ESPACO.md },

  mensagem: {
    borderRadius: PLATFORM.radiusControl,
    padding: ESPACO.md,
    marginTop: ESPACO.lg,
    // Barra de cor à esquerda em vez de contorno completo: a mensagem se
    // identifica pela faixa sem desenhar mais uma caixa dentro do cartão.
    borderLeftWidth: 3,
  },
  mensagemTexto: TIPOGRAFIA.legenda,

  rodape: { marginTop: ESPACO.xl, alignItems: 'center' },
  rodapeTexto: {
    ...TIPOGRAFIA.dica,
    fontSize: 10,
    textAlign: 'center',
  },
});

/**
 * Cores da caixa de mensagem conforme o tipo.
 *
 * ⚠️ `borderColor` ALIMENTA A FAIXA ESQUERDA, não um contorno — ver
 * `borderLeftWidth` acima. Trocar para `borderWidth` devolveria o quadro
 * completo que a refatoração tirou.
 */
export function estiloMensagem(tipo: 'success' | 'error' | 'info') {
  if (tipo === 'success') {
    return { backgroundColor: BRAND.successSoft, borderColor: BRAND.success, cor: BRAND.success };
  }
  if (tipo === 'error') {
    return { backgroundColor: BRAND.errorSoft, borderColor: BRAND.error, cor: BRAND.error };
  }
  return { backgroundColor: BRAND.primarySoft, borderColor: BRAND.primary, cor: BRAND.primary };
}
