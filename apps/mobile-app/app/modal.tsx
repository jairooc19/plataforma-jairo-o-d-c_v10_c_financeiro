import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/Colors';
import { usePlatform } from '@/hooks/usePlatform';
import Card from '@/components/card/Card';
import Button from '@/components/button/Button';

/**
 * 🪟 MODAL GENÉRICO (PJODC v10)
 * Local: apps/mobile-app/app/modal.tsx
 *
 * Rota apresentada como folha modal, declarada no `app/_layout.tsx`
 * (`presentation: 'modal'`). Hoje não tem conteúdo de negócio: os três módulos
 * funcionais foram removidos da plataforma em 2026-08-30 e nenhuma tela ainda
 * navega para cá.
 *
 * 🧱 ELA CONTINUA EXISTINDO PORQUE É O PONTO DE EXTENSÃO. O `Stack.Screen name="modal"`
 * do layout raiz aponta para este arquivo; apagá-lo deixaria a declaração
 * apontando para o nada, e a próxima tela modal teria de reconstruir a rota, a
 * apresentação e a área segura do zero.
 *
 * 📱 A BARRA DE STATUS FICA CLARA NO iOS: a folha modal deixa um espaço escuro
 * acima dela, e ícones escuros sobre fundo escuro somem.
 */
export default function ModalScreen() {
  const router = useRouter();
  const { isIOS } = usePlatform();

  return (
    <SafeAreaView style={estilos.tela} edges={['bottom']}>
      <StatusBar style={isIOS ? 'light' : 'auto'} />

      <View style={estilos.conteudo}>
        <Card>
          <Text style={estilos.titulo}>Nenhum conteúdo</Text>
          <Text style={estilos.corpo}>
            Esta folha ainda não tem conteúdo. Ela é o ponto de extensão para as
            telas modais dos próximos módulos.
          </Text>

          <Button title="Fechar" variant="secondary" onPress={() => router.back()} style={estilos.botao} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: BRAND.background },
  conteudo: { flex: 1, justifyContent: 'center', padding: 24 },
  titulo: {
    fontSize: 20,
    fontWeight: '900',
    color: BRAND.text,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  corpo: {
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  botao: { marginTop: 24 },
});
