import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { BRAND } from '@/constants/Colors';
import Button from '@/components/button/Button';

/**
 * 🚧 ROTA NÃO ENCONTRADA (PJODC v10)
 * Local: apps/mobile-app/app/+not-found.tsx
 *
 * Destino de qualquer endereço que o Expo Router não reconheça — na prática, um
 * deep link errado ou desatualizado (o retorno do OAuth do Google chega por
 * deep link, e uma URL de redirecionamento mal configurada aterrissa aqui).
 *
 * ⚠️ A SAÍDA É `replace`, NÃO `push`. Um push empilharia a guarita POR CIMA
 * desta tela, e o botão físico de voltar do Android traria o usuário de volta ao
 * erro. `replace` troca a entrada da pilha: o beco sem saída deixa de existir.
 */
export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: 'Endereço não encontrado' }} />

      <View style={estilos.conteudo}>
        <Text style={estilos.icone}>🧭</Text>
        <Text style={estilos.titulo}>Endereço não encontrado</Text>
        <Text style={estilos.corpo}>
          A tela que você tentou abrir não existe nesta versão do aplicativo.
        </Text>

        <Button
          title="Ir para o Início"
          onPress={() => router.replace('/(auth)')}
          style={estilos.botao}
          testID="btn-voltar-inicio"
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: BRAND.background },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icone: { fontSize: 44, marginBottom: 16 },
  titulo: {
    fontSize: 20,
    fontWeight: '900',
    color: BRAND.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  corpo: {
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  botao: { marginTop: 28, alignSelf: 'stretch' },
});
