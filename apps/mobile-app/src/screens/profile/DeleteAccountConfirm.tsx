import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@/components/button/Button';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

interface DeleteAccountConfirmProps {
  apagando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

/**
 * 💀 VIEW: CONFIRMAÇÃO DA EXCLUSÃO DA CONTA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/DeleteAccountConfirm.tsx
 *
 * Passo separado de propósito, igual à web: apagar a conta é irreversível e não
 * pode ficar a um toque de distância do botão de editar.
 *
 * 🚫 NÃO USA O MENU NATIVO DE CONFIRMAÇÃO, e isso é diferente do "Sair". Sair
 * cabe num `Alert` porque a pergunta é curta e o dano é pequeno. Aqui há DOIS
 * avisos a ler — a irreversibilidade e a recusa para dono de empresa — e o
 * `AlertDialog` do Android trunca corpo longo sem avisar. Uma tela lê-se
 * inteira; um alerta, não.
 *
 * ⚠️ DONO DE EMPRESA NÃO CONSEGUE APAGAR A CONTA. A função do banco recusa, para
 * não deixar a empresa e os vínculos dos dependentes órfãos com `owner_id`
 * apontando para o nada. O aviso está aqui para que a recusa não chegue como
 * surpresa depois do toque — na prática, hoje a exclusão só funciona para quem
 * ainda não foi promovido a Proprietário.
 */
export default function DeleteAccountConfirm({
  apagando,
  onCancelar,
  onConfirmar,
}: DeleteAccountConfirmProps) {
  return (
    <View style={estilos.raiz}>
      <View style={estilos.blocoPerigo}>
        <Text style={estilos.tituloPerigo}>Esta ação não tem volta</Text>
        <Text style={estilos.corpoPerigo}>
          Sua conta, seu perfil e todos os seus vínculos com empresas serão apagados em
          definitivo. Não há como recuperar depois.
        </Text>
      </View>

      <View style={estilos.blocoAtencao}>
        <Text style={estilos.corpoAtencao}>
          <Text style={estilos.negrito}>Se você é dono de uma empresa</Text>, a exclusão será
          recusada. Transfira a propriedade da empresa antes de tentar novamente.
        </Text>
      </View>

      <Button
        title="Apagar minha conta"
        variant="danger"
        size="large"
        icon="Apagar"
        loading={apagando}
        onPress={onConfirmar}
        style={estilos.espacado}
        testID="btn-confirmar-exclusao"
      />

      <Button
        title="Cancelar"
        variant="ghost"
        size="large"
        disabled={apagando}
        onPress={onCancelar}
        style={estilos.espacadoCurto}
        testID="btn-cancelar-exclusao"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { marginBottom: ESPACO.xl },

  blocoPerigo: {
    backgroundColor: BRAND.errorSoft,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
  },
  tituloPerigo: {
    ...TIPOGRAFIA.rotulo,
    color: BRAND.error,
    marginBottom: ESPACO.sm,
  },
  corpoPerigo: {
    ...TIPOGRAFIA.legenda,
    color: BRAND.error,
  },

  blocoAtencao: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginTop: ESPACO.md,
  },
  corpoAtencao: TIPOGRAFIA.legenda,
  negrito: { fontWeight: '700' },

  espacado: { marginTop: ESPACO.xl },
  espacadoCurto: { marginTop: ESPACO.sm },
});
