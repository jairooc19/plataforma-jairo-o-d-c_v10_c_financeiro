import { StyleSheet } from 'react-native';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, RAIO } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS DA CENTRAL DE COMANDOS (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/CommandCenterScreen.styles.ts
 *
 * Arquivo próprio pelo padrão de `Button.styles.ts` e `Input.styles.ts` — ver a
 * nota em `TenantManagerModal.styles.ts`.
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
    backgroundColor: BRAND.background,
  },

  tituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.sm,
    marginBottom: ESPACO.sm,
    marginLeft: ESPACO.xs,
  },
  tituloSecao: TIPOGRAFIA.rotulo,
  espacado: { marginTop: ESPACO.xl },

  selo: {
    paddingHorizontal: ESPACO.sm,
    paddingVertical: 2,
    borderRadius: RAIO.selo,
  },
  seloPendente: { backgroundColor: BRAND.warningSoft },
  seloAtivo: { backgroundColor: BRAND.successSoft },
  seloTexto: TIPOGRAFIA.dica,
  seloTextoPendente: { color: BRAND.warning },
  seloTextoAtivo: { color: BRAND.success },

  lista: { gap: ESPACO.sm },

  vazio: {
    padding: ESPACO.xl,
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
  },
  vazioTexto: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
  },

  mensagemErro: {
    backgroundColor: BRAND.errorSoft,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginBottom: ESPACO.lg,
  },
  textoErro: { ...TIPOGRAFIA.legenda, color: BRAND.error },
});
