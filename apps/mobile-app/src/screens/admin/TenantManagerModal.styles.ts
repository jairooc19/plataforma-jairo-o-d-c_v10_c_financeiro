import { StyleSheet } from 'react-native';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO, TOQUE } from '@/constants/Spacing';

/**
 * 🎨 ESTILOS DO GERENCIADOR DE EMPRESAS (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/TenantManagerModal.styles.ts
 *
 * Arquivo próprio pelo mesmo motivo de `Button.styles.ts`, `Input.styles.ts` e
 * `MenuCard.styles.ts`: uma folha de estilo grande dentro do componente faz o
 * arquivo passar do limite da regra de ouro sem que nenhuma responsabilidade
 * nova tenha entrado nele. Desenhar e decidir são coisas diferentes.
 *
 * Compartilhado por `TenantManagerModal.tsx` (moldura, cabeçalho, rodapé) e
 * `TenantLists.tsx` (as duas listas) — que é a razão de os estilos das listas
 * estarem aqui e não lá.
 */
export const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: BRAND.background },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    paddingHorizontal: ESPACO.lg,
    paddingVertical: ESPACO.lg,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.divider,
    backgroundColor: BRAND.surface,
  },
  cabecalhoTextos: { flex: 1 },
  titulo: TIPOGRAFIA.secao,
  subtitulo: {
    ...TIPOGRAFIA.legenda,
    marginTop: 1,
  },
  botaoFechar: {
    width: TOQUE.pequeno,
    height: TOQUE.pequeno,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  rolagem: { flex: 1 },
  conteudo: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.lg,
    paddingBottom: ESPACO.xl,
  },

  linhaNova: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: ESPACO.md,
    marginBottom: ESPACO.xl,
  },
  campoNova: { flex: 1, marginTop: 0 },

  tituloSecao: {
    ...TIPOGRAFIA.rotulo,
    marginBottom: ESPACO.sm,
    marginLeft: ESPACO.xs,
  },
  espacado: { marginTop: ESPACO.lg },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    padding: ESPACO.lg,
    marginBottom: ESPACO.sm,
    backgroundColor: BRAND.surface,
    borderRadius: PLATFORM.radiusCard,
  },
  itemNome: {
    ...TIPOGRAFIA.corpo,
    fontWeight: '600',
    flex: 1,
  },

  itemInativo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    padding: ESPACO.lg,
    marginBottom: ESPACO.sm,
    backgroundColor: BRAND.surfaceVariant,
    borderRadius: PLATFORM.radiusCard,
  },
  itemTextos: { flex: 1 },
  itemNomeInativo: {
    ...TIPOGRAFIA.corpo,
    color: BRAND.textMuted,
  },
  itemNota: TIPOGRAFIA.dica,

  /** Contorno tracejado: a convenção de "aqui caberia algo, e está vazio". */
  vazio: {
    padding: ESPACO.xl,
    marginBottom: ESPACO.sm,
    borderRadius: PLATFORM.radiusCard,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BRAND.border,
  },
  vazioTexto: {
    ...TIPOGRAFIA.legenda,
    textAlign: 'center',
  },

  rodape: {
    paddingHorizontal: ESPACO.lg,
    paddingTop: ESPACO.md,
    paddingBottom: ESPACO.md,
    borderTopWidth: 1,
    borderTopColor: BRAND.divider,
    backgroundColor: BRAND.surface,
  },
  espacadoCurto: { marginTop: ESPACO.xs },

  mensagemErro: {
    backgroundColor: BRAND.errorSoft,
    borderRadius: PLATFORM.radiusCard,
    padding: ESPACO.lg,
    marginBottom: ESPACO.lg,
  },
  textoErro: { ...TIPOGRAFIA.legenda, color: BRAND.error },
});
