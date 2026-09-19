import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_VERSION, rotuloDosModulosInstalados } from '@jairo/core';

import { usePlatform } from '@/hooks/usePlatform';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import BrandMark from '@/components/BrandMark';
import { BRAND } from '@/constants/Colors';
import { authStyles } from './authStyles';

export interface AuthScreenProps {
  children: React.ReactNode;
  /**
   * Esconde a marca no topo. Use nas telas longas de formulário (cadastro,
   * completar perfil), onde o símbolo empurraria o primeiro campo para fora da
   * dobra.
   */
  semMarca?: boolean;
}

/**
 * 🧩 O RÓTULO DOS MÓDULOS DESTA INSTALAÇÃO, calculado UMA vez no carregamento do
 * módulo JavaScript — não a cada renderização.
 *
 * ⚠️ POR QUE FORA DO COMPONENTE. `MODULOS_INSTALADOS` é uma constante do Core: a
 * resposta é a mesma durante toda a vida do processo. Chamar a função dentro do
 * corpo do componente a executaria em cada uma das sete telas da guarita, a cada
 * toque de tecla que as re-renderizasse, para produzir sempre a mesma string.
 *
 * ⚠️ E NOTE O QUE ESTE ARQUIVO **NÃO** TEM: o nome de nenhum módulo. Ele pede o
 * rótulo ao registro e desenha. Com um módulo plugado sai "MÓDULO: CONTROLE
 * FINANCEIRO"; com dois, "MÓDULOS: A · B"; com nenhum, `null` — e a linha
 * simplesmente não existe. Ver `packages/core/src/modules/registro.ts`.
 */
const ROTULO_DOS_MODULOS = rotuloDosModulosInstalados();

/**
 * 🖼️ MOLDURA DAS TELAS DE AUTENTICAÇÃO (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/AuthScreen.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - A marca abre a tela, acima do cartão
 * - Barra de status transparente, para o app pintar sob ela
 *
 * As sete rotas de `(auth)/` compartilham exatamente a mesma casca: área segura,
 * rolagem, fuga do teclado e rodapé com a versão. Um componente só evita sete
 * cópias — e, mais importante, evita que seis telas ganhem o
 * `KeyboardAvoidingView` e uma fique sem, escondendo o botão de enviar atrás do
 * teclado só naquela.
 *
 * ⚠️ O `SafeAreaView` VEM DE `react-native-safe-area-context`, NUNCA do
 * `react-native`. O nativo é obsoleto e só faz alguma coisa no iOS — no Android
 * ele é um `View` comum, e o conteúdo passa por baixo da barra de status e da
 * barra de gestos. Com `edgeToEdgeEnabled: true` no `app.json` (que este projeto
 * usa) isso deixa de ser detalhe: o Android desenha o app sob as barras do
 * sistema por padrão.
 *
 * 🎨 A BARRA DE STATUS É TRANSLÚCIDA COM ÍCONES ESCUROS. `translucent` faz o
 * fundo da tela subir por baixo dela em vez de parar numa faixa cinza — é o que
 * dá a impressão de tela cheia que todo aplicativo nativo tem. Os ícones ficam
 * escuros porque o fundo desta guarita é claro; num painel escuro a escolha se
 * inverte, e é por isso que o `DeveloperDashboard` declara a sua própria.
 *
 * ⌨️ O COMPORTAMENTO DO TECLADO VEM DE `usePlatform().tokens`, não de um
 * ternário escrito aqui: `'padding'` no iOS, `'height'` no Android. São de fato
 * diferentes — o iOS não reposiciona nada sozinho, o Android já encolhe a janela
 * pelo `windowSoftInputMode`, e forçar `padding` lá produz um salto duplo.
 *
 * 🏷️ O RODAPÉ E A MARCA SOMEM COM O TECLADO ABERTO. Numa tela de nove campos
 * eles seriam empurrados contra o teclado e roubariam a linha onde o próximo
 * campo deveria aparecer. A versão e o símbolo não são urgentes; o campo que se
 * está preenchendo é.
 */
export default function AuthScreen({ children, semMarca = false }: AuthScreenProps) {
  const { tokens } = usePlatform();
  const tecladoAberto = useKeyboardOpen();

  const mostrarMarca = !semMarca && !tecladoAberto;

  return (
    <SafeAreaView style={authStyles.tela} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView style={estiloFlex} behavior={tokens.keyboardBehavior}>
        <ScrollView
          contentContainerStyle={authStyles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mostrarMarca && <BrandMark subtitulo={ROTULO_DOS_MODULOS} />}

          {children}

          {!tecladoAberto && (
            <View style={authStyles.rodape}>
              <Text style={authStyles.rodapeTexto}>
                © 2026. Todos os direitos reservados para Jairo Oliveira da Cunha.
              </Text>
              <Text style={authStyles.rodapeTexto}>Versão: {APP_VERSION}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Fora do `StyleSheet.create` de propósito: é um objeto de um campo usado uma
 * vez, e registrá-lo no `StyleSheet` para isso só acrescentaria um nome a
 * procurar depois. `BRAND` fica importado para o `backgroundColor` do
 * `SafeAreaView`, que vem de `authStyles.tela`.
 */
const estiloFlex = { flex: 1, backgroundColor: BRAND.background };
