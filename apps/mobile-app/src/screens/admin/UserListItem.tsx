import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { AdminUser } from '@jairo/core';

import Icon from '@/components/icon/Icon';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE, RAIO, TOQUE } from '@/constants/Spacing';

interface UserListItemProps {
  usuario: AdminUser;
  /** Pendente ganha destaque âmbar; operacional, o ponto verde de "ativo". */
  pendente: boolean;
  onPress: () => void;
}

/**
 * 👤 UM USUÁRIO NA CENTRAL DE COMANDOS (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/UserListItem.tsx
 *
 * A web desenha um cartão largo com o botão de ação à direita
 * ("HABILITAR INFRAESTRUTURA" / "GERENCIAR HABILITAÇÕES"). No telemóvel não há
 * largura para texto e botão lado a lado, então A LINHA INTEIRA É O ALVO e o
 * chevron indica que ela leva a algum lugar — o padrão de lista de ajustes das
 * duas plataformas.
 *
 * 🎨 A COR DIZ O ESTADO ANTES DA LEITURA: âmbar para quem aguarda triagem, verde
 * para quem já opera. São as mesmas duas cores da web, e é o que permite varrer
 * a tela sem ler nome por nome.
 *
 * ➖ SEM NOME VIRA "USUÁRIO SEM NOME", e não espaço em branco: quem entra pelo
 * Google e não completou o cadastro ainda não tem `full_name`, e uma linha só
 * com e-mail lê-se como registro corrompido.
 */
export default function UserListItem({ usuario, pendente, onPress }: UserListItemProps) {
  const cor = pendente ? BRAND.warning : BRAND.success;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [estilos.raiz, pressed && estilos.pressionado]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        pendente
          ? `Habilitar infraestrutura para ${usuario.full_name || usuario.email}`
          : `Gerenciar habilitações de ${usuario.full_name || usuario.email}`
      }
      testID={`usuario-${usuario.id}`}
    >
      <View style={[estilos.marca, { backgroundColor: cor }]} />

      <View style={estilos.textos}>
        <Text style={estilos.nome} numberOfLines={1}>
          {usuario.full_name?.trim() || 'Usuário sem nome'}
        </Text>
        <Text style={estilos.email} numberOfLines={1}>
          {usuario.email}
        </Text>
      </View>

      <Icon name="Avancar" size={ICONE.pequeno} color={BRAND.textFaint} strokeWidth={2} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    minHeight: TOQUE.grande,
    paddingVertical: ESPACO.md,
    paddingHorizontal: ESPACO.lg,
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
  },
  pressionado: { backgroundColor: BRAND.surfaceVariant },

  /** Ponto de estado — a mesma leitura do círculo pulsante da web, sem o pulso. */
  marca: {
    width: 8,
    height: 8,
    borderRadius: RAIO.circulo,
  },

  textos: { flex: 1 },
  nome: {
    ...TIPOGRAFIA.corpo,
    fontWeight: '600',
  },
  email: {
    ...TIPOGRAFIA.dica,
    marginTop: 1,
  },
});
