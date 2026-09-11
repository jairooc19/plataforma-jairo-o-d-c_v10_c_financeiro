import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COUNTRIES, BRAZIL_STATES, type ProfileInput } from '@jairo/core';

import Input from '@/components/input/Input';
import Button from '@/components/button/Button';
import LocationFields, { type CamposLocalizacao } from '@/components/auth/LocationFields';
import { useBrazilCitiesMobile } from '@/hooks/useBrazilCitiesMobile';
import { authStyles } from '@/components/auth/authStyles';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

interface ProfileEditFormProps {
  form: ProfileInput;
  salvando: boolean;
  onChange: (campo: keyof ProfileInput, valor: string) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}

/**
 * ✏️ VIEW: EDIÇÃO DO PERFIL — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/ProfileEditForm.tsx
 *
 * Espelho do `ProfileEditForm` da web, com os mesmos cinco campos e a mesma
 * regra: TODOS são obrigatórios. Um perfil já completo não pode ser esvaziado
 * por aqui — o portão do `check_profile_completed` mandaria o usuário de volta
 * para "Completar Cadastro" no login seguinte, sem que ele entendesse por quê.
 *
 * ♻️ OS QUATRO CAMPOS DE LOCALIZAÇÃO VÊM DO `LocationFields`, o mesmo componente
 * que o cadastro e o "completar cadastro" usam. Copiá-los para cá teria dado uma
 * terceira cópia da regra "fora do Brasil, estado e cidade viram texto livre" —
 * e a que ficasse desatualizada seria descoberta por um usuário, não por nós.
 *
 * 🔒 A VALIDAÇÃO DE VERDADE ESTÁ NO CORE (`profileService.updateProfile` chama
 * `validarObrigatorios`) e no banco. O botão desabilitado aqui é conveniência,
 * não garantia: ele evita a ida ao servidor, não substitui a checagem.
 */
export default function ProfileEditForm({
  form,
  salvando,
  onChange,
  onCancelar,
  onSalvar,
}: ProfileEditFormProps) {
  const { cities, loading: carregandoCidades } = useBrazilCitiesMobile(form.country, form.state);

  const mudarNome = useCallback((v: string) => onChange('full_name', v), [onChange]);
  const mudarLocalizacao = useCallback(
    (campo: keyof CamposLocalizacao, valor: string) => onChange(campo, valor),
    [onChange]
  );

  const faltaPreencher =
    !form.full_name?.trim() ||
    !form.planet?.trim() ||
    !form.country?.trim() ||
    !form.state?.trim() ||
    !form.city?.trim();

  return (
    <View style={estilos.raiz}>
      <Text style={authStyles.rotulo}>Nome completo</Text>
      <Input
        value={form.full_name}
        onChangeText={mudarNome}
        placeholder="NOME COMPLETO"
        autoCapitalize="characters"
        icon="Usuario"
        containerStyle={estilos.semMargemTopo}
        accessibilityLabel="Nome completo"
        testID="campo-nome-perfil"
      />

      <LocationFields
        formData={form}
        onChange={mudarLocalizacao}
        countriesOptions={COUNTRIES}
        statesOptions={BRAZIL_STATES}
        citiesOptions={cities}
        citiesLoading={carregandoCidades}
      />

      {faltaPreencher && (
        <Text style={estilos.aviso}>⚠️ Todos os campos são obrigatórios.</Text>
      )}

      <Button
        title="Salvar alterações"
        variant="primary"
        size="large"
        icon="Salvar"
        loading={salvando}
        disabled={faltaPreencher}
        onPress={onSalvar}
        style={estilos.espacado}
        testID="btn-salvar-perfil"
      />

      <Button
        title="Cancelar"
        variant="ghost"
        size="large"
        disabled={salvando}
        onPress={onCancelar}
        style={estilos.espacadoCurto}
        testID="btn-cancelar-edicao"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { marginBottom: ESPACO.xl },
  semMargemTopo: { marginTop: 0 },

  aviso: {
    ...TIPOGRAFIA.legenda,
    color: BRAND.error,
    marginTop: ESPACO.lg,
  },

  espacado: { marginTop: ESPACO.xl },
  espacadoCurto: { marginTop: ESPACO.sm },
});
