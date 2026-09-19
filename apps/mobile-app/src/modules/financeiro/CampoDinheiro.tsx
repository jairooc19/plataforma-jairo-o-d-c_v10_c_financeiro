import React, { memo, useCallback, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { paraCentavos, formatarBRL } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { estilosFin as e } from './estilos';

export interface CampoDinheiroProps {
  valorCentavos: number;
  onChange: (centavos: number) => void;
  desabilitado?: boolean;
}

/**
 * 💵 CAMPO DE VALOR EM REAIS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/CampoDinheiro.tsx
 *
 * A pessoa digita "1234,56" e o componente devolve **123456** — centavos
 * inteiros, que é a única forma que o resto do sistema aceita. A conversão usa
 * `paraCentavos` do Core, a mesma que o site usa e a mesma que o banco espera.
 *
 * ⚠️ NUNCA FAÇA A CONTA AQUI. `Number(texto) * 100` erra: `19.99 * 100` dá
 * `1998.9999999999998` em ponto flutuante, e o lançamento entra com um centavo a
 * menos. É a razão de o projeto proibir valor monetário em ponto flutuante.
 *
 * ===========================================================================
 * ⚠️ POR QUE ELE É MAIS SIMPLES QUE O DA WEB — E A DIFERENÇA É REAL
 * ===========================================================================
 * O `CampoDinheiro` do site carrega um `isTypingRef` para impedir que o cursor
 * salte para o fim a cada tecla (lição nº 7 do `CLAUDE.md`). Aquilo existe porque
 * lá o campo é CONTROLADO pelo valor formatado que volta do pai.
 *
 * Aqui o texto digitado é estado **local** e nunca é reescrito de fora: o pai
 * recebe os centavos, não devolve texto. Sem o ciclo de volta, não há salto de
 * cursor a evitar — e copiar o `isTypingRef` seria carregar a solução de um
 * problema que este componente não tem.
 *
 * ⚠️ O TEXTO INCOMPLETO NÃO APAGA O VALOR BOM. Digitar "1.", "-" ou "," faz o
 * `paraCentavos` estourar; o `catch` mantém o último valor válido em vez de zerar
 * o campo debaixo do dedo de quem está no meio de um número.
 *
 * 📱 `keyboardType="decimal-pad"` abre o teclado NUMÉRICO com vírgula. Com
 * `numeric` o Android não oferece o separador decimal em todos os teclados, e a
 * pessoa fica sem como digitar os centavos.
 */
function CampoDinheiroBase({ valorCentavos, onChange, desabilitado }: CampoDinheiroProps) {
  const [texto, setTexto] = useState(() =>
    valorCentavos ? (valorCentavos / 100).toFixed(2).replace('.', ',') : '',
  );

  const aoDigitar = useCallback(
    (bruto: string) => {
      setTexto(bruto);
      try {
        onChange(paraCentavos(bruto.trim() || '0'));
      } catch {
        // "1.", "," ou "-": número ainda incompleto. Mantém o último valor bom.
      }
    },
    [onChange],
  );

  /**
   * 💬 AO SAIR DO CAMPO, O VALOR SE ARRUMA (19/09/2026, pedido do dono do projeto).
   *
   * Digitar "1234" e avançar passa a mostrar **1.234,00**; "10,5" vira **10,50**.
   *
   * ⚠️ ISSO NÃO MUDA O VALOR — só a forma de mostrá-lo. Os centavos já tinham sido
   * calculados a cada tecla pelo `paraCentavos`; aqui só se reescreve o texto do
   * campo com `formatarBRL`, a MESMA função que desenha o número no resto do
   * sistema. É por isso que o campo passa a exibir exatamente o que a barra e o
   * extrato vão exibir depois de gravar.
   *
   * ⚠️ CAMPO VAZIO CONTINUA VAZIO. Escrever "0,00" em quem só tocou e saiu daria
   * ao formulário um valor que ninguém digitou — e o botão de gravar, que recusa
   * valor zero, passaria a parecer quebrado por outro motivo.
   *
   * ⚠️ E TEXTO INVÁLIDO É DEIXADO COMO ESTÁ. Quem saiu do campo com "1." ainda não
   * terminou de escrever; trocar aquilo pelo último valor bom apagaria o que a
   * pessoa tem na frente dos olhos sem ela ter pedido.
   */
  const aoSair = useCallback(() => {
    const bruto = texto.trim();
    if (bruto === '') return;
    try {
      setTexto(formatarBRL(paraCentavos(bruto), { semSimbolo: true }));
    } catch {
      // Número incompleto: deixa como está, para a pessoa terminar.
    }
  }, [texto]);

  return (
    <View style={e.campoDinheiro}>
      <Text style={e.campoDinheiroSimbolo}>R$</Text>
      <TextInput
        value={texto}
        onChangeText={aoDigitar}
        onBlur={aoSair}
        editable={!desabilitado}
        keyboardType="decimal-pad"
        placeholder="0,00"
        placeholderTextColor={BRAND.textFaint}
        style={e.campoDinheiroTexto}
        accessibilityLabel="Valor em reais"
      />
    </View>
  );
}

export const CampoDinheiro = memo(CampoDinheiroBase);
export default CampoDinheiro;
