import { useEffect, useState } from 'react';
import {
  supabase,
  permissaoFinanceiroService,
  PERMISSOES_FINANCEIRO,
  type PermissaoFinanceiro,
} from '@jairo/core';

import { storageService } from '@/services/storageService';

/**
 * 🏢 QUEM ESTÁ USANDO O MÓDULO, E EM QUAL EMPRESA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/useContextoFin.ts
 *
 * Espelho do `ContextoFinanceiro.tsx` do site, com UMA diferença que importa:
 * **onde vive a empresa ativa**.
 *
 * ===========================================================================
 * ⚠️ NO SITE É `sessionStorage`; AQUI É O COFRE DO APARELHO
 * ===========================================================================
 * No navegador a empresa ativa vive no `sessionStorage`, que é **por aba** e morre
 * ao fechar o navegador. No telemóvel não existe aba nem `sessionStorage`: a
 * empresa ativa está no SecureStore (Keychain no iOS, Keystore no Android), gravada
 * pela triagem da guarita, sob a chave `active_tenant_id`.
 *
 * Duas consequências práticas, e as duas valem para quem usa:
 *   • ela **sobrevive a fechar o aplicativo** — abrir amanhã cai na mesma empresa;
 *   • é **uma só** por aparelho, não há duas empresas abertas ao mesmo tempo.
 *
 * ⚠️ É UM HOOK, E NÃO UM CONTEXT PROVIDER como no site. Lá a moldura do módulo
 * envolve 18 telas e a busca precisava acontecer uma vez para todas; aqui há UMA
 * tela. Um Provider para um consumidor é cerimónia sem função — e, se a parte 2
 * trouxer mais telas, promovê-lo a contexto é uma mudança local, porque a
 * assinatura deste hook não vai mudar.
 *
 * ⚠️ AS PERMISSÕES QUE ELE DEVOLVE SÃO PARA DESENHAR A TELA, E NADA MAIS. Quem
 * recusa uma operação é a função do banco, que chama `fin_pode()` antes de agir
 * (RN-25). Se este hook mentisse, o botão apareceria — e o banco recusaria do
 * mesmo jeito.
 */
export interface ContextoFin {
  carregando: boolean;
  tenantId: string | null;
  userId: string | null;
  nomeEmpresa: string;
  /** `OWNER` | `DEPENDENT` | `VIEWER`. Para MOSTRAR, nunca para autorizar. */
  papel: string;
  pode: (p: PermissaoFinanceiro) => boolean;
  erro: string | null;
}

/**
 * Todas as permissões do módulo — o que o Proprietário recebe de saída.
 *
 * ⚠️ DERIVADA DE `PERMISSOES_FINANCEIRO`, NUNCA ESCRITA À MÃO. No site, uma cópia
 * manual desta lista já nasceu condenada a divergir: em 17/09/2026 entrou a
 * `lc_excluir_lote`, e a cópia significaria um Proprietário sem acesso à própria
 * exclusão em lote — sem erro na tela, só um botão que não aparece.
 */
const TUDO: PermissaoFinanceiro[] = [...PERMISSOES_FINANCEIRO];

const VAZIO: ContextoFin = {
  carregando: true,
  tenantId: null,
  userId: null,
  nomeEmpresa: '',
  papel: '',
  pode: () => false,
  erro: null,
};

export function useContextoFin(): ContextoFin {
  const [estado, setEstado] = useState<ContextoFin>(VAZIO);

  useEffect(() => {
    let cancelado = false;

    /**
     * ⚠️ A BUSCA É UMA FUNÇÃO `async` DENTRO DO EFEITO, e o estado só muda depois
     * do `await`. Mudar estado no mesmo tique do efeito dispara renderização em
     * cascata — é o que a regra `react-hooks/set-state-in-effect` reprova, e ela
     * está certa. Não se cala essa regra com `eslint-disable` neste projeto.
     */
    const carregar = async () => {
      try {
        const { tenantId } = await storageService.getSession();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!tenantId || !user) {
          if (!cancelado) {
            setEstado({
              ...VAZIO,
              carregando: false,
              erro: 'ESCOLHA UMA EMPRESA NO PAINEL ANTES DE ABRIR O MÓDULO.',
            });
          }
          return;
        }

        // O nome da empresa é do CORE, não do módulo: a tabela é `tenants`, e a
        // RLS da plataforma já só devolve as empresas de quem pergunta.
        const { data: emp } = await supabase
          .from('tenants')
          .select('tenant_name')
          .eq('id', tenantId)
          .maybeSingle();

        const membros = await permissaoFinanceiroService.listarMembros(tenantId);
        const eu = membros.find((m) => m.user_id === user.id);

        if (!eu) {
          if (!cancelado) {
            setEstado({ ...VAZIO, carregando: false, erro: 'VOCÊ NÃO É MEMBRO DESTA EMPRESA.' });
          }
          return;
        }

        // O Proprietário tem tudo; o Dependente, o que o Proprietário marcou.
        // ⚠️ Isto ESPELHA o `fin_pode()` do banco, que também dá tudo ao OWNER.
        // Se os dois discordarem, quem vale é o banco — a tela só desenha.
        const permissoes = new Set<PermissaoFinanceiro>(
          eu.role === 'OWNER' ? TUDO : eu.permissoes,
        );

        if (!cancelado) {
          setEstado({
            carregando: false,
            tenantId,
            userId: user.id,
            nomeEmpresa: emp?.tenant_name ?? '',
            papel: eu.role,
            pode: (p) => permissoes.has(p),
            erro: null,
          });
        }
      } catch (e) {
        if (!cancelado) {
          setEstado({
            ...VAZIO,
            carregando: false,
            erro: e instanceof Error ? e.message : 'FALHA AO CARREGAR O CONTEXTO.',
          });
        }
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return estado;
}
