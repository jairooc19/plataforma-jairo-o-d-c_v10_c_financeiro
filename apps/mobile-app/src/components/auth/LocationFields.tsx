import React, { memo, useCallback } from 'react';
import { Text } from 'react-native';
import Input from '@/components/input/Input';
import SearchableSelect, { type SelectOption } from '@/components/SearchableSelect';
import { authStyles } from './authStyles';
import type { AuthFormData } from '@/hooks/useAuthForm';

/** Planeta é uma escolha de duas opções — mesmo componente dos demais seletores. */
export const PLANETAS: SelectOption[] = [
  { label: 'TERRA', value: 'TERRA' },
  { label: 'OUTRO', value: 'OUTRO' },
];

/**
 * Só os quatro campos que este componente desenha — e não o `AuthFormData`
 * inteiro.
 *
 * ⚠️ FOI ISSO QUE PERMITIU O REÚSO NO MEU PERFIL. O `ProfileInput` do Core tem
 * cinco campos (os quatro daqui mais o nome) e não é um `AuthFormData`: exigir o
 * tipo completo obrigaria a tela de perfil a inventar `email`, `password` e
 * `confirm_password` vazios só para satisfazer o compilador — ou a manter uma
 * segunda cópia destes quatro campos, que é exatamente o que este arquivo
 * existe para impedir. Pedir o mínimo aceita os dois formulários.
 */
export type CamposLocalizacao = Pick<AuthFormData, 'planet' | 'country' | 'state' | 'city'>;

interface Props {
  formData: CamposLocalizacao;
  onChange: (campo: keyof CamposLocalizacao, valor: string) => void;
  countriesOptions: SelectOption[];
  statesOptions: SelectOption[];
  citiesOptions: SelectOption[];
  citiesLoading: boolean;
}

/**
 * 🌍 CAMPOS DE LOCALIZAÇÃO — PLANETA, PAÍS, ESTADO E CIDADE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/LocationFields.tsx
 *
 * Os quatro campos eram idênticos, letra por letra, no `SignUpView` e no
 * `CompleteProfileView` — incluindo a regra que muda estado e cidade de seletor
 * para texto livre fora do Brasil. Duas cópias significam que corrigir a regra
 * num lugar deixa o outro errado, e ninguém percebe porque as duas telas
 * raramente são abertas na mesma sessão.
 *
 * 🌍 ESTADO E CIDADE MUDAM DE NATUREZA CONFORME O PAÍS: no Brasil são listas
 * (as 27 UFs do Core, os municípios do IBGE); fora dele são texto livre. Não é
 * capricho — não temos uma fonte de UFs e municípios para os outros 249 países,
 * e um seletor vazio impediria o cadastro de quem mora fora.
 *
 * ⚠️ `COUNTRIES` e `BRAZIL_STATES` são `{ label, value }[]`, não strings — por
 * isso vão para o `SearchableSelect` e nunca para um `<Text>{opcao}</Text>`.
 */
function LocationFields({
  formData,
  onChange,
  countriesOptions,
  statesOptions,
  citiesOptions,
  citiesLoading,
}: Props) {
  const ehBrasil = formData.country === 'BRASIL';

  const mudarPlaneta = useCallback((v: string) => onChange('planet', v), [onChange]);
  const mudarPais = useCallback((v: string) => onChange('country', v), [onChange]);
  const mudarEstado = useCallback((v: string) => onChange('state', v), [onChange]);
  const mudarCidade = useCallback((v: string) => onChange('city', v), [onChange]);

  return (
    <>
      <Text style={authStyles.rotulo}>Planeta</Text>
      <SearchableSelect
        options={PLANETAS}
        value={formData.planet}
        onChange={mudarPlaneta}
        placeholder="Selecione o planeta"
        testID="select-planeta"
      />

      <Text style={authStyles.rotulo}>País</Text>
      <SearchableSelect
        options={countriesOptions}
        value={formData.country}
        onChange={mudarPais}
        placeholder="Selecione o país"
        testID="select-pais"
      />

      <Text style={authStyles.rotulo}>Estado</Text>
      {ehBrasil ? (
        <SearchableSelect
          options={statesOptions}
          value={formData.state}
          onChange={mudarEstado}
          placeholder="Selecione o estado"
          testID="select-estado"
        />
      ) : (
        <Input
          value={formData.state}
          onChangeText={mudarEstado}
          placeholder="ESTADO / PROVÍNCIA"
          autoCapitalize="characters"
          containerStyle={{ marginTop: 0 }}
          accessibilityLabel="Estado ou província"
          testID="campo-estado"
        />
      )}

      <Text style={authStyles.rotulo}>Cidade</Text>
      {ehBrasil ? (
        <SearchableSelect
          options={citiesOptions}
          value={formData.city}
          onChange={mudarCidade}
          placeholder={formData.state ? 'Selecione a cidade' : 'Escolha o estado primeiro'}
          disabled={!formData.state}
          loading={citiesLoading}
          testID="select-cidade"
        />
      ) : (
        <Input
          value={formData.city}
          onChangeText={mudarCidade}
          placeholder="CIDADE"
          autoCapitalize="characters"
          containerStyle={{ marginTop: 0 }}
          accessibilityLabel="Cidade"
          testID="campo-cidade"
        />
      )}
    </>
  );
}

export default memo(LocationFields);
