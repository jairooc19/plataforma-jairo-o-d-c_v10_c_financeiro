import React, { memo, useCallback } from 'react';
import { Text } from 'react-native';
import { BRAND } from '@/constants/Colors';
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
  email: string;
  formData: AuthFormData;
  errors: AuthFormErrors;
  podeEnviar: boolean;
  onChange: (campo: keyof AuthFormData, valor: string) => void;
  onSubmit: () => void;
  onLogout: () => void;
  loading: boolean;
  message: TipoMensagem | null;
  countriesOptions: SelectOption[];
  statesOptions: SelectOption[];
  citiesOptions: SelectOption[];
  citiesLoading: boolean;
}

/**
 * 🏁 VIEW: COMPLETAR CADASTRO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/CompleteProfileView.tsx
 *
 * Espelho do `CompleteProfileView.tsx` da web. O Google entrega e-mail e nome —
 * mais nada. Planeta, país, estado e cidade ficariam vazios, e é isso que esta
 * tela cobra, uma única vez, no primeiro acesso do Proprietário.
 *
 * 🚪 A ÚNICA SAÍDA É "SAIR", e a ausência do botão "voltar" é deliberada: um
 * "voltar ao início" devolveria o usuário à guarita AINDA AUTENTICADO, e o
 * portão do `profile_completed` o traria direto de volta para cá — um laço do
 * qual ele não escaparia sem desinstalar o app. Sair encerra a sessão inteira
 * (`logoutService`), que é o que quebra o ciclo.
 *
 * ⚠️ SÃO CINCO CAMPOS, NÃO NOVE: não há e-mail (o Google já deu) nem senha (não
 * existe senha nesta conta). Quem valida os cinco é o `profileService` no Core —
 * o `podeEnviar` daqui é só cortesia de interface.
 *
 * 🔴 O BOTÃO DE SAIR É `danger`, e isso não é enfeite: encerrar a sessão no meio
 * do cadastro descarta o que foi preenchido. A variante usa o vermelho da
 * PLATAFORMA (#FF3B30 no iOS, #B3261E no Android), que é o sinal que o usuário
 * já aprendeu a ler no aparelho que tem.
 */
function CompleteProfileView({
  email,
  formData,
  errors,
  podeEnviar,
  onChange,
  onSubmit,
  onLogout,
  loading,
  message,
  countriesOptions,
  statesOptions,
  citiesOptions,
  citiesLoading,
}: Props) {
  const mudarNome = useCallback((v: string) => onChange('full_name', v), [onChange]);

  const habilitado = podeEnviar && !loading;

  return (
    <Card>
      <Text style={authStyles.titulo}>Completar Cadastro</Text>
      <Text style={authStyles.subtitulo}>
        Faltam alguns dados para liberar seu acesso.{'\n'}
        <Text style={{ fontWeight: '800', color: BRAND.text }}>{email}</Text>
      </Text>

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

      <LocationFields
        formData={formData}
        onChange={onChange}
        countriesOptions={countriesOptions}
        statesOptions={statesOptions}
        citiesOptions={citiesOptions}
        citiesLoading={citiesLoading}
      />

      <AuthMessage message={message} />

      <Button
        title="Concluir Cadastro"
        onPress={onSubmit}
        loading={loading}
        disabled={!habilitado}
        style={authStyles.espacoBotao}
        testID="btn-concluir"
      />

      {/* Única saída — ver o cabeçalho deste arquivo. */}
      <Button
        title="Sair"
        variant="danger"
        onPress={onLogout}
        disabled={loading}
        style={authStyles.espacoBotaoCurto}
        accessibilityLabel="Sair e encerrar a sessão"
        testID="btn-sair"
      />
    </Card>
  );
}

export default memo(CompleteProfileView);
