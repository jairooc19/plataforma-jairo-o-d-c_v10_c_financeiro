"use client";

import { useState, useEffect } from "react";
import {
  supabase,
  tenantService,
  moduleService,
  type CandidatoDependente,
  type MembroDaEquipe,
  type ModuloContratado,
} from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

interface TeamManagementModalProps {
  onClose: () => void;
  tenantId: string;
}

/**
 * 👑 GESTÃO DE EQUIPE — O PAINEL DO PROPRIETÁRIO (PJODC v10)
 * Local: apps/admin-web/src/components/platform/team/TeamManagementModal.tsx
 *
 * ⚠️ v10 — A BUSCA POR E-MAIL AGORA EXIGE A EMPRESA. A função do banco
 * (`get_user_by_email_for_invite`) confere se quem pergunta é o DONO dela. Até a
 * v9 ela respondia a qualquer um — e, como o PostgreSQL concede `EXECUTE` a
 * PUBLIC por padrão, respondia inclusive a visitante anônimo: era um verificador
 * de "este e-mail tem conta aqui?" aberto na internet.
 *
 * ⚠️ v10 — `allowed_modules` É LISTA. A gravação manda `[]`, e não `''`: a
 * coluna virou `text[]` no banco.
 *
 * ⚠️ 12/09/2026 — AS CHAVES DE MÓDULO ESTAVAM FALTANDO AQUI, e por isso não
 * havia como liberar módulo nenhum a ninguém. Esta tela mostrava um cartaz fixo
 * dizendo "nenhum módulo contratado encontrado" — sem nunca ter perguntado ao
 * banco — e a gravação chamava `salvarDependente` sem a lista, o que ainda
 * APAGAVA as permissões de quem já tivesse alguma. Agora ela pergunta
 * (`moduleService.modulosContratados`), desenha uma caixa por módulo e carrega
 * as marcações do integrante ao abri-lo.
 *
 * ⚠️ O PROPRIETÁRIO NÃO APARECE NESTA LISTA — e não é esquecimento. `allowed_modules`
 * é a chave que ele entrega à TRIPULAÇÃO; o dono da empresa não se convida. O que a
 * empresa contratou já é o que ele pode abrir, e quem decide isso é
 * `modulos_do_membro()`, no banco.
 *
 * 🧹 SEM EFEITO DE REINICIALIZAÇÃO: o modal é MONTADO só enquanto aberto (quem
 * decide é o dashboard, com `{aberto && <TeamManagementModal/>}`), então cada
 * abertura nasce limpa.
 */
export default function TeamManagementModal({ onClose, tenantId }: TeamManagementModalProps) {
  const [emailSearch, setEmailSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<CandidatoDependente | null>(null);
  const [error, setError] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [existingMembers, setExistingMembers] = useState<MembroDaEquipe[]>([]);

  const [isActive, setIsActive] = useState(true);
  const [modulosDaEmpresa, setModulosDaEmpresa] = useState<ModuloContratado[]>([]);
  const [modulosMarcados, setModulosMarcados] = useState<string[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserEmail(user?.email || null);
        setExistingMembers(await tenantService.listarMembros(tenantId));
        setModulosDaEmpresa(await moduleService.modulosContratados(tenantId));
      } catch (err) {
        console.error("Erro ao carregar a equipe:", err);
        setError(mensagemDeErro(err, "NÃO FOI POSSÍVEL CARREGAR A EQUIPE."));
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
      const user = await tenantService.buscarUsuarioPorEmail(emailToSearch, tenantId);
      if (user) {
        setFoundUser(user);
        setIsActive(true);
        // Integrante que já existe traz as chaves dele; integrante novo começa sem nenhuma.
        const jaMembro = existingMembers.find((m) => m.user_id === user.id);
        setModulosMarcados(jaMembro?.allowed_modules ?? []);
      } else {
        setError("USUÁRIO NÃO LOCALIZADO: CERTIFIQUE-SE QUE O E-MAIL ESTÁ CORRETO.");
      }
    } catch (err) {
      setError(mensagemDeErro(err, "ERRO NA CONSULTA."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMember = (member: MembroDaEquipe) => {
    setFoundUser({
      id: member.user_id,
      full_name: member.users.full_name,
      email: member.users.email
    });
    setIsActive(member.is_active);
    setModulosMarcados(member.allowed_modules ?? []);
    setError("");
  };

  const alternarModulo = (moduleId: string) => {
    setModulosMarcados((atuais) =>
      atuais.includes(moduleId) ? atuais.filter((m) => m !== moduleId) : [...atuais, moduleId]
    );
  };

  const handleSave = async () => {
    if (!foundUser) return;
    setIsLoading(true);
    try {
      await tenantService.salvarDependente(tenantId, foundUser.id, isActive, modulosMarcados);
      setExistingMembers(await tenantService.listarMembros(tenantId));

      setFoundUser(null);
      setEmailSearch("");
      setModulosMarcados([]);
      alert("✅ CONFIGURAÇÕES DE ACESSO DA EQUIPE ATUALIZADAS!");
    } catch (err) {
      setError(mensagemDeErro(err, "FALHA AO GRAVAR NO BANCO DE DADOS."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-50 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white flex flex-col max-h-[90vh] overflow-hidden">

        <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Painel de Controle de Tripulação</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Governança Centralizada da Plataforma PJODC</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-10 h-10 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1">

          {/* VISÃO 1: LISTA GERAL DA EQUIPE */}
          {!foundUser && (
            <div className="space-y-6 animate-fade-in">
              {existingMembers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaboradores vinculados ({existingMembers.length})</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {existingMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleEditMember(member)}
                        className="w-full text-left flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[1.5rem] hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full shadow-sm ${member.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{member.users.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{member.users.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">Configurar Permissões ➡</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-200 border-dashed">
                <label htmlFor="busca-email" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vincular Novo Colaborador via E-mail</label>
                <div className="flex gap-3">
                  <input
                    id="busca-email"
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
                {error && <p className="text-red-600 text-[9px] font-black uppercase px-2">{error}</p>}
              </div>
            </div>
          )}

          {/* VISÃO 2: O INTEGRANTE ESCOLHIDO */}
          {foundUser && (
            <div className="space-y-6 animate-fade-in-up pb-5">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">⚙️ Controle de Chaves de Acesso</h3>
                <button onClick={() => setFoundUser(null)} className="text-[10px] font-black text-red-500 uppercase hover:underline tracking-widest">Voltar à Lista</button>
              </div>

              <div className="bg-slate-800 p-6 rounded-[2rem] flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-lg font-black text-white uppercase tracking-tight">{foundUser.full_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{foundUser.email}</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Status:</span>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    aria-label={isActive ? 'Desativar colaborador' : 'Ativar colaborador'}
                    className={`w-14 h-7 rounded-full relative transition-all shadow-inner ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isActive ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* 🔑 AS CHAVES DE MÓDULO — o que a EMPRESA contratou é o teto do que
                  o Proprietário pode distribuir. O gatilho `validar_modulos_membro`
                  recusaria qualquer coisa fora desta lista, de qualquer forma. */}
              {modulosDaEmpresa.length === 0 ? (
                <div className="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-2xl">
                  <p className="text-xs font-black text-yellow-700 uppercase tracking-tight">
                    ⚠️ NENHUM MÓDULO CONTRATADO NESTA EMPRESA.
                  </p>
                  <p className="text-[10px] font-bold text-yellow-600 uppercase mt-2">
                    A CONTRATAÇÃO É FEITA PELO DESENVOLVEDOR, NO PAINEL DE ENGENHARIA › MÓDULOS.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modulosDaEmpresa.map((modulo) => {
                    const marcado = modulosMarcados.includes(modulo.module_id);
                    return (
                      <label
                        key={modulo.module_id}
                        className={`flex items-center gap-4 p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
                          marcado ? "bg-blue-50 border-blue-400 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarModulo(modulo.module_id)}
                          className="w-5 h-5 accent-blue-600"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{modulo.nome}</p>
                          {modulo.descricao && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{modulo.descricao}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

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
