"use client";

import { useEffect, useState } from "react";
import { supabase, permissaoFinanceiroService, type PermissaoFinanceiro } from "@jairo/core";

/**
 * 🏢 QUEM ESTÁ USANDO O MÓDULO, E EM QUAL EMPRESA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/useEmpresaAtiva.ts
 *
 * ⚠️ A EMPRESA ATIVA NÃO ESTÁ NO BANCO — está no `sessionStorage`, gravada
 * quando o usuário a escolhe no lobby da plataforma. Isso tem duas
 * consequências que valem saber: ela é POR ABA (abrir outra aba pede a escolha
 * de novo) e some ao fechar o navegador.
 *
 * ⚠️ AS PERMISSÕES QUE ESTE HOOK DEVOLVE SÃO PARA DESENHAR A TELA, e nada mais.
 * Quem recusa uma operação é a função do banco, que chama `fin_pode()` antes de
 * agir (RN-25). Se este hook mentisse, o botão apareceria — e o banco recusaria
 * do mesmo jeito.
 */

export interface ContextoFinanceiro {
  carregando: boolean;
  tenantId: string | null;
  userId: string | null;
  /** Nome real da empresa — cabeçalho de toda impressão e exportação (RN-30). */
  nomeEmpresa: string;
  /** E-mail real de quem está logado — idem. */
  emailUsuario: string;
  permissoes: Set<PermissaoFinanceiro>;
  /** Atalho para a tela perguntar se pode mostrar um botão. */
  pode: (p: PermissaoFinanceiro) => boolean;
  erro: string | null;
}

export function useEmpresaAtiva(): ContextoFinanceiro {
  const [carregando, setCarregando] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [permissoes, setPermissoes] = useState<Set<PermissaoFinanceiro>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        const empresa = sessionStorage.getItem("active_tenant_id");
        const { data: { user } } = await supabase.auth.getUser();

        if (!empresa || !user) {
          setErro("ESCOLHA UMA EMPRESA NO PAINEL ANTES DE ABRIR O MÓDULO.");
          return;
        }

        setTenantId(empresa);
        setUserId(user.id);
        setEmailUsuario(user.email ?? "");

        // O nome da empresa é do CORE, não do módulo: a tabela é `tenants`, e a
        // RLS da plataforma já só devolve as empresas de quem pergunta.
        const { data: emp } = await supabase
          .from("tenants").select("tenant_name").eq("id", empresa).maybeSingle();
        setNomeEmpresa(emp?.tenant_name ?? "");

        const membros = await permissaoFinanceiroService.listarMembros(empresa);
        const eu = membros.find((m) => m.user_id === user.id);

        if (!eu) {
          setErro("VOCÊ NÃO É MEMBRO DESTA EMPRESA.");
          return;
        }

        // O Proprietário tem tudo; o Dependente, o que o Proprietário marcou.
        setPermissoes(
          eu.role === "OWNER"
            ? new Set(["cm_ver","cm_gravar","cm_excluir","ci_ver","ci_gravar","ci_excluir",
                       "lc_ver_todos","lc_criar","lc_editar_proprios","lc_editar_todos",
                       "lc_excluir_proprios","lc_excluir_todos","transferencia","extrato_ver",
                       "conciliar","imprimir","fechar_periodo"] as PermissaoFinanceiro[])
            : new Set(eu.permissoes),
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "FALHA AO CARREGAR O CONTEXTO.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  return {
    carregando,
    tenantId,
    userId,
    nomeEmpresa,
    emailUsuario,
    permissoes,
    pode: (p) => permissoes.has(p),
    erro,
  };
}
