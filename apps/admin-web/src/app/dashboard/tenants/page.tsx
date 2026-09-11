"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getAllUsersAction, 
  getUserTenantManagementAction, 
  syncUserTenantsAction 
} from "./actions";
import type { TenantSyncData } from "@jairo/core";
import type { UsuarioAdministravel, VinculoAdministravel } from "@/types/plataforma";
import { mensagemDeErro } from "@/lib/erro";

export default function TenantsPage() {
  const [users, setUsers] = useState<UsuarioAdministravel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioAdministravel | null>(null);

  // Estados do Formulário
  const [tenantName, setTenantName] = useState("");
  // `TenantSyncData` é o que `syncUserTenantsAction` exige — usar o mesmo tipo
  // aqui faz o compilador cobrar a forma no momento em que a lista é montada,
  // e não lá na frente, na chamada.
  const [tempTenants, setTempTenants] = useState<TenantSyncData[]>([]);
  const [inactiveTenants, setInactiveTenants] = useState<TenantSyncData[]>([]);
  const [deletedTenants, setDeletedTenants] = useState<string[]>([]);

  const router = useRouter();

  /**
   * ⚠️ DECLARADA ANTES DO EFEITO QUE A CHAMA, e envolvida em `useCallback`.
   * Antes ela vinha depois: o efeito capturava a versão daquele render por
   * içamento (`function`/`const` em escopo de módulo de componente), e o ESLint
   * acusava "accessed before it is declared". Com `useCallback([])` a função é
   * a MESMA em todos os renders, então entrar na lista de dependências do
   * efeito abaixo não cria laço de renderização.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getAllUsersAction();
      setUsers((u as UsuarioAdministravel[] | null) || []);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🛡️ Proteção de Acesso VIP Dev
  useEffect(() => {
    const checkAccess = () => {
      const devAccess = sessionStorage.getItem("dev_vip_access") === "true";
      if (!devAccess) {
        router.push("/dashboard");
        return;
      }
      fetchData();
    };
    checkAccess();
  }, [router, fetchData]);

  const handleOpenModal = async (user: UsuarioAdministravel) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setLoadingModal(true);
    setDeletedTenants([]);
    setTempTenants([]);
    setInactiveTenants([]);
    setTenantName("");

    try {
      const members = await getUserTenantManagementAction(user.id);

      if (members && members.length > 0) {
        const active: TenantSyncData[] = [];
        const inactive: TenantSyncData[] = [];

        (members as unknown as VinculoAdministravel[]).forEach((m) => {
          const item = {
            member_id: m.id,
            tenant_id: m.tenants.id,
            name: m.tenants.tenant_name,
            slug: m.tenants.slug,
            is_active: m.tenants.is_active,
            isNew: false
          };

          if (m.tenants.is_active) {
            active.push(item);
          } else {
            inactive.push(item);
          }
        });

        setTempTenants(active);
        setInactiveTenants(inactive);
      }
    } catch (err) {
      console.error("Erro ao carregar empresas do usuário:", err);
    } finally {
      setLoadingModal(false);
    }
  };

  const addTenantToList = () => {
    if (!tenantName) return;
    const slug = tenantName.toLowerCase().replace(/ /g, "-");
    setTempTenants([...tempTenants, {
      name: tenantName,
      slug,
      is_active: true,
      isNew: true
    }]);
    setTenantName("");
  };

  const handleRemoveTenant = (index: number) => {
    const t = tempTenants[index];
    if (!t.isNew) {
      // `tenant_id` só existe em empresa já gravada — por isso é opcional em
      // `TenantSyncData`. A guarda impede que um `undefined` entre na lista de
      // exclusão, que é `string[]` e vai para a action de sincronização.
      if (t.tenant_id) setDeletedTenants([...deletedTenants, t.tenant_id]);
      setInactiveTenants([...inactiveTenants, { ...t, is_active: false }]);
    }
    setTempTenants(tempTenants.filter((_, i) => i !== index));
  };

  const handleRehabilitate = (index: number) => {
    const t = inactiveTenants[index];
    setDeletedTenants(deletedTenants.filter(id => id !== t.tenant_id));
    setTempTenants([...tempTenants, { ...t, is_active: true }]);
    setInactiveTenants(inactiveTenants.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    if (!selectedUser) return;
    setLoading(true);

    try {
      await syncUserTenantsAction(selectedUser.id, tempTenants, deletedTenants);
      setIsModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      const mensagem = mensagemDeErro(error);
      if (mensagem === 'NOME_EMPRESA_DUPLICADO') {
        alert("O NOME DA EMPRESA JÁ ESTA SENDO UTILIZADO EM OUTRO REGISTRO.");
      } else {
        alert("Erro ao salvar: " + mensagem);
      }
    } finally {
      setLoading(false);
    }
  };

  const pendingUsersList = users.filter(u => {
    const role = (u.role || '').toLowerCase();
    return role === 'pending' || role === 'user';
  });

  const activeUsersList = users.filter(u => (u.role || '').toLowerCase() === 'active');

  if (loading && users.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-4 sm:p-8 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-800">Central de Comandos</h1>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-100 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            VOLTAR
          </button>
        </div>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-amber-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black uppercase text-slate-800">Triagem de Usuários</h2>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-xs font-black">{pendingUsersList.length} PENDENTES</span>
          </div>
          
          <div className="space-y-4">
            {pendingUsersList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum usuário aguardando triagem.</div>
            ) : (
              pendingUsersList.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all gap-4">
                  <div>
                    <div className="font-black text-lg text-slate-800">{user.full_name || 'Usuário sem Nome'}</div>
                    <div className="text-sm text-blue-600 font-bold">{user.email}</div>
                  </div>
                  <button onClick={() => handleOpenModal(user)} className="w-full sm:w-auto bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-md">HABILITAR INFRAESTRUTURA</button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black uppercase text-slate-800">Clientes Operacionais</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-xs font-black">{activeUsersList.length} ATIVOS</span>
          </div>
          
          <div className="space-y-4">
            {activeUsersList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum cliente operacional.</div>
            ) : (
              activeUsersList.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all gap-4">
                  <div>
                    <div className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      {user.full_name || 'Usuário sem Nome'}
                    </div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                  </div>
                  <button onClick={() => handleOpenModal(user)} className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-700 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all">GERENCIAR HABILITAÇÕES</button>
                </div>
              ))
            )}
          </div>
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden border border-white flex flex-col max-h-[90vh]">
              
              {loadingModal ? (
                <div className="p-20 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Acessando o Cérebro Único...</p>
                </div>
              ) : (
                <>
                  <div className="p-8 sm:p-10 pb-6 shrink-0 border-b border-slate-100 bg-white z-10">
                    <div className="text-center">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                        {tempTenants.length > 0 || inactiveTenants.length > 0 ? 'Gerenciar Infraestrutura' : 'Habilitar Infraestrutura'}
                      </h3>
                      <p className="text-slate-500 font-medium mt-1">Usuário: <span className="text-blue-600 font-bold">{selectedUser?.full_name || selectedUser?.email}</span></p>
                    </div>

                    <div className="flex gap-2 mt-8">
                      <input type="text" placeholder="NOME DA NOVA EMPRESA/CLIENTE" value={tenantName} onChange={(e) => setTenantName(e.target.value.toUpperCase())} className="flex-1 p-5 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-blue-200 transition-all" />
                      <button onClick={addTenantToList} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-blue-600 transition-all text-xl">+</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 sm:p-10 pt-4 space-y-8 bg-slate-50/50">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Empresas Habilitadas</h4>
                      {tempTenants.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-xs italic">Nenhuma empresa ativa no momento.</div>
                      ) : (
                        tempTenants.map((t, index) => (
                          <div key={index} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between p-5 bg-slate-50/50">
                              <span className="font-black text-slate-800 uppercase text-xs tracking-widest">{t.name}</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleRemoveTenant(index)} className="text-red-500 font-black text-[10px] px-3 uppercase hover:bg-red-50 rounded-xl transition-all">Remover</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {inactiveTenants.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Histórico de Empresas</h4>
                        {inactiveTenants.map((t, index) => (
                          <div key={`inactive-${index}`} className="bg-slate-100/50 rounded-3xl border border-slate-200 p-5 flex items-center justify-between opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-500 uppercase text-[10px] tracking-widest">{t.name}</span>
                              <span className="text-[9px] font-bold text-slate-400">DADOS PRESERVADOS</span>
                            </div>
                            <button onClick={() => handleRehabilitate(index)} className="bg-blue-100 text-blue-700 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">Reabilitar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-8 sm:p-10 pt-6 shrink-0 border-t border-slate-100 bg-white z-10 flex flex-col gap-3">
                    <button onClick={handleFinalize} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all uppercase tracking-widest disabled:opacity-50">
                      {loading ? 'SINCRONIZANDO...' : 'SALVAR E CONCLUIR'}
                    </button>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-xs uppercase py-3 hover:text-slate-600 transition-colors">CANCELAR</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}