import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Card from '@/components/card/Card';
import Button from '@/components/button/Button';
import AuthMessage from './AuthMessage';
import { authStyles } from './authStyles';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';
import type { AuthMessage as TipoMensagem } from '@/hooks/useAuthLogicMobile';

interface Props {
  onGoogleSignIn: () => void;
  loading: boolean;
  message: TipoMensagem | null;
  onBack: () => void;
}

/**
 * 🔵 VIEW: LOGIN DO PROPRIETÁRIO VIA GOOGLE — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/LoginGoogleView.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Botão do Google em `outline` de 56pt, o padrão de acesso social
 * - Divisor "ou" separando o acesso social do resto da tela
 *
 * Espelho do `LoginGoogleView.tsx` da web (que se chamava `LoginGoogleOwnerView`
 * até 13/09/2026 — nome corrigido aqui em 17/09/2026): **nenhum campo**. Sem e-mail,
 * sem senha, sem "esqueci minha senha" — não há senha a esquecer. Quem guarda a
 * credencial é o Google.
 *
 * 📱 A DIFERENÇA VISÍVEL EM RELAÇÃO À WEB: lá o `@react-oauth/google` desenha o
 * botão oficial do Google e abre um popup. Aqui o botão é nosso e abre o
 * navegador do sistema — o usuário sai do app, autentica no Google e volta pelo
 * deep link. Por isso o aviso abaixo do botão: sem ele, ver o navegador abrindo
 * parece falha do app, e o usuário fecha antes de terminar.
 *
 * ⚠️ O BOTÃO É `outline`, E NUNCA DEVE SER `primary`. As diretrizes de marca do
 * Google para "Fazer login com o Google" exigem fundo branco (ou o cinza
 * escuro/azul oficiais) com a marca em cor — pintar o botão de azul-marinho da
 * NOSSA marca e escrever "Entrar com Google" em cima é uso indevido da marca de
 * terceiro. O contorno neutro é a forma correta e, de quebra, é a que o usuário
 * reconhece como acesso social em qualquer aplicativo.
 *
 * ⚠️ NÃO HÁ CAMINHO DE RESERVA AQUI, ao contrário da web. Lá o segundo caminho
 * existe porque, sem `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, o popup não tem como
 * existir. No mobile o único caminho JÁ É o do Supabase por redirecionamento —
 * ele não depende de Client ID no app, então não há o que faltar.
 */
function LoginGoogleView({ onGoogleSignIn, loading, message, onBack }: Props) {
  return (
    <Card>
      <Text style={authStyles.titulo}>Usuário Proprietário</Text>
      <Text style={authStyles.subtitulo}>
        O acesso do Proprietário é feito exclusivamente pela sua conta Google.
      </Text>

      <View style={estilos.divisor}>
        <View style={estilos.linha} />
        <Text style={estilos.divisorTexto}>entrar com</Text>
        <View style={estilos.linha} />
      </View>

      <Button
        title="Continuar com Google"
        variant="outline"
        size="large"
        icone={MARCA_GOOGLE}
        onPress={onGoogleSignIn}
        loading={loading}
        accessibilityLabel="Entrar com a sua conta Google"
        testID="btn-google"
      />

      <Text style={estilos.aviso}>
        Você será levado ao navegador para autenticar e voltará ao aplicativo em seguida.
      </Text>

      <AuthMessage message={message} />

      <Button
        title="Voltar ao início"
        variant="ghost"
        icon="Voltar"
        onPress={onBack}
        disabled={loading}
        style={estilos.voltar}
      />
    </Card>
  );
}

const estilos = StyleSheet.create({
  /**
   * ⚠️ ESTE É O ÚNICO HEXADECIMAL LITERAL DO APLICATIVO, e ele é legítimo: o
   * azul #4285F4 é a cor da marca GOOGLE, não da nossa. Cor de terceiro não
   * pertence a `constants/Colors.ts` — pô-la lá sugeriria que é um token da
   * plataforma, disponível para qualquer tela usar, quando na verdade só pode
   * aparecer onde o Google é citado.
   */
  marcaGoogle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },

  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    marginTop: ESPACO.xl,
    marginBottom: ESPACO.lg,
  },
  linha: {
    flex: 1,
    height: 1,
    backgroundColor: BRAND.divider,
  },
  divisorTexto: TIPOGRAFIA.dica,

  aviso: {
    ...TIPOGRAFIA.dica,
    textAlign: 'center',
    marginTop: ESPACO.md,
  },

  voltar: { marginTop: ESPACO.sm },
});

/**
 * A marca do Google como elemento constante.
 *
 * ⚠️ FICA DEPOIS DO `StyleSheet.create`, e isso não é estética: `const` no nível
 * do módulo está na zona morta temporal até a linha ser executada. Declarada
 * antes de `estilos`, esta constante leria um objeto ainda não inicializado — o
 * TypeScript acusa "usada antes da declaração" e, em execução, seria
 * `undefined`.
 */
const MARCA_GOOGLE = <Text style={estilos.marcaGoogle}>G</Text>;

export default memo(LoginGoogleView);
