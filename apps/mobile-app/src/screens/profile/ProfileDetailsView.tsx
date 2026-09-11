import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { UserProfile } from '@jairo/core';

import Button from '@/components/button/Button';
import ProfileRow from './ProfileRow';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

interface ProfileDetailsViewProps {
  perfil: UserProfile;
  onEditar: () => void;
  onApagar: () => void;
  onSair: () => void;
}

/**
 * 👤 VIEW: PERFIL EM LEITURA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/ProfileDetailsView.tsx
 *
 * Só desenha. Espelha o `ProfileDetailsView` da web, inclusive na escolha do que
 * NÃO é editável: e-mail e forma de acesso aparecem mas não entram no formulário
 * — quem os define é o Google (ou o cadastro original), e mudá-los aqui
 * descolaria o perfil da conta em `auth.users`.
 *
 * 🎨 A ORDEM DOS TRÊS BOTÕES É DELIBERADA: editar (ação comum, cor da marca),
 * sair (ação frequente, contorno) e apagar (irreversível, vermelho, por último).
 * Pôr "Apagar Conta" ao lado de "Editar" é o desenho que produz o toque errado —
 * na web eles também estão separados, e por baixo de uma divisória.
 */
export default function ProfileDetailsView({
  perfil,
  onEditar,
  onApagar,
  onSair,
}: ProfileDetailsViewProps) {
  return (
    <>
      <Text style={estilos.tituloSecao}>Conta</Text>
      <View style={estilos.grupo}>
        <ProfileRow icone="Email" rotulo="E-mail" valor={perfil.email} />
        <ProfileRow
          icone="Escudo"
          rotulo="Entrou por"
          valor={perfil.auth_provider === 'google' ? 'Google' : 'E-mail e senha'}
          ultima
        />
      </View>

      <Text style={estilos.tituloSecao}>Localização</Text>
      <View style={estilos.grupo}>
        <ProfileRow icone="Planeta" rotulo="Planeta" valor={perfil.planet} />
        <ProfileRow icone="Planeta" rotulo="País" valor={perfil.country} />
        <ProfileRow icone="Local" rotulo="Estado" valor={perfil.state} />
        <ProfileRow icone="Local" rotulo="Cidade" valor={perfil.city} ultima />
      </View>

      <Button
        title="Editar perfil"
        variant="primary"
        size="large"
        icon="Editar"
        onPress={onEditar}
        testID="btn-editar-perfil"
      />

      <Button
        title="Sair da conta"
        variant="outline"
        size="large"
        icon="Sair"
        onPress={onSair}
        style={estilos.espacado}
        testID="btn-sair-perfil"
      />

      <View style={estilos.zonaPerigo}>
        <Button
          title="Apagar conta"
          variant="danger"
          size="large"
          icon="Apagar"
          onPress={onApagar}
          testID="btn-apagar-conta"
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tituloSecao: {
    ...TIPOGRAFIA.rotulo,
    marginBottom: ESPACO.sm,
    marginLeft: ESPACO.xs,
  },
  grupo: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    paddingHorizontal: ESPACO.lg,
    marginBottom: ESPACO.xl,
  },
  espacado: { marginTop: ESPACO.md },

  /** A divisória é o que separa a ação sem volta das ações do dia a dia. */
  zonaPerigo: {
    marginTop: ESPACO.xl,
    paddingTop: ESPACO.xl,
    borderTopWidth: 1,
    borderTopColor: BRAND.divider,
  },
});
