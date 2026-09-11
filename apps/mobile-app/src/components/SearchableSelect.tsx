import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, StyleSheet } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import Animated from 'react-native-reanimated';
import { BRAND, PLATFORM } from '@/constants/Colors';
import Button from '@/components/button/Button';
import GestureArea from '@/components/GestureArea';
import { useSheetDragGesture } from '@/hooks/useSheetDragGesture';
import { authStyles } from './auth/authStyles';

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/**
 * 🔍 SELECT COM BUSCA — VERSÃO REACT NATIVE (PJODC v10)
 * Local: apps/mobile-app/src/components/SearchableSelect.tsx
 *
 * Equivalente do `apps/admin-web/src/components/SearchableSelect.tsx`. Existe
 * porque as listas desta plataforma são grandes demais para um seletor comum:
 * 250 países e 5.570 municípios do IBGE. Rolar até "TOCANTINS" num picker
 * nativo é sofrimento; digitar "toc" não é.
 *
 * 📱 POR QUE UM MODAL E NÃO UM DROPDOWN FLUTUANTE: no navegador, a web resolve
 * o recorte por containers com `overflow` usando `position: fixed` e
 * `getBoundingClientRect()` (lição 4 do CLAUDE.md). O React Native não tem
 * `position: fixed` nem viewport de CSS — a solução equivalente é o `Modal`,
 * que já renderiza acima de toda a árvore, imune a qualquer `overflow` de
 * ScrollView. Também resolve de graça o problema da lição 8 (menu escondido
 * atrás da barra do sistema).
 *
 * ✋ O ARRASTO PARA BAIXO VOLTOU NA v9 [OTIMIZADO PARA MÁXIMA PERFORMANCE].
 * Puxar a alça mais de 100dp fecha a folha, e o painel acompanha o dedo na
 * thread de UI via Reanimated — o JS não participa do movimento. A mecânica
 * inteira mora em `hooks/useSheetDragGesture.ts`; aqui só se monta o resultado.
 *
 * 📱 EM EXPO GO O GESTO NÃO EXISTE, e é por isso que a alça é CONDICIONAL.
 * A v3 do `react-native-gesture-handler` não roda lá (ver `lib/gestureRuntime.ts`),
 * então `disponivel` sai `false`, o `GestureArea` sai da frente e a barrinha não
 * é desenhada. Aquela alça é a promessa visual de que a folha se arrasta:
 * mantê-la sem o gesto convidaria o usuário a tentar uma ação que não acontece,
 * o que é pior do que não a oferecer.
 *
 * 🚪 AS OUTRAS SAÍDAS CONTINUAM TODAS, nos dois ambientes — o gesto é um luxo,
 * não a única porta:
 *   1. tocar no fundo escurecido fecha (`Pressable` de tela cheia, atrás);
 *   2. o botão "Fechar" continua onde estava;
 *   3. o botão físico de voltar do Android fecha (`onRequestClose`).
 * O primeiro é o mais importante: tocar fora para dispensar é a convenção que o
 * usuário já espera de uma folha, e não custa gesto nenhum.
 *
 * ⚠️ `COUNTRIES` e `BRAZIL_STATES` do Core são `{ label, value }[]`, NUNCA
 * strings. Renderizar `{option}` direto imprimiria "[object Object]" — é a
 * proibição registrada no CLAUDE.md, e vale igual aqui.
 */
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled,
  loading,
  testID,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    if (!busca.trim()) return options;
    const alvo = busca.toUpperCase();
    return options.filter((o) => o.label.toUpperCase().includes(alvo));
  }, [options, busca]);

  const rotuloAtual = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  );
  const inativo = disabled || loading;

  const fechar = useCallback(() => setAberto(false), []);

  const { gesto, estiloAnimado, disponivel, reposicionar } = useSheetDragGesture(fechar);

  const abrir = useCallback(() => {
    if (inativo) return;
    // A folha é reaberta, não recriada: zerar o deslocamento aqui garante que
    // ela nasça encostada no rodapé mesmo depois de um arrasto interrompido.
    reposicionar();
    setBusca('');
    setAberto(true);
  }, [inativo, reposicionar]);

  const escolher = useCallback(
    (opcao: SelectOption) => {
      onChange(opcao.value);
      setAberto(false);
    },
    [onChange]
  );

  const renderizarItem = useCallback(
    ({ item }: ListRenderItemInfo<SelectOption>) => (
      <ItemOpcao item={item} selecionado={item.value === value} onPress={escolher} />
    ),
    [value, escolher]
  );

  const extrairChave = useCallback((item: SelectOption) => item.value, []);

  return (
    <>
      <Pressable
        style={[authStyles.campo, estilos.gatilho, inativo && estilos.inativo]}
        onPress={abrir}
        disabled={inativo}
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: !!inativo, expanded: aberto }}
        accessibilityLabel={rotuloAtual ?? placeholder}
      >
        <Text style={rotuloAtual ? estilos.valor : estilos.placeholder} numberOfLines={1}>
          {loading ? 'Carregando...' : rotuloAtual || placeholder}
        </Text>
        <Text style={estilos.seta}>▾</Text>
      </Pressable>

      <Modal visible={aberto} animationType="slide" transparent onRequestClose={fechar}>
        <View style={estilos.fundoModal}>
          {/*
            Fundo tocável, ATRÁS do painel. `StyleSheet.absoluteFill` o faz
            cobrir a tela inteira; o painel vem depois no JSX e por isso fica
            por cima, recebendo os toques que lhe pertencem.
          */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={fechar}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Fechar a lista"
          />

          <Animated.View style={[estilos.painel, estiloAnimado]}>
            {/*
              A zona de arrasto é só o cabeçalho da folha. Envolver o painel
              inteiro faria o `Pan` disputar cada rolagem da `FlatList` logo
              abaixo — ver o cabeçalho de `useSheetDragGesture`.
            */}
            {disponivel && (
              <GestureArea gesto={gesto}>
                <View
                  style={estilos.zonaArrasto}
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel="Arraste para baixo para fechar a lista"
                >
                  <View style={estilos.alcaArrasto} />
                </View>
              </GestureArea>
            )}

            <TextInput
              style={[authStyles.campo, authStyles.campoTexto, estilos.busca]}
              placeholder="Buscar..."
              placeholderTextColor={BRAND.textFaint}
              value={busca}
              onChangeText={setBusca}
              autoFocus
              accessibilityLabel="Buscar na lista"
            />

            <FlatList
              data={filtradas}
              keyExtractor={extrairChave}
              renderItem={renderizarItem}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={estilos.vazio}>Nenhum resultado.</Text>}
            />

            <Button title="Fechar" variant="secondary" onPress={fechar} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Uma opção da lista.
 *
 * ⚠️ ESTÁ NO NÍVEL DO MÓDULO, e não dentro do `SearchableSelect`. Declarar um
 * componente dentro de outro cria um tipo novo a cada render do pai: a
 * `FlatList` não o reconhece como o mesmo componente e remonta todas as linhas
 * visíveis a cada tecla digitada na busca — com 5.570 municípios, isso se vê.
 */
const ItemOpcao = memo(function ItemOpcao({
  item,
  selecionado,
  onPress,
}: {
  item: SelectOption;
  selecionado: boolean;
  onPress: (opcao: SelectOption) => void;
}) {
  const escolher = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      style={estilos.item}
      onPress={escolher}
      accessible
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      accessibilityLabel={item.label}
    >
      <Text style={[estilos.itemTexto, selecionado && estilos.itemAtivo]}>{item.label}</Text>
    </Pressable>
  );
});

const estilos = StyleSheet.create({
  gatilho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inativo: { opacity: 0.5 },
  valor: { fontSize: 15, color: BRAND.text, flex: 1 },
  placeholder: { fontSize: 15, color: BRAND.textMuted, flex: 1 },
  seta: { fontSize: 14, color: BRAND.textMuted, marginLeft: 8 },

  fundoModal: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  painel: {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: PLATFORM.radiusCard,
    borderTopRightRadius: PLATFORM.radiusCard,
    padding: 20,
    maxHeight: '75%',
  },
  busca: { marginBottom: 12 },

  /**
   * A área tocável da alça é bem maior do que a barrinha visível: 40x5dp seria
   * um alvo impossível para o polegar. O `paddingVertical` compensa o desenho
   * discreto sem que a folha ganhe altura perceptível, e o `marginTop` negativo
   * recupera o espaço que o `padding` do painel já dava.
   */
  zonaArrasto: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: -12,
    marginBottom: 4,
  },
  alcaArrasto: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BRAND.border,
  },

  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  itemTexto: { fontSize: 15, color: BRAND.text },
  itemAtivo: { color: BRAND.primary, fontWeight: '800' },
  vazio: { textAlign: 'center', color: BRAND.textMuted, paddingVertical: 24, fontSize: 14 },
});

export default memo(SearchableSelect);
