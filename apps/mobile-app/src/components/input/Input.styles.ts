import { StyleSheet } from 'react-native';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, TOQUE } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS DO CAMPO DE TEXTO (PJODC v10)
 * Local: apps/mobile-app/src/components/input/Input.styles.ts
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 *
 * 📉 O CAMPO PERDEU A CAIXA E GANHOU UMA LINHA. Até esta refatoração ele era um
 * retângulo com borda de 1,5pt nos quatro lados, canto arredondado e fundo
 * cinza — o desenho de um `<input>` estilizado. Agora é texto sobre o fundo da
 * tela, com uma única linha embaixo.
 *
 * 🎯 POR QUE ISSO NÃO É PREFERÊNCIA. A caixa fechada compete com o cartão que a
 * contém: dois retângulos arredondados aninhados, o de dentro repetindo a forma
 * do de fora, e o olho lê o formulário como uma pilha de caixas em vez de uma
 * lista de perguntas. A linha inferior é o que o Material Design chama de campo
 * "filled/underlined" e o que todo aplicativo de transporte usa na tela de
 * entrada: ela marca onde escrever sem desenhar mais uma moldura.
 *
 * ⚠️ A LINHA ENGROSSA NO FOCO EM VEZ DE SÓ MUDAR DE COR, e isso é acessibilidade,
 * não estilo. Distinguir foco APENAS por matiz exclui quem não separa azul de
 * cinza — cerca de 8% dos homens têm alguma deficiência de visão de cores. Com a
 * espessura dobrando junto, o estado de foco continua legível em escala de
 * cinza. É o mesmo critério que faz o erro trazer texto, e não só borda vermelha.
 *
 * 📏 A ALTURA MÍNIMA É `TOQUE.grande` (56), NÃO `TOQUE.minimo` (48). Sem a caixa
 * para delimitá-lo, o campo depende da própria altura para dizer onde termina a
 * área tocável — e uma linha fina com pouco espaço acima é um alvo que o polegar
 * erra. Os 56 devolvem em área o que a moldura deixou de dar em contorno.
 */
export const inputStyles = StyleSheet.create({
  container: { marginTop: ESPACO.lg },

  /**
   * O rótulo é miúdo e cinza porque, sem caixa, ele fica visualmente MUITO
   * próximo do texto digitado — em corpo grande os dois se confundiriam numa
   * coisa só, e o usuário leria o rótulo como parte do valor.
   */
  label: {
    ...TIPOGRAFIA.rotulo,
    marginBottom: ESPACO.xs,
  },

  /**
   * A linha vive AQUI, no envelope, e não no `TextInput`.
   *
   * ⚠️ ISSO É OBRIGATÓRIO, NÃO ARRUMAÇÃO. Um `TextInput` do Android com
   * `borderBottomWidth` desenha a borda ABAIXO do sublinhado nativo do próprio
   * campo, e ficam duas linhas empilhadas. Pôr a borda no `View` que o envolve
   * dá uma linha só, idêntica nas duas plataformas — e é o que permite ao ícone
   * e ao botão do olho ficarem DENTRO da mesma linha, em vez de flutuarem sobre
   * o texto.
   */
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    minHeight: TOQUE.grande,
    paddingHorizontal: 0,
  },

  linhaFocada: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND.primary,
  },
  linhaErro: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND.error,
  },
  linhaDesabilitada: { opacity: 0.5 },

  /**
   * ⚠️ `paddingVertical: 0` E ALTURA TOTAL NO CAMPO. O `TextInput` do Android
   * carrega um recheio vertical próprio que ninguém pediu; deixá-lo empurra o
   * texto para baixo da linha de base e desalinha o campo do ícone ao lado. A
   * altura fica com o envelope (`linha`), e o campo apenas a preenche.
   */
  campo: {
    flex: 1,
    ...TIPOGRAFIA.corpo,
    color: BRAND.text,
    paddingVertical: 0,
    // `height: '100%'` faria o cursor nascer no topo no iOS; o alinhamento
    // vertical fica por conta do `alignItems: 'center'` do envelope.
  },

  /**
   * O botão do olho é um alvo de 48pt, mesmo desenhando um ícone de 20.
   * Área tocável e área desenhada são coisas diferentes — a segunda é o que se
   * vê, a primeira é o que decide se o toque acerta.
   */
  botaoOlho: {
    width: TOQUE.minimo,
    height: TOQUE.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    // Puxa o alvo até a borda do campo sem empurrar o texto: o recheio do botão
    // já dá o respiro, e a margem negativa evita somar folga sobre folga.
    marginRight: -ESPACO.md,
  },

  erro: {
    ...TIPOGRAFIA.dica,
    color: BRAND.error,
    fontWeight: '600',
    marginTop: ESPACO.sm,
  },

  ajuda: {
    ...TIPOGRAFIA.dica,
    marginTop: ESPACO.sm,
  },
});
