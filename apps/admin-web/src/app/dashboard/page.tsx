"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
// 🔵 CÉREBRO ÚNICO: Importação consolidada do Core e Analytics
import { 
  supabase, 
  authService, 
  tenantService, 
  profileService,
  telemetry,
  ANALYTICS_EVENTS, 
  ANALYTICS_PROPERTIES 
} from "@jairo/core";
import { encerrarSessao } from "@/lib/logout";
import { empresaDoContexto } from "@/lib/empresaDoContexto";
import type { ContextoMembro, UsuarioSessao, VinculoDependente } from "@/types/plataforma";

// 🧩 COMPONENTES ORQUESTRADOS
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LobbyView from "@/components/dashboard/views/LobbyView";
import DeveloperDashboardView from "@/components/dashboard/views/DeveloperDashboardView";
import OperationalDashboardView from "@/components/dashboard/views/OperationalDashboardView";
import TeamManagementModal from "@/components/platform/team/TeamManagementModal";
import ProfileModal from "@/components/dashboard/profile/ProfileModal";

/**
 * 🛰️ DASHBOARD PAGE - ORQUESTRADOR CENTRAL
 * Responsabilidade: Gerir estado de autenticação, contexto de tenant e roteamento de views.
 * Versão v4: Plataforma pura — nenhum módulo funcional instalado.
 */
export default function DashboardPage() {
  const router = useRouter();
  
  // --- ESTADOS DE CONTROLE ---
  const [loading, setLoading] = useState(true);
  const [isVipDev, setIsVipDev] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // --- ESTADOS DE DADOS ---
  const [currentUser, setCurrentUser] = useState<UsuarioSessao | null>(null);
  const [tenantData, setTenantData] = useState<ContextoMembro | null>(null);
  const [dependentTenants, setDependentTenants] = useState<VinculoDependente[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  
  // --- ESTADOS TÉCNICOS (INFRA) ---
  const [dbStatus, setDbStatus] = useState<string>("Verificando...");
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  /**
   * 📡 PING DE INFRAESTRUTURA
   */
  const handlePing = useCallback(async () => {
    try {
      const result = await authService.pingDatabase();
      setDbStatus(result.status);
      setDbLatency(result.latency);
    } catch {
      // O motivo não interessa aqui: qualquer falha de ping é "Offline" para a
      // faixa de status. O `catch` sem binding é o que diz isso ao leitor.
      setDbStatus("Offline");
    }
  }, []);

  /**
   * 🚪 LOGOUT GLOBAL
   */
  const handleLogout = async () => {
    telemetry.capture(ANALYTICS_EVENTS.AUTH_LOGOUT, { 
      [ANALYTICS_PROPERTIES.USER_EMAIL]: currentUser?.email 
    });
    telemetry.reset();
    setLoading(true);

    // Encerra as DUAS metades da sessão: navegador e cookies HTTP.
    // Limpar só o `sessionStorage` e chamar `signOut()` deixaria os cookies de
    // pé, e o middleware continuaria reconhecendo o usuário como autenticado.
    await encerrarSessao();

    // `replace` e não `push`: o botão Voltar não pode devolver ao dashboard
    // de uma sessão que acabou de ser encerrada.
    router.replace("/");
  };

  /**
   * 🏢 GESTÃO DE CONTEXTO (TENANT)
   */
  const handleSelectTenant = (id: string) => {
    telemetry.capture('tenant_selected_in_lobby', {
      [ANALYTICS_PROPERTIES.TENANT_ID]: id
    });
    sessionStorage.setItem("active_tenant_id", id);
    window.location.reload(); 
  };

  const handleSwitchTenant = () => {
    telemetry.capture('tenant_switch_requested');
    sessionStorage.removeItem("active_tenant_id");
    setShowLobby(true);
  };

  /**
   * 🧠 MOTOR DE INICIALIZAÇÃO
   */
  useEffect(() => {
    const initDashboard = async () => {
      try {
        const sessionDevFlag = sessionStorage.getItem("dev_vip_access") === "true";

        // 🛡️ FLUXO: DESENVOLVEDOR VIP
        if (sessionDevFlag) {
          setIsVipDev(true);
          const devUser = { email: 'admin@pjodc.ia', full_name: 'DESENVOLVEDOR MESTRE' };
          setCurrentUser(devUser);
          
          telemetry.identify('dev-master-pjodc', {
            [ANALYTICS_PROPERTIES.USER_ROLE]: 'DEVELOPER',
            [ANALYTICS_PROPERTIES.USER_EMAIL]: devUser.email
          });

          handlePing();
          setLoading(false);
          return;
        }

        // 🔐 FLUXO: USUÁRIO PADRÃO
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/"); return; }
        setCurrentUser(user);

        telemetry.identify(user.id, {
          [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email,
          [ANALYTICS_PROPERTIES.FULL_NAME]: user.user_metadata?.full_name
        });

        // Verificação de Admin via E-mail
        if (user.email === 'admin@pjodc.ia') {
          sessionStorage.setItem("dev_vip_access", "true");
          setIsVipDev(true);
          handlePing();
          setLoading(false);
          return;
        }

        // 🏁 PORTÃO DO CADASTRO INCOMPLETO
        // Segunda linha de defesa, depois da que já existe no login por popup.
        // Cobre quem chega aqui sem ter passado por ela: o caminho de reserva do
        // Google (redirecionamento, que aterrissa direto em /dashboard) e quem
        // reabre /dashboard num acesso posterior com o cadastro ainda pela metade.
        const cadastroCompleto = await profileService.isProfileCompleted(user.id);
        if (!cadastroCompleto) {
          router.replace("/auth/complete-profile");
          return;
        }

        const tenantId = sessionStorage.getItem("active_tenant_id");
        const dependents = (await tenantService.getDependentTenants(
          user.id
        )) as unknown as VinculoDependente[] | null;
        setDependentTenants(dependents || []);

        // Se não houver tenant selecionado mas houver vínculos, vai para o Lobby
        if (!tenantId) {
          if (dependents && dependents.length > 0) {
            setShowLobby(true);
            setLoading(false);
            return;
          }
          router.push("/");
          return;
        }
        
        // Carrega contexto da empresa ativa
        const memberData = (await authService.getTenantMemberContext(
          tenantId,
          user.id
        )) as ContextoMembro | null;

        if (memberData) {
          setTenantData(memberData);
          setActiveTenantId(tenantId);

          const currentTenantName = empresaDoContexto(memberData)?.tenant_name;

          telemetry.group('tenant', tenantId, {
            name: currentTenantName || 'Empresa Não Identificada',
            [ANALYTICS_PROPERTIES.USER_ROLE]: memberData.role
          });

          // Plataforma pura: nenhum módulo funcional instalado para injetar.
          setShowLobby(false);

        } else {
          sessionStorage.removeItem("active_tenant_id");
          setShowLobby(true);
        }
        setLoading(false);
      } catch (err) {
        console.error("[DASHBOARD] Erro fatal:", err);
        router.push("/");
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

  // Renderiza o Lobby de Seleção de Empresa
  if (showLobby) {
    return (
      <LobbyView 
        dependentTenants={dependentTenants} 
        onSelectTenant={handleSelectTenant} 
        onLogout={handleLogout} 
      />
    );
  }

  // Renderiza o Dashboard Principal (Dev ou Operacional)
  return (
    <div className="flex-1 bg-slate-50 p-8 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Cabeçalho Unificado com Acionador Global de Equipe */}
        <DashboardHeader 
          isVipDev={isVipDev}
          tenantData={tenantData}
          currentUser={currentUser}
          dependentTenantsCount={dependentTenants.length}
          onSwitchTenant={handleSwitchTenant}
          onLogout={handleLogout}
          onOpenTeamManagement={() => setIsTeamModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* Alternância de Views Principais */}
        {isVipDev ? (
          <DeveloperDashboardView 
            dbStatus={dbStatus} 
            dbLatency={dbLatency} 
            onNavigate={(path) => {
              telemetry.capture('navigated_via_dev_console', { path });
              router.push(path);
            }} 
          />
        ) : (
          <OperationalDashboardView />
        )}

        {/* 👑 CENTRAL DE COMANDO DE TRIPULAÇÃO (ACESSO MULTI-MÓDULO GLOBAL) */}
        {activeTenantId && isTeamModalOpen && (
          <TeamManagementModal
            onClose={() => setIsTeamModalOpen(false)}
            tenantId={activeTenantId}
          />
        )}

        {/* 👤 MEU PERFIL: ver, editar e apagar a conta.
            Depende de `currentUser.id`, que o desenvolvedor VIP não tem — a
            credencial do Painel de Engenharia não tem linha em public.users. */}
        {!isVipDev && currentUser?.id && isProfileModalOpen && (
          <ProfileModal
            onClose={() => setIsProfileModalOpen(false)}
            userId={currentUser.id}
          />
        )}

      </div>
    </div>
  );
}