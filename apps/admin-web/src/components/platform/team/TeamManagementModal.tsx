"use client";

import { useState, useEffect } from "react";
import { tenantService, supabase } from "@jairo/core";
import type { CandidatoDependente, MembroEquipe } from "@/types/plataforma";

interface TeamManagementModalProps {
  onClose: () => void;
  tenantId: string;
}

/**
 * 👑 TEAM MANAGEMENT MODAL: O Painel de Controle de Tripulação (PJODC v4 Core)
 * Responsabilidade: Centralizar a governança de equipe da plataforma.
 * Versão v4: Plataforma pura — nenhum módulo funcional para configurar.
 */
export default function TeamManagementModal({ onClose, tenantId }: TeamManagementModalProps) {
  const [emailSearch, setEmailSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<CandidatoDependente | null>(null);
  const [error, setError] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [existingMembers, setExistingMembers] = useState<MembroEquipe[]>([]);

  const [isActive, setIsActive] = useState(true);

  /**
   * ⚠️ SEM EFEITO DE REINICIALIZAÇÃO — o modal agora É MONTADO SÓ ENQUANTO
   * ABERTO, exatamente como o `ProfileModal` já fazia.
   *
   * Antes este efeito recebia `isOpen` e, a cada abertura, zerava
   * `foundUser`, `emailSearch` e `error` no CORPO do efeito. Isso é uma
   * renderização em cascata: o React pinta o modal com o estado velho da
   * abertura anterior e só depois o apaga, num segundo render. Quem abria,
   * buscava alguém, fechava e reabria via o resultado antigo piscar.
   *
   * Sem a prop `isOpen`, cada abertura é uma MONTAGEM: o estado nasce nos
   * valores iniciais, e não há o que reinicializar. Ver a chamada em
   * `app/dashboard/page.tsx`, que agora usa `isTeamModalOpen && <...>`.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // 1. Identifica o Usuário Logado (Proprietário)
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserEmail(user?.email || null);

        // 2. Carrega a lista de Dependentes já cadastrados
        const members = await tenantService.getTenantMembers(tenantId);
        setExistingMembers((members as unknown as MembroEquipe[] | null) || []);
      } catch (err) {
        console.error("Erro crítico ao carregar central de comando:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [tenantId]);

  const handleSearch = async () => {
    const emailToSearch = emailSearch.trim().toLowerCase();
    if (!emailToSearch) return;

    if (emailToSearch === currentUserEmail?.toLowerCase()) {
      setError("OPERAÇÃO BLOQUEADA: VOCÊ NÃO PODE SER SEU PRÓPRIO DEPENDENTE.");
      setFoundUser(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setFoundUser(null);
    try {
      const user = (await tenantService.searchUserByEmail(
        emailToSearch
      )) as CandidatoDependente | null;
      if (user) {
        setFoundUser(user);
        setIsActive(true);
      } else {
        setError("USUÁRIO NÃO LOCALIZADO: CERTIFIQUE-SE QUE O E-MAIL ESTÁ CORRETO.");
      }
    } catch {
      setError("ERRO NA CONEXÃO COM O CORE.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMember = (member: MembroEquipe) => {
    setFoundUser({
      id: member.user_id,
      full_name: member.users.full_name,
      email: member.users.email
    });

    setIsActive(member.is_active);
    setError("");
  };

  const handleSave = async () => {
    if (!foundUser) return;
    setIsLoading(true);
    try {
      // Grava unificadamente na tabela do Core de forma blindada
      await tenantService.saveDependentMember(tenantId, foundUser.id, isActive);

      // Mesma conversão do carregamento inicial: o supabase-js infere o embed
      // `users` como array porque não sabe a cardinalidade da FK, mas o
      // PostgREST devolve objeto — que é o que o JSX abaixo sempre leu.
      const updatedMembers = (await tenantService.getTenantMembers(
        tenantId
      )) as unknown as MembroEquipe[] | null;
      setExistingMembers(updatedMembers || []);
      
      setFoundUser(null);
      setEmailSearch("");
      alert("✅ CONFIGURAÇÕES DE ACESSO DA EQUIPE ATUALIZADAS!");
    } catch {
      setError("FALHA AO GRAVAR NO BANCO DE DADOS.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-50 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER MESTRE CENTRALIZADO */}
        <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Painel de Controle de Tripulação</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Governança Centralizada da Plataforma PJODC</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          
          {/* VISÃO 1: LISTA GERAL DA EQUIPE */}
          {!foundUser && (
            <div className="space-y-6 animate-fade-in">
              {existingMembers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Membros Ativos Habilitados ({existingMembers.length})</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {existingMembers.map((member) => (
                      <div 
                        key={member.id} 
                        onClick={() => handleEditMember(member)}
                        className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[1.5rem] hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full shadow-sm ${member.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{member.users.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{member.users.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">Configurar Permissões ➡</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-200 border-dashed">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vincular Novo Colaborador via E-mail</label>
                <div className="flex gap-3">
                  <input 
                    type="email" 
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm"
                    placeholder="DIGITE O E-MAIL DO INTEGRANTE..."
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={isLoading || !emailSearch}
                    className="px-8 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-30 shadow-lg"
                  >
                    {isLoading ? "🔍" : "Buscar"}
                  </button>
                </div>
                {error && <p className="text-red-600 text-[9px] font-black uppercase px-2 animate-bounce">{error}</p>}
              </div>
            </div>
          )}

          {/* VISÃO 2: ABAS DE MÓDULOS CONTRATADOS */}
          {foundUser && (
            <div className="space-y-6 animate-fade-in-up pb-5">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">⚙️ Controle de Chaves de Acesso</h3>
                <button onClick={() => setFoundUser(null)} className="text-[10px] font-black text-red-500 uppercase hover:underline tracking-widest">Voltar à Lista</button>
              </div>

              {/* CARD RESUMO DO INTEGRANTE */}
              <div className="bg-slate-800 p-6 rounded-[2rem] flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-lg font-black text-white uppercase tracking-tight">{foundUser.full_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{foundUser.email}</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Status:</span>
                  <button 
                    onClick={() => setIsActive(!isActive)}
                    className={`w-14 h-7 rounded-full relative transition-all shadow-inner ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isActive ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* 🛡️ NENHUM MÓDULO FUNCIONAL INSTALADO NA PLATAFORMA */}
              <div className="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-2xl">
                <p className="text-xs font-black text-yellow-700 uppercase tracking-tight">⚠️ NENHUM MÓDULO CONTRATADO ENCONTRADO NESTA EMPRESA.</p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER OPERACIONAL UNIFICADO */}
        <div className="p-8 border-t border-slate-200 flex gap-4 bg-white sticky bottom-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          <button 
            onClick={onClose}
            className="flex-1 py-5 border-2 border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Sair
          </button>
          {foundUser && (
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="flex-[2] py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] hover:bg-blue-600 shadow-xl transition-all disabled:opacity-30 active:scale-95"
            >
              {isLoading ? "SALVANDO..." : "Gravar Configurações 💾"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}