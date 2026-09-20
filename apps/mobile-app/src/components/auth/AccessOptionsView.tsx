import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import MenuCard from '@/components/card/MenuCard';
import Button from '@/components/button/Button';
import { BRAND } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

type Papel = 'OWNER' | 'DEPENDENT' | 'VIEWER';

interface Props {
  onSelectRole: (papel: Papel) => void;
  onBack: () => void;
}

/**
 * 🔑 VIEW: OPÇÕES DE ACESSO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/AccessOptionsView.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - As três opções passaram a ser `MenuCard`, com ícone, chevron e elevação
 *
 * Espelho do `AccessOptionsView.tsx` da web: os mesmos três perfis, na mesma
 * ordem, com as mesmas descrições.
 *
 * ⚠️ CADA PERFIL VAI PARA UMA PORTA DIFERENTE, e não para a mesma tela com um
 * parâmetro cosmético:
 *   - Proprietário → só o botão do Google (sem e-mail, sem senha)
 *   - Dependente   → só o botão do Google, com o aviso do convite
 *   - Apenas Veja  → aviso; não é um login, é uma sala de espera
 * Rotear o Proprietário para o formulário de senha é proibição explícita do
 * CLAUDE.md — ele entra exclusivamente por Google desde a v5.
 *
 * ⚠️ ESTA LISTA DIZIA "Dependente → e-mail + senha" ATÉ 20/09/2026, e era
 * verdade: era também a razão de ele não conseguir entrar. Sem cadastro aberto
 * desde a v7, não havia como ter essa senha. Ver `LoginGoogleView.tsx`.
 *
 * ⚠️ ESCOLHER UM PERFIL AQUI NÃO CONCEDE PERFIL NENHUM. O toque só decide qual
 * triagem rodar depois do login; quem é OWNER e quem é DEPENDENT está em
 * `tenant_members`, e a RLS não pergunta em qual cartão a pessoa tocou.
 *
 * 🧩 O CARTÃO DE ESCOLHA ESCRITO À MÃO SUMIU DAQUI. Este arquivo mantinha um
 * `OpcaoAcesso` próprio, com o seu `useSharedValue`, a sua mola e o seu
 * `Pressable` — uma segunda implementação do mesmo comportamento que o
 * `MenuCard` agora oferece a todo o aplicativo. Duas implementações do mesmo
 * gesto divergem: bastava alguém ajustar o amortecimento de uma delas para o
 * toque responder diferente em duas telas vizinhas.
 *
 * 🎨 AS TRÊS CORES NÃO SÃO DECORAÇÃO. Azul é o acesso principal, azul claro o
 * secundário e cinza a sala de espera — a cor antecipa a hierarquia antes de o
 * usuário ler as descrições, que é o trabalho que a cor faz bem.
 *
 * 👁 "APENAS VEJA" PERDEU O EMOJI DO TÍTULO. Ele estava embutido no texto
 * (`'👁 Apenas Veja'`), o que fazia o leitor de tela anunciar "olho, Apenas
 * Veja" e deixava o desenho ao sabor da fonte de emoji do aparelho. Agora o
 * olho é o ícone do cartão, onde ícone é o lugar de ícone.
 */
function AccessOptionsView({ onSelectRole, onBack }: Props) {
  const escolherDono = useCallback(() => onSelectRole('OWNER'), [onSelectRole]);
  const escolherDependente = useCallback(() => onSelectRole('DEPENDENT'), [onSelectRole]);
  const escolherVisitante = useCallback(() => onSelectRole('VIEWER'), [onSelectRole]);

  return (
    <View>
      <Text style={estilos.chamada}>Selecione o acesso</Text>

      <View style={estilos.lista}>
        <MenuCard
          icon="Usuario"
          title="Usuário Proprietário"
          description="Acesso principal ao sistema."
          onPress={escolherDono}
          cor={BRAND.primary}
          indice={0}
          testID="acesso-owner"
        />
        <MenuCard
          icon="Equipe"
          title="Usuário Dependente"
          description="Acesso para colaboradores."
          onPress={escolherDependente}
          cor={BRAND.primaryLight}
          indice={1}
          testID="acesso-dependent"
        />
        <MenuCard
          icon="Ver"
          title="Apenas Veja"
          description="Somente leitura."
          onPress={escolherVisitante}
          cor={BRAND.textMuted}
          indice={2}
          testID="acesso-viewer"
        />
      </View>

      <Button
        title="Voltar ao início"
        variant="ghost"
        icon="Voltar"
        onPress={onBack}
        style={estilos.voltar}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  chamada: {
    ...TIPOGRAFIA.rotulo,
    textAlign: 'center',
    marginBottom: ESPACO.lg,
  },
  lista: { gap: ESPACO.md },
  voltar: { marginTop: ESPACO.lg },
});

export default memo(AccessOptionsView);
