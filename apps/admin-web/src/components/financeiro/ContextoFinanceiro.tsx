"use client";

import { createContext, useEffect, useState } from "react";
import { supabase, permissaoFinanceiroService, type PermissaoFinanceiro } from "@jairo/core";

/**
 * 🏢 QUEM ESTÁ USANDO O MÓDULO, E EM QUAL EMPRESA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/ContextoFinanceiro.tsx
 *
 * ⚠️ A EMPRESA ATIVA NÃO ESTÁ NO BANCO — está no `sessionStorage`, gravada
 * quando o usuário a escolhe no lobby da plataforma. Isso tem duas
 * consequências que valem saber: ela é POR ABA (abrir outra aba pede a escolha
 * de novo) e some ao fechar o navegador.
 *
 * ⚠️ AS PERMISSÕES QUE ESTE CONTEXTO DEVOLVE SÃO PARA DESENHAR A TELA, e nada
 * mais. Quem recusa uma operação é a função do banco, que chama `fin_pode()`
 * antes de agir (RN-25). Se este contexto mentisse, o botão apareceria — e o
 * banco recusaria do mesmo jeito.
 *
 * ⚠️ POR QUE VIROU CONTEXTO EM 13/09/2026. Antes era um hook, e cada tela o
 * chamava por conta própria: três consultas ao Supabase por página aberta. Com
 * o menu "OPÇÕES" passando a esconder item por permissão, a moldura também
 * precisaria das mesmas respostas — seriam SEIS consultas para desenhar uma
 * tela. Agora a busca acontece uma vez, na moldura, e todo mundo lê a mesma
 * resposta. **As telas não mudaram**: `useEmpresaAtiva()` continua existindo,
 * com a mesma assinatura, só que agora lê daqui.
 */

export interface ContextoFinanceiro {
  carregando: boolean;
  tenantId: string | null;
  userId: string | null;
  /** Nome real da empresa — cabeçalho de toda impressão e exportação (RN-30). */
  nomeEmpresa: string;
  /** E-mail real de quem está logado — idem. */
  emailUsuario: string;
  /**
   * O papel do usuário NESTA empresa: `OWNER`, `DEPENDENT` ou `VIEWER`.
   *
   * ⚠️ SERVE PARA MOSTRAR NA TELA, NÃO PARA AUTORIZAR. Quem autoriza é
   * `fin_pode()`, dentro do banco. Este campo existe porque o dono do projeto
   * pediu, em 13/09/2026, que o módulo mostrasse quem está logado — e "qual
   * conta" sem "em que papel" ainda deixa a pergunta pela metade.
   */
  papel: string;
  permissoes: Set<PermissaoFinanceiro>;
  /** Atalho para a tela perguntar se pode mostrar um botão. */
  pode: (p: PermissaoFinanceiro) => boolean;
  erro: string | null;
}

/** Todas as 17 permissões do módulo — o que o Proprietário recebe de saída. */
const TUDO: PermissaoFinanceiro[] = [
  "cm_ver", "cm_gravar", "cm_excluir",
  "ci_ver", "ci_gravar", "ci_excluir",
  "lc_ver_todos", "lc_criar", "lc_editar_proprios", "lc_editar_todos",
  "lc_excluir_proprios", "lc_excluir_todos",
  "transferencia", "extrato_ver", "conciliar", "imprimir", "fechar_periodo",
];

const VAZIO: ContextoFinanceiro = {
  carregando: true,
  tenantId: null,
  userId: null,
  nomeEmpresa: "",
  emailUsuario: "",
  papel: "",
  permissoes: new Set(),
  pode: () => false,
  erro: null,
};

export const CtxFinanceiro = createContext<ContextoFinanceiro>(VAZIO);

export function ProvedorFinanceiro({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<ContextoFinanceiro>(VAZIO);

  useEffect(() => {
    /**
     * ⚠️ A BUSCA É UMA FUNÇÃO `async` DEFINIDA DENTRO DO EFEITO, e o estado só
     * muda depois do `await`. Chamar `setState` no mesmo tique do efeito
     * dispara renderização em cascata — é o que a regra
     * `react-hooks/set-state-in-effect` reprova, e ela está certa. Não se cala
     * essa regra com `eslint-disable` neste projeto.
     */
    const carregar = async () => {
      const parcial = (p: Partial<ContextoFinanceiro>) =>
        setEstado((a) => {
          const permissoes = p.permissoes ?? a.permissoes;
          return { ...a, ...p, permissoes, pode: (x) => permissoes.has(x) };
        });

      try {
        const empresa = sessionStorage.getItem("active_tenant_id");
        const { data: { user } } = await supabase.auth.getUser();

        if (!empresa || !user) {
          parcial({ carregando: false, erro: "ESCOLHA UMA EMPRESA NO PAINEL ANTES DE ABRIR O MÓDULO." });
          return;
        }

        // O nome da empresa é do CORE, não do módulo: a tabela é `tenants`, e a
        // RLS da plataforma já só devolve as empresas de quem pergunta.
        const { data: emp } = await supabase
          .from("tenants").select("tenant_name").eq("id", empresa).maybeSingle();

        const membros = await permissaoFinanceiroService.listarMembros(empresa);
        const eu = membros.find((m) => m.user_id === user.id);

        if (!eu) {
          parcial({ carregando: false, erro: "VOCÊ NÃO É MEMBRO DESTA EMPRESA." });
          return;
        }

        // O Proprietário tem tudo; o Dependente, o que o Proprietário marcou.
        // ⚠️ Isto ESPELHA o `fin_pode()` do banco, que também dá tudo ao OWNER.
        // Se os dois discordarem, quem vale é o banco — a tela só desenha.
        parcial({
          carregando: false,
          tenantId: empresa,
          userId: user.id,
          emailUsuario: user.email ?? "",
          papel: eu.role,
          nomeEmpresa: emp?.tenant_name ?? "",
          permissoes: new Set(eu.role === "OWNER" ? TUDO : eu.permissoes),
        });
      } catch (e) {
        parcial({
          carregando: false,
          erro: e instanceof Error ? e.message : "FALHA AO CARREGAR O CONTEXTO.",
        });
      }
    };

    carregar();
  }, []);

  return <CtxFinanceiro.Provider value={estado}>{children}</CtxFinanceiro.Provider>;
}
