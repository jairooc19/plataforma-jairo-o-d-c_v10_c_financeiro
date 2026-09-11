import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Icon from '@/components/icon/Icon';
import { extrairIniciais } from './iniciais';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, ICONE, RAIO, DURACAO } from '@/constants/Spacing';

interface ProfileIdentityProps {
  nome?: string | null;
  email?: string | null;
  /** Sem perfil a mostrar (Desenvolvedor ou falha de leitura): avatar genérico. */
  indisponivel?: boolean;
}

/**
 * 🪪 O TOPO DO MEU PERFIL: avatar, nome e e-mail (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/ProfileIdentity.tsx
 *
 * 🔤 O AVATAR MOSTRA INICIAIS, E NÃO UMA FOTO. A plataforma não guarda imagem de
 * perfil em lugar nenhum — nem coluna em `public.users`, nem bucket no Storage.
 * Um espaço reservado de foto anunciaria um recurso que não existe e convidaria
 * ao toque que não faz nada. Iniciais sobre a cor da marca resolvem o mesmo
 * problema de identificação, e são o que o próprio Gmail faz sem foto.
 *
 * 🧱 SAIU DO `ProfileScreen` NA v9, quando a tela ganhou edição e exclusão: o
 * orquestrador passou a escolher entre três painéis, e o bloco de identidade é o
 * único pedaço que aparece nos três. Deixá-lo inline faria o arquivo que decide
 * o painel também desenhar um avatar.
 */
export default function ProfileIdentity({ nome, email, indisponivel = false }: ProfileIdentityProps) {
  const iniciais = useMemo(() => extrairIniciais(nome, email), [nome, email]);

  return (
    <Animated.View entering={FadeInDown.duration(DURACAO.media)} style={estilos.raiz}>
      <View style={estilos.avatar}>
        {indisponivel ? (
          <Icon name="Avatar" size={ICONE.grande} color={BRAND.onPrimary} strokeWidth={1.75} />
        ) : (
          <Text style={estilos.iniciais}>{iniciais}</Text>
        )}
      </View>

      <Text style={estilos.nome} numberOfLines={2}>
        {indisponivel ? 'Sem perfil' : nome?.trim() || 'Sem nome'}
      </Text>

      {!indisponivel && !!email && (
        <Text style={estilos.email} numberOfLines={1}>
          {email}
        </Text>
      )}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    alignItems: 'center',
    marginBottom: ESPACO.xxl,
  },

  /**
   * 📐 88pt DE AVATAR. O desenho pedia 80; 88 é múltiplo de 8 e cai na grade,
   * então a coluna inteira permanece alinhada. A diferença de 8 pontos não se
   * percebe; um valor fora da grade, ao longo de uma tela, sim.
   */
  avatar: {
    width: 88,
    height: 88,
    borderRadius: RAIO.circulo,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ESPACO.lg,
  },
  iniciais: {
    fontSize: 32,
    fontWeight: '700',
    color: BRAND.onPrimary,
    letterSpacing: 1,
  },

  nome: {
    ...TIPOGRAFIA.titulo,
    textAlign: 'center',
  },
  email: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
    marginTop: ESPACO.xs,
  },
});
