import React, { memo, useCallback } from 'react';
import { Text } from 'react-native';
import Card from '@/components/card/Card';
import Button from '@/components/button/Button';
import Input from '@/components/input/Input';
import type { SelectOption } from '@/components/SearchableSelect';
import AuthMessage from './AuthMessage';
import LocationFields from './LocationFields';
import { authStyles } from './authStyles';
import type { AuthFormData, AuthFormErrors } from '@/hooks/useAuthForm';
import type { AuthMessage as TipoMensagem } from '@/hooks/useAuthLogicMobile';

interface Props {
  formData: AuthFormData;
  errors: AuthFormErrors;
  podeEnviar: boolean;
  onChange: (campo: keyof AuthFormData, valor: string) => void;
  onSubmit: () => void;
  loading: boolean;
  message: TipoMensagem | null;
  countriesOptions: SelectOption[];
  statesOptions: SelectOption[];
  citiesOptions: SelectOption[];
  citiesLoading: boolean;
  onBack: () => void;
}

/**
 * 📝 VIEW: CADASTRO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/SignUpView.tsx
 *
 * Os NOVE campos do `SignUpView.tsx` da web, na mesma ordem. Os quatro de
 * localização saíram para `LocationFields.tsx`, que o `CompleteProfileView`
 * também usa — eram cópias idênticas nas duas telas.
 *
 * ⚠️ A VALIDAÇÃO DE VERDADE É DO HOOK, antes de tocar o Supabase (senhas iguais,
 * país preenchido). O que este arquivo faz é ANTECIPAR o erro no campo onde ele
 * nasceu: dizer "as senhas não coincidem" embaixo da confirmação, enquanto o
 * usuário ainda a está digitando, poupa uma ida à rede e um erro genérico no
 * topo do cartão.
 *
 * 🔇 O ERRO DE SENHA SÓ APARECE DEPOIS QUE A CONFIRMAÇÃO TEM CONTEÚDO. Mostrá-lo
 * no primeiro caractere digitado acusaria o usuário de errar algo que ele ainda
 * não terminou de escrever.
 */
function SignUpView({
  formData,
  errors,
  podeEnviar,
  onChange,
  onSubmit,
  loading,
  message,
  countriesOptions,
  statesOptions,
  citiesOptions,
  citiesLoading,
  onBack,
}: Props) {
  const mudarNome = useCallback((v: string) => onChange('full_name', v), [onChange]);
  const mudarEmail = useCallback((v: string) => onChange('email', v), [onChange]);
  const mudarSenha = useCallback((v: string) => onChange('password', v), [onChange]);
  const mudarConfirmacao = useCallback((v: string) => onChange('confirm_password', v), [onChange]);

  const habilitado = podeEnviar && !loading;

  return (
    <Card>
      <Text style={authStyles.titulo}>Criar Conta</Text>
      <Text style={authStyles.subtitulo}>Preencha os dados para solicitar acesso.</Text>

      <Input
        label="Nome Completo"
        value={formData.full_name}
        onChangeText={mudarNome}
        placeholder="SEU NOME"
        autoCapitalize="characters"
        autoComplete="name"
        error={errors.full_name}
        testID="campo-nome"
      />

      <Input
        label="E-mail"
        value={formData.email}
        onChangeText={mudarEmail}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        error={errors.email}
        testID="campo-email"
      />

      <LocationFields
        formData={formData}
        onChange={onChange}
        countriesOptions={countriesOptions}
        statesOptions={statesOptions}
        citiesOptions={citiesOptions}
        citiesLoading={citiesLoading}
      />

      <Input
        label="Senha"
        senha
        value={formData.password}
        onChangeText={mudarSenha}
        placeholder="Mínimo 6 caracteres"
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.password}
        testID="campo-senha"
      />

      <Input
        label="Confirmar Senha"
        senha
        value={formData.confirm_password}
        onChangeText={mudarConfirmacao}
        placeholder="Repita a senha"
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.confirm_password}
        testID="campo-confirmar-senha"
      />

      <AuthMessage message={message} />

      <Button
        title="Finalizar Cadastro"
        onPress={onSubmit}
        loading={loading}
        disabled={!habilitado}
        style={authStyles.espacoBotao}
        testID="btn-cadastrar"
      />

      <Button title="← Voltar ao Início" variant="ghost" onPress={onBack} disabled={loading} />
    </Card>
  );
}

export default memo(SignUpView);
