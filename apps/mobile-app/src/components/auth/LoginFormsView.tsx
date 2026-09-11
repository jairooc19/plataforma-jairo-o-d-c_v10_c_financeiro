import React, { memo, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';

import Card from '@/components/card/Card';
import Button from '@/components/button/Button';
import Input from '@/components/input/Input';
import AuthMessage from './AuthMessage';
import { authStyles } from './authStyles';
import { ESPACO } from '@/constants/Spacing';
import type { AuthFormData, AuthFormErrors } from '@/hooks/useAuthForm';
import type { AuthMessage as TipoMensagem } from '@/hooks/useAuthLogicMobile';

interface Props {
  modo: 'login-dependent' | 'login-developer';
  formData: AuthFormData;
  errors: AuthFormErrors;
  podeEnviar: boolean;
  onChange: (campo: keyof AuthFormData, valor: string) => void;
  onSubmit: () => void;
  loading: boolean;
  message: TipoMensagem | null;
  onBack: () => void;
}

/**
 * 🔒 VIEW: LOGIN POR E-MAIL E SENHA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/LoginFormsView.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Campos de linha inferior com ícone, no lugar das caixas com borda
 * - Ação principal em botão `large` (56pt), a única da tela
 *
 * Espelho do `LoginFormsView.tsx` da web. Atende DOIS acessos, nunca três:
 * Dependente e Desenvolvedor.
 *
 * ⚠️ O PROPRIETÁRIO NÃO PASSA POR AQUI. Ele entra exclusivamente pelo Google
 * desde a v5 — rotear `login-owner` para este formulário é proibição explícita
 * do CLAUDE.md. Quem o atende é o `LoginGoogleView`.
 *
 * 🔧 O DESENVOLVEDOR não toca no Supabase: a credencial é fixa no Core
 * (`authService.developerSignIn`). Por isso a tela muda só o rótulo — a decisão
 * de qual caminho seguir é do hook, que já sabe pelo `view`.
 *
 * 🎯 O BOTÃO "ENTRAR" É `large` E OS OUTROS NÃO SÃO. Numa tela de login existe
 * exatamente uma coisa que o usuário veio fazer, e a hierarquia de tamanho diz
 * qual é sem precisar de cor berrante nem de texto em caixa alta. "Voltar"
 * `ghost` e "Entrar" `large` é a mesma relação que todo aplicativo de transporte
 * usa na sua tela de acesso.
 *
 * ⌨️ `returnKeyType="next"` no e-mail e `"go"` na senha: no telemóvel a tecla de
 * confirmação é o caminho natural para enviar, e deixá-la como "return" genérico
 * obriga o usuário a fechar o teclado para alcançar o botão.
 */
function LoginFormsView({
  modo, formData, errors, podeEnviar, onChange, onSubmit, loading, message, onBack,
}: Props) {
  const ehDev = modo === 'login-developer';
  const habilitado = podeEnviar && !loading;

  /**
   * 🔧 O DESENVOLVEDOR NÃO É VALIDADO POR FORMATO. A credencial dele é
   * `admin@pjodc.ia` — um domínio `.ia` que a checagem de e-mail aceita, mas que
   * não é uma conta real em lugar nenhum. Mostrar erro de forma no Painel de
   * Engenharia seria acusar a credencial correta de estar errada.
   */
  const erroEmail = ehDev ? undefined : errors.email;

  /**
   * Mesma razão para a senha, e uma a mais: a credencial do Painel tem quatro
   * caracteres, abaixo do mínimo de seis do GoTrue. Para o Dependente o erro
   * PRECISA aparecer — antes ele era calculado e nunca exibido, e o botão
   * desabilitado era a única pista de que faltava alguma coisa.
   */
  const erroSenha = ehDev ? undefined : errors.password;

  const mudarEmail = useCallback((v: string) => onChange('email', v), [onChange]);
  const mudarSenha = useCallback((v: string) => onChange('password', v), [onChange]);

  return (
    <Card>
      <Text style={authStyles.titulo}>{ehDev ? 'Painel de Engenharia' : 'Usuário Dependente'}</Text>
      <Text style={authStyles.subtitulo}>
        {ehDev ? 'Acesso restrito ao desenvolvedor.' : 'Entre com seu e-mail e senha.'}
      </Text>

      <Input
        label="E-mail"
        icon="Email"
        value={formData.email}
        onChangeText={mudarEmail}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        error={erroEmail}
        testID="campo-email"
      />

      <Input
        label="Senha"
        icon="Senha"
        senha
        value={formData.password}
        onChangeText={mudarSenha}
        placeholder="••••••••"
        autoCapitalize="none"
        autoComplete="password"
        returnKeyType="go"
        error={erroSenha}
        onSubmitEditing={habilitado ? onSubmit : undefined}
        testID="campo-senha"
      />

      <AuthMessage message={message} />

      <Button
        title="Entrar"
        size="large"
        onPress={onSubmit}
        loading={loading}
        disabled={!habilitado}
        style={estilos.entrar}
        testID="btn-login"
      />

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
  entrar: { marginTop: ESPACO.xl },
  voltar: { marginTop: ESPACO.sm },
});

export default memo(LoginFormsView);
