import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '@/components/input/Input';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, RAIO } from '@/constants/Spacing';

interface ColorFieldProps {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
}

/** `#` seguido de 3 ou 6 dígitos hexadecimais — o que o CSS e o RN aceitam. */
const HEX_VALIDO = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * 🎨 UM CAMPO DE COR — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/ColorField.tsx
 *
 * ⚠️ NÃO EXISTE `<input type="color">` NO REACT NATIVE, e é aqui que o mobile
 * diverge da web por limitação de plataforma, não por escolha. Na web o campo é
 * um par: o seletor nativo do sistema operacional e a caixa hexadecimal ao lado.
 * Aqui existe só a caixa — e, no lugar do seletor, uma AMOSTRA que se pinta ao
 * vivo com o que se digita.
 *
 * A alternativa seria uma roda de cores desenhada à mão ou uma biblioteca de
 * terceiro. Nenhuma das duas se justifica: este campo é usado por uma pessoa
 * (o Desenvolvedor), em uma tela, e o valor que ele quer normalmente já vem
 * copiado de algum lugar em hexadecimal. A amostra resolve o que o seletor
 * resolveria — ver a cor antes de salvar.
 *
 * ✅ A AMOSTRA SÓ SE PINTA COM HEXADECIMAL VÁLIDO. Passar `"#12"` ao
 * `backgroundColor` do React Native não avisa nada: no Android a cor
 * simplesmente não é aplicada, no iOS o comportamento varia. Um quadro que
 * continua com a cor anterior enquanto se digita mentiria sobre o que está
 * gravado — por isso, inválido, ele fica xadrez de "sem cor" (o cinza da borda)
 * e o campo mostra o erro.
 */
export default function ColorField({ rotulo, valor, onChange }: ColorFieldProps) {
  const valido = HEX_VALIDO.test(valor.trim());

  const aoDigitar = useCallback(
    (texto: string) => {
      // O usuário quase sempre cola sem o `#`. Aceitar os dois é gentileza barata.
      const limpo = texto.trim();
      onChange(limpo && !limpo.startsWith('#') ? `#${limpo}` : limpo);
    },
    [onChange]
  );

  return (
    <View style={estilos.raiz}>
      <Text style={estilos.rotulo}>{rotulo}</Text>

      <View style={estilos.linha}>
        <View
          style={[
            estilos.amostra,
            valido ? { backgroundColor: valor.trim() } : estilos.amostraInvalida,
          ]}
          accessible
          accessibilityLabel={`Amostra da cor ${rotulo}: ${valido ? valor : 'valor inválido'}`}
        />

        <Input
          value={valor}
          onChangeText={aoDigitar}
          placeholder="#RRGGBB"
          autoCapitalize="none"
          autoCorrect={false}
          error={valido ? undefined : 'Use #RGB ou #RRGGBB'}
          containerStyle={estilos.campo}
          accessibilityLabel={rotulo}
          testID={`cor-${rotulo}`}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { marginBottom: ESPACO.md },
  rotulo: TIPOGRAFIA.dica,

  linha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ESPACO.md,
  },

  amostra: {
    width: 44,
    height: 44,
    borderRadius: RAIO.selo,
    borderWidth: 1,
    borderColor: BRAND.border,
    marginTop: ESPACO.sm,
  },
  amostraInvalida: { backgroundColor: BRAND.surfaceVariant },

  campo: { flex: 1, marginTop: 0 },
});
