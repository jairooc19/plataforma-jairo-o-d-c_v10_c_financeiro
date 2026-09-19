import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, FlatList, ActivityIndicator } from 'react-native';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

export interface OpcaoDeBusca {
  id: string;
  nome: string;
  tipo?: string;
}

export interface SelecaoComBuscaProps {
  /** O id do item escolhido, ou "" quando nada está escolhido. */
  valor: string;
  /** A lista já carregada — o que aparece ao abrir sem digitar nada. */
  opcoes: OpcaoDeBusca[];
  aoEscolher: (id: string) => void;
  /** A busca NO BANCO. Recebe o texto digitado, devolve até 4. */
  aoBuscar: (texto: string) => Promise<OpcaoDeBusca[]>;
  placeholder?: string;
  desabilitado?: boolean;
}

/**
 * 🔎 CAMPO QUE SE DIGITA **E** SE ESCOLHE DA LISTA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/SelecaoComBusca.tsx
 *
 * Espelho do `apps/admin-web/src/components/financeiro/SelecaoComBusca.tsx`, e
 * existe pelo mesmo pedido do dono do projeto (13/09/2026): *"apresenta a lista de
 * registro mas quero também poder digitar e ao digitar o primeiro caractere ir
 * apresentando os primeiros 4 registros existentes no banco de dados independente
 * da posição do caractere no registro."*
 *
 * São DOIS comportamentos no mesmo campo:
 *   • abriu sem digitar nada → a lista inteira já carregada;
 *   • digitou 1 caractere ou mais → **as 4 sugestões que o BANCO devolve**.
 *
 * ===========================================================================
 * ⚠️ POR QUE NÃO SERVIU O `SearchableSelect` DA PLATAFORMA
 * ===========================================================================
 * Aquele componente filtra **a lista que já está na memória** — e foi escrito para
 * dados FECHADOS (250 países, 5.570 municípios do IBGE), onde a lista completa cabe
 * no aparelho e nunca muda.
 *
 * O cadastro de contas de uma empresa é o oposto: aberto, crescente e paginado. A
 * lista carregada é só a **primeira página**. Numa empresa com 500 contas, o item
 * digitado poderia simplesmente não estar na memória, e o campo diria "nada
 * encontrado" sobre algo que existe. É proibição explícita do `CLAUDE.md`:
 * *"nunca filtrar no navegador uma lista que o banco já sabe buscar"*.
 *
 * ⚠️ "INDEPENDENTE DA POSIÇÃO" É O `%` DOS DOIS LADOS, e quem o faz é o banco:
 * `fin_buscar_contas_movimento` roda `LIKE '%texto%'` sobre `nome_normalizado` (sem
 * acento, em maiúsculas) e corta em 4. Um `LIKE 'texto%'` acharia "LUZ" ao digitar
 * "LU", mas nunca acharia "CONTA DE LUZ".
 *
 * ⚠️ O `debounce` DE 250ms NÃO É ENFEITE. Sem ele, digitar "ALUGUEL" dispara SETE
 * chamadas ao banco — e num telemóvel em rede móvel as respostas chegam fora de
 * ordem, fazendo a lista piscar e podendo terminar mostrando o resultado de "ALUG"
 * depois do de "ALUGUEL". O contador `buscaAtual` descarta a resposta atrasada
 * mesmo assim, porque o debounce **reduz** a corrida, não a elimina.
 *
 * 📱 A LISTA ABRE NUM `Modal`, e não num painel flutuante. É a mesma razão do
 * `SearchableSelect` da plataforma: o React Native não tem `position: fixed`, e um
 * painel dentro de um `ScrollView` seria recortado pelo `overflow`.
 */
function SelecaoComBuscaBase({
  valor,
  opcoes,
  aoEscolher,
  aoBuscar,
  placeholder = 'DIGITE OU ESCOLHA',
  desabilitado,
}: SelecaoComBuscaProps) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [sugestoes, setSugestoes] = useState<OpcaoDeBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  /** Descarta resposta atrasada: só a busca mais recente pode escrever na lista. */
  const buscaAtual = useRef(0);

  const escolhido = opcoes.find((o) => o.id === valor) ?? null;

  useEffect(() => {
    if (!aberto) return;

    const termo = texto.trim();
    if (termo.length === 0) {
      setSugestoes([]);
      setBuscando(false);
      return;
    }

    const minha = ++buscaAtual.current;
    setBuscando(true);

    const relogio = setTimeout(async () => {
      try {
        const achadas = await aoBuscar(termo);
        // ⚠️ A resposta só vale se for da busca mais recente.
        if (buscaAtual.current === minha) setSugestoes(achadas);
      } catch {
        if (buscaAtual.current === minha) setSugestoes([]);
      } finally {
        if (buscaAtual.current === minha) setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(relogio);
  }, [texto, aberto, aoBuscar]);

  const escolher = useCallback(
    (opcao: OpcaoDeBusca) => {
      aoEscolher(opcao.id);
      setAberto(false);
      setTexto('');
    },
    [aoEscolher],
  );

  /** O que a lista mostra agora: as 4 do banco, ou a lista inteira já carregada. */
  const lista = texto.trim().length > 0 ? sugestoes : opcoes;

  return (
    <>
      <Pressable
        onPress={() => !desabilitado && setAberto(true)}
        style={[e.campoSelecao, desabilitado && e.campoSelecaoInerte]}
        accessibilityRole="button"
        accessibilityLabel={escolhido ? escolhido.nome : placeholder}
      >
        <Text
          style={[e.campoSelecaoTexto, !escolhido && e.campoSelecaoVazio]}
          numberOfLines={1}
        >
          {escolhido ? escolhido.nome : placeholder}
        </Text>
        <IconeFin nome="proximo" tamanho={ICONE.pequeno} cor={BRAND.textMuted} />
      </Pressable>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={e.folha}>
          <View style={e.folhaTopo}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="DIGITE PARA PROCURAR NO CADASTRO"
              placeholderTextColor={BRAND.textFaint}
              style={e.folhaBusca}
              autoFocus
              autoCorrect={false}
            />
            <Pressable onPress={() => setAberto(false)} style={e.folhaFechar} hitSlop={8}>
              <Text style={e.folhaFecharTexto}>FECHAR</Text>
            </Pressable>
          </View>

          {/*
            ⚠️ A FRASE DIZ DE ONDE VEIO A LISTA. Sem ela, quem digita e vê 4 itens
            pensa que a empresa só tem 4 contas — e quem não digita nada e vê 50
            pensa que são todas. São coisas diferentes, e dizer qual é qual custa
            uma linha.
          */}
          <Text style={e.folhaDica}>
            {texto.trim().length > 0
              ? 'ATÉ 4 SUGESTÕES, BUSCADAS NO BANCO'
              : 'AS CONTAS JÁ CARREGADAS — DIGITE PARA PROCURAR NO CADASTRO INTEIRO'}
          </Text>

          {buscando ? (
            <View style={e.centro}>
              <ActivityIndicator color={BRAND.primary} />
            </View>
          ) : (
            <FlatList
              data={lista}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={e.folhaDica}>
                  NADA ENCONTRADO PARA &quot;{texto.trim()}&quot; NO CADASTRO.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => escolher(item)}
                  style={[e.folhaItem, item.id === valor && e.folhaItemAtivo]}
                  accessibilityRole="button"
                >
                  <Text style={e.folhaItemTexto} numberOfLines={2}>
                    {item.nome}
                  </Text>
                  {!!item.tipo && <Text style={e.folhaItemTipo}>{item.tipo}</Text>}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

export const SelecaoComBusca = memo(SelecaoComBuscaBase);
export default SelecaoComBusca;
