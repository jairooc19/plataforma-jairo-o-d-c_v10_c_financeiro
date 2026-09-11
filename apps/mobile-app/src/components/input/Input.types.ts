import type { TextInputProps, StyleProp, ViewStyle } from 'react-native';
import type { NomeIcone } from '@/components/icon/Icon';

/**
 * Props do campo de texto.
 *
 * Estende `TextInputProps` de propósito: `keyboardType`, `autoCapitalize`,
 * `autoComplete`, `maxLength` e companhia continuam disponíveis sem que este
 * arquivo precise reescrever cada uma. Só o que o `Input` acrescenta ou muda
 * está declarado abaixo.
 */
export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Rótulo em caixa alta acima do campo. Omitir só em campos de busca. */
  label?: string;

  value: string;
  onChangeText: (texto: string) => void;

  /**
   * Ícone à esquerda, dentro da linha do campo.
   *
   * 🎯 ELE MUDA DE COR COM O FOCO, junto da linha — é o que faz o campo ativo
   * saltar num formulário de seis perguntas. Use com parcimônia: um ícone em
   * cada campo devolve ao formulário o ruído que a retirada da caixa eliminou.
   */
  icon?: NomeIcone;

  /**
   * Mensagem de erro. Quando presente, pinta a linha de vermelho e aparece
   * abaixo do campo — não substitui a validação, apenas a mostra.
   */
  error?: string;

  /** Texto de apoio permanente (formato esperado, dica de preenchimento). */
  ajuda?: string;

  disabled?: boolean;

  /**
   * Campo de senha com botão de revelar. Não use `secureTextEntry` direto:
   * este sinalizador é que desenha o olho e gerencia o alternar.
   */
  senha?: boolean;

  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}
