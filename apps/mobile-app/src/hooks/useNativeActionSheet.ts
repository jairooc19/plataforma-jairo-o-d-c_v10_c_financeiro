import { useCallback } from 'react';
import { Platform, ActionSheetIOS, Alert, type AlertButton } from 'react-native';

/** Uma ação do menu. `destrutiva` pinta de vermelho nos dois sistemas. */
export interface OpcaoDeAcao {
  titulo: string;
  aoTocar: () => void;
  destrutiva?: boolean;
}

export interface ConfigDeAcao {
  /** Título do menu. No iOS aparece acima das opções; no Android, na barra. */
  titulo?: string;
  /** Linha de apoio, abaixo do título. */
  mensagem?: string;
  /** Rótulo do botão de escape. Padrão: "Cancelar". */
  rotuloCancelar?: string;
}

/** Além disto, o AlertDialog do Android empilha os botões e fica ilegível. */
const MAX_ACOES_ANDROID = 3;

interface UseNativeActionSheet {
  mostrar: (opcoes: OpcaoDeAcao[], config?: ConfigDeAcao) => void;
}

/**
 * 📋 MENU DE AÇÕES DESENHADO PELO SISTEMA (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useNativeActionSheet.ts
 *
 * v9: [100% NATIVO — HOOK]
 * - iOS: `UIAlertController` no estilo action sheet, via `ActionSheetIOS`
 * - Android: `AlertDialog` do Material, via `Alert`
 * - Zero dependências novas: os dois vêm do próprio React Native
 *
 * 🎯 O PIXEL NÃO É NOSSO EM NENHUM DOS DOIS CAMINHOS. Não há `Modal`, `View`
 * nem `StyleSheet` aqui: quem desenha, anima, aplica o desfoque do iOS e o
 * ripple do Android é o sistema operacional. É por isso que o menu acompanha
 * automaticamente o modo escuro, o tamanho de fonte de acessibilidade e o
 * idioma do aparelho, sem uma linha nossa.
 *
 * ⚠️ **`ActionSheetAndroid` NÃO EXISTE — não procure por ele.** O React Native
 * expõe `ActionSheetIOS` e mais nada nessa família; uma busca por
 * "ActionSheetAndroid" em todo o `node_modules/react-native` não devolve
 * ocorrência nenhuma. Escrever `ActionSheetAndroid.showActionSheetWithOptions`
 * compila (o TypeScript não conhece o símbolo, então nem isso) e estoura no
 * aparelho com `ReferenceError`. O Android não tem action sheet no núcleo: o
 * equivalente desenhado pelo sistema é o `AlertDialog`, que é o que `Alert`
 * abre — e é nativo do mesmo jeito, só com outra forma.
 *
 * ⚠️ **NO MÁXIMO TRÊS AÇÕES NO ANDROID.** O `AlertDialog` posiciona os botões
 * em três papéis fixos (positivo, negativo e neutro); a partir do quarto, o
 * `Alert` do React Native simplesmente não os mostra. O iOS não tem esse teto e
 * rola a lista. Como o limite é do sistema e não nosso, o hook AVISA em
 * desenvolvimento em vez de fingir que coube.
 *
 * 🚫 **NÃO USE ISTO PARA O `SearchableSelect`.** Foi uma sugestão tentadora e
 * ela está errada: as listas daquele componente têm 250 países e 5.570
 * municípios. No Android, o teto acima elimina a ideia na origem; no iOS, um
 * action sheet com 5.570 linhas é uma parede rolante sem campo de busca —
 * estritamente pior que a folha atual, que filtra enquanto se digita. Action
 * sheet é para PUNHADO DE AÇÕES ("Editar", "Excluir"), não para escolher item
 * em catálogo. A folha do `SearchableSelect` continua sendo a ferramenta certa.
 *
 * 🔢 O BOTÃO DE CANCELAR VAI POR ÚLTIMO NO VETOR, e isso não é estética. Se ele
 * for o índice 0, todo retorno precisa de `opcoes[indice - 1]` — e essa
 * aritmética é onde mora o erro de um a menos que troca "Excluir" por "Editar"
 * em silêncio. Com o cancelar no fim, o índice devolvido indexa `opcoes`
 * diretamente. O iOS desenha o botão destacado embaixo de qualquer jeito, então
 * a ordem no vetor não muda o que o usuário vê.
 *
 * 🎨 `userInterfaceStyle` FICA DE FORA DE PROPÓSITO. Fixá-lo em `'dark'` daria
 * um menu escuro num app claro; deixando o campo ausente, o iOS segue a
 * aparência do sistema — que é o comportamento nativo que se quer.
 */
export function useNativeActionSheet(): UseNativeActionSheet {
  const mostrar = useCallback((opcoes: OpcaoDeAcao[], config?: ConfigDeAcao) => {
    if (opcoes.length === 0) return;

    const rotuloCancelar = config?.rotuloCancelar ?? 'Cancelar';

    if (Platform.OS === 'ios') {
      const indiceDestrutiva = opcoes.findIndex((o) => o.destrutiva);

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...opcoes.map((o) => o.titulo), rotuloCancelar],
          cancelButtonIndex: opcoes.length,
          // Ausente quando não há ação destrutiva: passar `-1` é território
          // não especificado da API, e omitir diz exatamente o que se quer.
          ...(indiceDestrutiva >= 0 ? { destructiveButtonIndex: indiceDestrutiva } : {}),
          title: config?.titulo,
          message: config?.mensagem,
        },
        (indice) => {
          // O cancelar é o último; qualquer índice válido indexa `opcoes` direto.
          opcoes[indice]?.aoTocar();
        }
      );
      return;
    }

    if (__DEV__ && opcoes.length > MAX_ACOES_ANDROID) {
      console.warn(
        `[ACTION-SHEET] ${opcoes.length} ações no Android: o AlertDialog do ` +
          `sistema mostra no máximo ${MAX_ACOES_ANDROID}. As excedentes não ` +
          'aparecem. Reduza as ações ou use uma folha própria.'
      );
    }

    const botoes: AlertButton[] = opcoes.map((o) => ({
      text: o.titulo,
      onPress: o.aoTocar,
      style: o.destrutiva ? 'destructive' : 'default',
    }));

    botoes.push({ text: rotuloCancelar, style: 'cancel' });

    Alert.alert(config?.titulo ?? '', config?.mensagem, botoes, { cancelable: true });
  }, []);

  return { mostrar };
}
