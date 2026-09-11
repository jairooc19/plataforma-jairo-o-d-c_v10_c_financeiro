import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { BRAND, PLATFORM, elevacao } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, TOQUE, ICONE } from '@/constants/Spacing';
import type { ButtonVariant, ButtonSize } from './Button.types';

/**
 * 🎨 ESTILOS DO BOTÃO (PJODC v10)
 * Local: apps/mobile-app/src/components/button/Button.styles.ts
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 *
 * Separado do componente pela regra de ouro do CLAUDE.md: o `.tsx` cuida de
 * comportamento e animação, este arquivo cuida de aparência. Trocar a marca não
 * deve exigir abrir um arquivo que tem `useSharedValue` dentro.
 *
 * ⚠️ NENHUM HEXADECIMAL LITERAL AQUI. Tudo vem de `constants/Colors.ts`, e o
 * raio vem de `PLATFORM` — o iOS usa cantos mais arredondados que o Material 3,
 * e escrever um número fixo faria o botão parecer estrangeiro numa das duas
 * plataformas.
 *
 * 🔠 O TEXTO DEIXOU DE SER CAIXA ALTA NESTA REFATORAÇÃO, e a razão não é gosto.
 * `textTransform: 'uppercase'` em botão é herança do Material Design 1 (2014); o
 * Material 3 abandonou a prática em 2021 e o HIG do iOS nunca a teve. Palavras
 * em versal perdem o perfil ascendente/descendente que o olho usa para
 * reconhecer a forma da palavra, então "CONFIGURAÇÕES" é medivelmente mais lento
 * de ler que "Configurações" — e num botão, ler rápido é a função inteira. Todo
 * aplicativo de transporte usa caixa mista nos botões pelo mesmo motivo.
 */

/** Alturas e folgas de cada tamanho. */
const TAMANHOS: Record<ButtonSize, ViewStyle> = {
  small: {
    minHeight: TOQUE.pequeno,
    paddingVertical: ESPACO.sm,
    paddingHorizontal: ESPACO.md,
    gap: ESPACO.xs,
  },
  medium: {
    minHeight: TOQUE.medio,
    paddingVertical: ESPACO.md,
    paddingHorizontal: ESPACO.lg,
    gap: ESPACO.sm,
  },
  large: {
    minHeight: TOQUE.grande,
    paddingVertical: ESPACO.lg,
    paddingHorizontal: ESPACO.xl,
    gap: ESPACO.sm,
  },
};

/** Corpo do texto conforme o tamanho. */
const TEXTOS: Record<ButtonSize, TextStyle> = {
  small: { ...TIPOGRAFIA.botao, fontSize: 13 },
  medium: TIPOGRAFIA.botao,
  large: { ...TIPOGRAFIA.botao, fontSize: 16 },
};

/** Ícone proporcional ao tamanho — 20pt no padrão, ver `ICONE`. */
const ICONES: Record<ButtonSize, number> = {
  small: ICONE.mini,
  medium: ICONE.pequeno,
  large: ICONE.medio,
};

export const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PLATFORM.radiusControl,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  larguraTotal: { alignSelf: 'stretch' },

  /**
   * ⚠️ `opacity` NO CONTÊINER, e não cor cinza no texto. Um botão desabilitado
   * precisa perder peso INTEIRO — fundo, borda, texto e ícone juntos. Clarear só
   * o texto deixa o fundo azul-marca em plena força, e um retângulo azul vivo
   * continua parecendo tocável por mais pálido que esteja o rótulo.
   */
  desabilitado: { opacity: 0.4 },
});

export function estiloTamanho(tamanho: ButtonSize) {
  return {
    container: TAMANHOS[tamanho],
    texto: TEXTOS[tamanho],
    icone: ICONES[tamanho],
  };
}

/** Cores de fundo, borda e conteúdo de cada variante. */
export function estiloVariante(variante: ButtonVariant): { container: ViewStyle; cor: string } {
  switch (variante) {
    case 'primary':
      return {
        container: {
          backgroundColor: BRAND.primary,
          borderColor: BRAND.primary,
          ...elevacao(2),
        },
        cor: BRAND.onPrimary,
      };

    /**
     * Cinza chapado, SEM borda. Um cinza claro com contorno cinza é o visual de
     * `<button>` sem estilo de navegador — a diferença mais visível entre uma
     * tela nativa e uma página web embutida.
     */
    case 'secondary':
      return {
        container: {
          backgroundColor: BRAND.surfaceVariant,
          borderColor: 'transparent',
        },
        cor: BRAND.text,
      };

    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: BRAND.border,
        },
        cor: BRAND.text,
      };

    /**
     * ⚠️ TEXTO VERMELHO SOBRE FUNDO CLARO, e não fundo vermelho cheio. Vermelho
     * chapado é o que as duas plataformas reservam para a confirmação FINAL de
     * uma destruição (o botão dentro do alerta). Usá-lo no botão que apenas ABRE
     * a pergunta gasta o sinal antes da hora: quando o alerta aparecer, o
     * usuário já viu aquele vermelho e ele deixou de significar "atenção".
     */
    case 'danger':
      return {
        container: {
          backgroundColor: BRAND.errorSoft,
          borderColor: 'transparent',
        },
        cor: PLATFORM.destructive,
      };

    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        },
        cor: BRAND.textMuted,
      };
  }
}
