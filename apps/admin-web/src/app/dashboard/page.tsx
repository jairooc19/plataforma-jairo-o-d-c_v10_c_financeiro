"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
// 🔵 CÉREBRO ÚNICO: Importação consolidada do Core e Analytics
import {
  supabase,
  authService,
  profileService,
  telemetry,
  ANALYTICS_EVENTS,
  ANALYTICS_PROPERTIES,
  type VinculoDeEmpresa,
} from "@jairo/core";
import { encerrarSessao } from "@/lib/logout";
import { empresaDoContexto } from "@/lib/empresaDoContexto";
import type { ContextoMembro, EmpresaDoLobby, UsuarioSessao } from "@/types/plataforma";

// 🧩 COMPONENTES ORQUESTRADOS
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LobbyView from "@/components/dashboard/views/LobbyView";
import DeveloperDashboardView from "@/components/dashboard/views/DeveloperDashboardView";
import OperationalDashboardView from "@/components/dashboard/views/OperationalDashboardView";
import TeamManagementModal from "@/components/platform/team/TeamManagementModal";
import ProfileModal from "@/components/dashboard/profile/ProfileModal";

/**
 * 🛰️ DASHBOARD PAGE - ORQUESTRADOR CENTRAL (PJODC v10)
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  1. O PAINEL TÉCNICO NÃO ABRE MAIS POR UMA MARCA NO NAVEGADOR. A v9 lia
 *     `sessionStorage.dev_vip_access`, que qualquer pessoa escreve pelo console
 *     do navegador. Agora quem responde "você é o Desenvolvedor?" é o banco
 *     (`authService.ehDesenvolvedor()` → função `is_superuser()`).
 *  2. O LOBBY MOSTRA AS EMPRESAS DO PROPRIETÁRIO TAMBÉM. Antes só listava
 *     vínculos de Dependente: dono com duas empresas não trocava de contexto, e
 *     abrir o painel numa aba nova mandava o dono de volta à guarita (a empresa
 *     ativa vive no `sessionStorage`, que é por aba).
 *  3. TODA TELEMETRIA VEM DE `ANALYTICS_EVENTS`, sem string solta.
 */
export default function DashboardPage() {
  const router = useRouter();

  // --- ESTADOS DE CONTROLE ---
  const [loading, setLoading] = useState(true);
  const [ehDesenvolvedor, setEhDesenvolvedor] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // --- ESTADOS DE DADOS ---
  const [currentUser, setCurrentUser] = useState<UsuarioSessao | null>(null);
  const [tenantData, setTenantData] = useState<ContextoMembro | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaDoLobby[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  // --- ESTADOS TÉCNICOS (INFRA) ---
  const [dbStatus, setDbStatus] = useState<string>("Verificando...");
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  /** 📡 PING DE INFRAESTRUTURA */
  const handlePing = useCallback(async () => {
    try {
      const result = await authService.pingDatabase();
      setDbStatus(result.status);
      setDbLatency(result.latency);
    } catch {
      // O motivo não interessa aqui: qualquer falha de ping é "Offline".
      setDbStatus("Offline");
    }
  }, []);

  /** 🚪 LOGOUT GLOBAL — as duas metades da sessão. */
  const handleLogout = async () => {
    telemetry.capture(ANALYTICS_EVENTS.AUTH_LOGOUT, {
      [ANALYTICS_PROPERTIES.USER_EMAIL]: currentUser?.email
    });
    telemetry.reset();
    setLoading(true);

    await encerrarSessao();

    // `replace` e não `push`: o botão Voltar não pode devolver ao dashboard
    // de uma sessão que acabou de ser encerrada.
    router.replace("/");
  };

  /** 🏢 GESTÃO DE CONTEXTO (TENANT) */
  const handleSelectTenant = (id: string) => {
    telemetry.capture(ANALYTICS_EVENTS.TENANT_SELECTED, {
      [ANALYTICS_PROPERTIES.TENANT_ID]: id
    });
    sessionStorage.setItem("active_tenant_id", id);
    window.location.reload();
  };

  const handleSwitchTenant = () => {
    telemetry.capture(ANALYTICS_EVENTS.TENANT_SWITCH_REQUESTED);
    sessionStorage.removeItem("active_tenant_id");
    setShowLobby(true);
  };

  /** 🧠 MOTOR DE INICIALIZAÇÃO */
  useEffect(() => {
    const paraEmpresaDoLobby = (vinculo: VinculoDeEmpresa): EmpresaDoLobby => ({
      tenantId: vinculo.tenant_id,
      nome: vinculo.tenants.tenant_name,
      papel: vinculo.role,
      gestorNome: vinculo.tenants.users?.full_name ?? null,
      gestorEmail: vinculo.tenants.users?.email ?? null,
      gestorAtivo: vinculo.tenants.users?.is_active !== false,
    });

    const initDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/"); return; }

        setCurrentUser({ id: user.id, email: user.email });

        telemetry.identify(user.id, {
          [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email,
          [ANALYTICS_PROPERTIES.FULL_NAME]: user.user_metadata?.full_name
        });

        /**
         * 🔧 PAINEL DE ENGENHARIA: a pergunta vai ao BANCO.
         * O Desenvolvedor não precisa de empresa nem de cadastro completo — ele
         * administra a plataforma, não opera dentro de uma empresa.
         */
        const ehDev = await authService.ehDesenvolvedor();
        if (ehDev) {
          setEhDesenvolvedor(true);
          handlePing();
          setLoading(false);
          return;
        }

        // 🏁 PORTÃO DO CADASTRO INCOMPLETO (caminho de reserva do Google e
        // reaberturas posteriores).
        const cadastroCompleto = await profileService.isProfileCompleted(user.id);
        if (!cadastroCompleto) {
          router.replace("/auth/complete-profile");
          return;
        }

        // Todas as empresas da pessoa: as que ela possui e as em que colabora.
        const [comoDono, comoDependente] = await Promise.all([
          authService.getUserTenants(user.id, 'OWNER'),
          authService.getUserTenants(user.id, 'DEPENDENT'),
        ]);

        const lista = [...comoDono, ...comoDependente].map(paraEmpresaDoLobby);
        setEmpresas(lista);

        if (lista.length === 0) {
          // Autenticado, sem empresa: a triagem ainda não aconteceu.
          router.replace("/");
          return;
        }

        let tenantId = sessionStorage.getItem("active_tenant_id");

        // Uma empresa só: entra direto, sem pedir escolha.
        if (!tenantId && lista.length === 1) {
          tenantId = lista[0].tenantId;
          sessionStorage.setItem("active_tenant_id", tenantId);
        }

        if (!tenantId) {
          setShowLobby(true);
          setLoading(false);
          return;
        }

        const memberData = await authService.getTenantMemberContext(tenantId, user.id);

        if (memberData) {
          setTenantData(memberData as ContextoMembro);
          setActiveTenantId(tenantId);

          const currentTenantName = empresaDoContexto(memberData as ContextoMembro)?.tenant_name;

          telemetry.group('tenant', tenantId, {
            name: currentTenantName || 'Empresa Não Identificada',
            [ANALYTICS_PROPERTIES.USER_ROLE]: memberData.role
          });

          setShowLobby(false);
        } else {
          // A empresa guardada não vale mais (vínculo revogado, empresa
          // desativada): volta para a escolha em vez de mostrar tela vazia.
          sessionStorage.removeItem("active_tenant_id");
          setShowLobby(true);
        }
        setLoading(false);
      } catch (err) {
        console.error("[DASHBOARD] Erro fatal:", err);
        router.replace("/");
      }
    };

    initDashboard();
  }, [router, handlePing]);

  // --- RENDERIZAÇÃO DE ESTADOS ---

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showLobby) {
    return (
      <LobbyView
        empresas={empresas}
        onSelectTenant={handleSelectTenant}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-8 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-10">

        <DashboardHeader
          ehDesenvolvedor={ehDesenvolvedor}
          tenantData={tenantData}
          currentUser={currentUser}
          podeTrocarEmpresa={empresas.length > 1}
          onSwitchTenant={handleSwitchTenant}
          onLogout={handleLogout}
          onOpenTeamManagement={() => setIsTeamModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {ehDesenvolvedor ? (
          <DeveloperDashboardView
            dbStatus={dbStatus}
            dbLatency={dbLatency}
            onNavigate={(path) => {
              telemetry.capture(ANALYTICS_EVENTS.DEV_PANEL_NAVIGATION, { [ANALYTICS_PROPERTIES.PAGE_PATH]: path });
              router.push(path);
            }}
          />
        ) : (
          <OperationalDashboardView />
        )}

        {/* 👑 CENTRAL DE COMANDO DE TRIPULAÇÃO (só para o Proprietário) */}
        {activeTenantId && isTeamModalOpen && (
          <TeamManagementModal
            onClose={() => setIsTeamModalOpen(false)}
            tenantId={activeTenantId}
          />
        )}

        {/* 👤 MEU PERFIL: ver, editar e apagar a conta.
            ⚠️ v10 — o Desenvolvedor TAMBÉM tem perfil agora (é um usuário real),
            então a exceção que existia aqui saiu. */}
        {isProfileModalOpen && currentUser && (
          <ProfileModal
            onClose={() => setIsProfileModalOpen(false)}
            userId={currentUser.id}
          />
        )}

      </div>
    </div>
  );
}
