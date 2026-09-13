/**
 * 🧩 MANIFESTO DO MÓDULO CONTROLE FINANCEIRO (PJODC v10)
 * Local: packages/core/src/modules/financeiro/manifesto.ts
 *
 * É o cartão de visita que este módulo entrega à plataforma. A plataforma lê
 * daqui — e só daqui — o que precisa saber para desenhar o cartão no menu e
 * levar o usuário à tela certa.
 *
 * ⚠️ O `id` É O MESMO TEXTO EM QUATRO LUGARES, e eles têm de concordar:
 *   1. aqui;
 *   2. na linha de `platform_modules` que o `financeiro_02_seed.sql` grava;
 *   3. no que vai em `tenant_members.allowed_modules`;
 *   4. no nome das 5 pastas do módulo.
 * Um deles fora de sincronia produz um módulo que aparece e não abre.
 *
 * 📖 `MODULOS.md` na raiz.
 */

import type { ManifestoDeModulo } from '../tipos';

export const MANIFESTO_FINANCEIRO: ManifestoDeModulo = {
  id: 'financeiro',
  nome: 'Controle Financeiro',
  descricao: 'Contas, lançamentos, extrato com saldo e conferência.',
  rotaWeb: '/dashboard/financeiro',
  prefixoBanco: 'fin_',
  versao: '1.0.0',
  exigePlataforma: 'v10',
};
