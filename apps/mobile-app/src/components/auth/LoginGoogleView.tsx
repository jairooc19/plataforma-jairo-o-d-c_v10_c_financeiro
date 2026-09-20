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
import type { PapelDeAcesso } from '@/services/papelDeAcessoService';

interface Props {
  papel: PapelDeAcesso;
  onGoogleSignIn: () => void;
  loading: boolean;
  message: TipoMensagem | null;
  onBack: () => void;
}

/**
 * 🔵 VIEW: LOGIN VIA GOOGLE — PROPRIETÁRIO **E** DEPENDENTE — MOBILE (PJODC v10)
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
 * ===========================================================================
 * 👥 O DEPENDENTE CHEGOU AQUI EM 20/09/2026 — E ATÉ ENTÃO NÃO ENTRAVA
 * ===========================================================================
 * Ele era mandado ao formulário de e-mail e senha. Para ter senha, precisaria se
 * cadastrar; o botão de cadastro saiu do menu na v7, e o `SignUpView` só é
 * alcançável pelo desvio de planeta. **Não existia caminho nenhum.** A web
 * descobriu e corrigiu isso em 13/09/2026; o aplicativo ficou para trás, com a
 * divergência anotada em `app/(auth)/login.tsx` à espera de decisão.
 *
 * A porta do Google resolve porque ela CRIA A CONTA no primeiro acesso, pelo
 * gatilho `on_auth_user_created` (com a rede de segurança
 * `ensure_google_user_profile` logo atrás).
 *
 * ⚠️ UMA TELA, DOIS PAPÉIS — e a diferença entre eles é SÓ texto. A mecânica do
 * OAuth é a mesma, o botão é o mesmo, a chamada é a mesma. Duplicar este arquivo
 * num `LoginGoogleDependentView` faria duas cópias divergirem no dia em que o
 * botão do Google mudasse de forma.
 *
 * ⚠️ E O AVISO DO DEPENDENTE NÃO É ENFEITE. O primeiro acesso dele SEMPRE termina
 * em "sem vínculo" — é o normal, não a exceção. Sem dizer de antemão que falta um
 * convite, e de quem ele depende, a pessoa lê aquele desfecho como falha do
 * aplicativo e tenta de novo, indefinidamente.
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
function LoginGoogleView({ papel, onGoogleSignIn, loading, message, onBack }: Props) {
  const ehDono = papel === 'OWNER';

  return (
    <Card>
      <Text style={authStyles.titulo}>
        {ehDono ? 'Usuário Proprietário' : 'Usuário Dependente'}
      </Text>
      <Text style={authStyles.subtitulo}>
        {ehDono
          ? 'O acesso do Proprietário é feito exclusivamente pela sua conta Google.'
          : 'O acesso do Dependente é feito exclusivamente pela sua conta Google.'}
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

      {/* Ver a nota do cabeçalho: sem isto, o desfecho normal do primeiro
          acesso do Dependente parece defeito. */}
      {!ehDono && (
        <Text style={estilos.primeiroAcesso}>
          No primeiro acesso, entre aqui uma vez para que a sua conta exista. Depois,
          peça ao Proprietário da empresa para incluir este mesmo e-mail na equipe dele.
        </Text>
      )}

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

  /**
   * ⚠️ `color` DEPOIS DO ESPALHAMENTO, sempre. `TIPOGRAFIA.dica` traz `color`
   * própria, e em objeto literal a ÚLTIMA chave ganha: declarada antes, a cor
   * pedida aqui simplesmente não valeria — e o pior é que a linha continuaria
   * escrita no arquivo, parecendo cumprida.
   */
  primeiroAcesso: {
    ...TIPOGRAFIA.dica,
    color: BRAND.text,
    textAlign: 'center',
    backgroundColor: BRAND.surfaceVariant,
    borderRadius: 12,
    padding: ESPACO.md,
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
