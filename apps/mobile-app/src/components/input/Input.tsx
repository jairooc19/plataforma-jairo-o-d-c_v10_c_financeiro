import React, { memo, useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';

import Icon from '@/components/icon/Icon';
import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import { inputStyles } from './Input.styles';
import type { InputProps } from './Input.types';

/**
 * ⌨️ CAMPO DE TEXTO ÚNICO DA PLATAFORMA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/input/Input.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Linha inferior no lugar da caixa fechada (ver `Input.styles.ts`)
 * - Ícone opcional à esquerda, que acompanha o foco
 * - Olho da senha desenhado por ícone vetorial, não por emoji
 *
 * Substitui as 13 repetições do par `<Text rotulo> + <TextInput campo>` que
 * estavam espalhadas pelo `SignUpView`, `CompleteProfileView` e
 * `LoginFormsView` — e, com elas, a caixa de senha com olho que só o
 * `LoginFormsView` tinha, escrita à mão e ancorada por um `top: 12` chutado.
 *
 * 🙈 O OLHO DEIXOU DE SER EMOJI NESTA REFATORAÇÃO, e o motivo é concreto: 👁 e
 * 🙈 são desenhados pela fonte de emoji do APARELHO. No iOS vinham coloridos e
 * volumosos, no Android vinham num traço completamente diferente, e nas duas
 * plataformas destoavam do resto de uma interface de traço fino — além de não
 * aceitarem cor, então o olho ficava colorido dentro de um campo cinza. Agora é
 * um ícone vetorial que herda a cor do estado do campo.
 *
 * 👁 O ALTERNAR DA SENHA É ESTADO INTERNO, DE PROPÓSITO. Quem chama informa
 * `senha` e pronto; se "mostrar senha" subisse para o formulário, cada tela
 * teria de declarar um `useState` só para isso — e o `SignUpView`, que tem dois
 * campos de senha, precisaria de dois estados que ele não deveria conhecer.
 *
 * ⚠️ COMPONENTE CONTROLADO: `value` sempre vem de fora. Não há estado local de
 * texto e isso não é acidente — o hook `useAuthForm` normaliza o que se digita
 * (e-mail para minúsculas, localização para maiúsculas), e uma cópia local do
 * texto brigaria com essa normalização, devolvendo o cursor ao fim a cada tecla.
 * É a lição 7 do CLAUDE.md vista pelo outro lado: aqui o problema não existe
 * porque não há segunda fonte de verdade.
 *
 * ♿ O rótulo vira `accessibilityLabel` do campo: sem isso o leitor de tela
 * anuncia só o texto de exemplo, e um campo vazio fica anônimo.
 */
function InputBase({
  label,
  value,
  onChangeText,
  icon,
  error,
  ajuda,
  disabled = false,
  senha = false,
  containerStyle,
  testID,
  ...resto
}: InputProps) {
  const [focado, setFocado] = useState(false);
  const [revelada, setRevelada] = useState(false);

  const alternarSenha = useCallback(() => setRevelada((v) => !v), []);
  const aoFocar = useCallback(() => setFocado(true), []);
  const aoDesfocar = useCallback(() => setFocado(false), []);

  /**
   * A cor do ícone segue a mesma escada de prioridade da linha: erro vence
   * foco, foco vence repouso. Declarar a ordem aqui, uma vez, evita que ícone e
   * linha discordem — um campo com erro e cursor dentro ficaria com linha
   * vermelha e ícone azul.
   */
  const corIcone = error ? BRAND.error : focado ? BRAND.primary : BRAND.textFaint;

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {!!label && <Text style={inputStyles.label}>{label}</Text>}

      <View
        style={[
          inputStyles.linha,
          focado && !error && inputStyles.linhaFocada,
          !!error && inputStyles.linhaErro,
          disabled && inputStyles.linhaDesabilitada,
        ]}
      >
        {icon && <Icon name={icon} size={ICONE.pequeno} color={corIcone} strokeWidth={2} />}

        <TextInput
          {...resto}
          value={value}
          onChangeText={onChangeText}
          onFocus={aoFocar}
          onBlur={aoDesfocar}
          editable={!disabled}
          secureTextEntry={senha && !revelada}
          placeholderTextColor={BRAND.textFaint}
          /**
           * ⚠️ A COR DO CURSOR PRECISA SER DITA NAS DUAS PLATAFORMAS. O Android
           * lê `cursorColor`, o iOS lê `selectionColor` — e o padrão de fábrica
           * do Android é o azul do sistema, que aqui brigaria com o azul-marinho
           * da marca dentro do mesmo campo.
           */
          cursorColor={BRAND.primary}
          selectionColor={BRAND.primary}
          testID={testID}
          accessibilityLabel={label}
          style={inputStyles.campo}
        />

        {senha && (
          <Pressable
            style={inputStyles.botaoOlho}
            onPress={alternarSenha}
            disabled={disabled}
            /**
             * 👆 ALARGA O ALVO SEM ALARGAR O DESENHO. O botão já tem 48pt; a
             * folga extra cobre o polegar que erra para fora do campo, que é
             * onde ele erra num controle encostado na borda direita.
             */
            hitSlop={8}
            accessible
            accessibilityRole="button"
            accessibilityLabel={revelada ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Icon
              name={revelada ? 'Ocultar' : 'Ver'}
              size={ICONE.pequeno}
              color={focado ? BRAND.primary : BRAND.textMuted}
              strokeWidth={2}
            />
          </Pressable>
        )}
      </View>

      {!!error && <Text style={inputStyles.erro}>{error}</Text>}
      {!error && !!ajuda && <Text style={inputStyles.ajuda}>{ajuda}</Text>}
    </View>
  );
}

/** Puro: mesmas props, mesma saída. Ver a nota de `memo` no `Button.tsx`. */
export const Input = memo(InputBase);
export default Input;
export type { InputProps } from './Input.types';
