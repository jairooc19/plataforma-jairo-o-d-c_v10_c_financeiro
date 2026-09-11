import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon, { type NomeIcone } from '@/components/icon/Icon';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE } from '@/constants/Spacing';

interface ProfileRowProps {
  icone: NomeIcone;
  rotulo: string;
  valor?: string | null;
  /** A última linha do grupo não leva divisor: ele bateria no canto arredondado. */
  ultima?: boolean;
}

/**
 * ➖ UMA LINHA DE DADO DO PERFIL (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/ProfileRow.tsx
 *
 * ⚠️ ARQUIVO PRÓPRIO, E NÃO UMA FUNÇÃO DENTRO DA VIEW. Declarar um componente
 * dentro de outro cria um TIPO NOVO a cada render do pai: o React não o
 * reconhece como o mesmo componente e desmonta e remonta a subárvore inteira, o
 * que aqui significa perder o foco de qualquer campo vizinho. É a proibição
 * "nunca criar componentes dentro de renders" do CLAUDE.md.
 *
 * ➖ CAMPO VAZIO VIRA TRAVESSÃO, e não string em branco. Uma linha com rótulo e
 * nada à frente lê-se como falha de carregamento; o travessão diz "consultamos e
 * está vazio", que é outra informação.
 */
export default function ProfileRow({ icone, rotulo, valor, ultima = false }: ProfileRowProps) {
  return (
    <View style={[estilos.linha, ultima && estilos.linhaUltima]}>
      <Icon name={icone} size={ICONE.pequeno} color={BRAND.textFaint} strokeWidth={2} />

      <View style={estilos.textos}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor} numberOfLines={2}>
          {valor?.trim() || '—'}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    paddingVertical: ESPACO.md,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.divider,
  },
  linhaUltima: { borderBottomWidth: 0 },

  textos: { flex: 1 },
  rotulo: TIPOGRAFIA.dica,
  valor: {
    ...TIPOGRAFIA.corpo,
    fontWeight: '600',
    marginTop: 1,
  },
});
