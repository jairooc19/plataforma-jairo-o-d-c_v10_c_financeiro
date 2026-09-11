import { StyleSheet } from 'react-native';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS DOS AJUSTES GLOBAIS (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/GlobalSettingsScreen.styles.ts
 *
 * Arquivo próprio pelo padrão de `Button.styles.ts` e `Input.styles.ts`: a folha
 * empurrava a tela para além do limite da regra de ouro sem que nenhuma
 * responsabilidade nova tivesse entrado nela.
 */

export const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: BRAND.background },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.lg,
    paddingBottom: ESPACO.xxxl,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ESPACO.xl,
    backgroundColor: BRAND.background,
  },

  tituloSecao: {
    ...TIPOGRAFIA.rotulo,
    marginBottom: ESPACO.sm,
    marginLeft: ESPACO.xs,
  },
  cartao: {
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginBottom: ESPACO.xl,
  },
  primeiroCampo: { marginTop: 0 },
  explicacao: {
    ...TIPOGRAFIA.legenda,
    marginBottom: ESPACO.sm,
  },

  mensagem: {
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginBottom: ESPACO.lg,
  },
  mensagemErro: { backgroundColor: BRAND.errorSoft },
  mensagemSucesso: { backgroundColor: BRAND.successSoft },
  textoErro: { ...TIPOGRAFIA.legenda, color: BRAND.error },
  textoSucesso: { ...TIPOGRAFIA.legenda, color: BRAND.success },

  avisoTexto: { ...TIPOGRAFIA.legenda, textAlign: 'center' },
  espacado: { marginTop: ESPACO.sm },
});
