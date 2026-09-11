import type { StyleProp, ViewStyle } from 'react-native';
import type { NomeIcone } from '@/components/icon/Icon';

export interface MenuCardProps {
  /** Ícone que identifica a opção. Ver o registro em `components/icon/Icon.tsx`. */
  icon: NomeIcone;
  /** Título da opção. Curto — ele divide a linha com o ícone e o chevron. */
  title: string;
  /** Uma linha dizendo o que a opção faz. Duas, no máximo. */
  description: string;

  /**
   * Ação do toque.
   *
   * ⚠️ É OPCIONAL, E A AUSÊNCIA TEM SIGNIFICADO: sem `onPress` o cartão nasce
   * inerte e se anuncia como tal ao leitor de tela. Não passe uma função vazia
   * para "resolver" o tipo — um cartão que responde ao toque com silêncio lê-se
   * como aplicativo quebrado, que é precisamente o que `emBreve` evita.
   */
  onPress?: () => void;

  /**
   * Recurso ainda não construído: apaga o cartão, troca o chevron por um selo
   * "EM BREVE" e ignora o toque.
   */
  emBreve?: boolean;

  /**
   * Cor do ícone e da sua tinta de fundo. Padrão: o azul da marca.
   *
   * Use para separar famílias de opção numa lista longa (técnico em azul,
   * destrutivo em vermelho) — não para colorir cada cartão de um tom diferente,
   * que devolve a tela ao aspecto de menu de aplicativo genérico.
   */
  cor?: string;

  /**
   * Posição na lista, para o escalonamento da entrada. Passe o índice do `map`.
   * Ausente, o cartão entra sem atraso.
   */
  indice?: number;

  /**
   * Paleta escura — hoje só o Painel de Engenharia, a única tela de fundo
   * escuro da plataforma.
   *
   * ⚠️ ISTO PRECISA SER UMA PROP, E NÃO UM `style` DE FORA. Sobrescrever apenas
   * o `backgroundColor` pelo `style` pinta o cartão de escuro e deixa título e
   * descrição nas cores claras que o `StyleSheet` interno declara — texto quase
   * preto sobre superfície quase preta, ilegível. Cor de texto de filho não se
   * herda em React Native: cada `<Text>` resolve a sua, e só quem está dentro do
   * componente as alcança.
   */
  escuro?: boolean;

  style?: StyleProp<ViewStyle>;
  testID?: string;
}
