"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authService,
  tenantService,
  telemetry,
  ANALYTICS_EVENTS,
  type EmpresaParaSincronizar,
  type UsuarioAdmin,
} from "@jairo/core";
import { mensagemDeErro } from "@/lib/erro";

/**
 * 🛰️ CENTRAL DE COMANDOS — TRIAGEM E EMPRESAS (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/tenants/page.tsx
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  1. A PORTA DE ENTRADA DEIXOU DE SER UMA MARCA NO NAVEGADOR. A v9 liberava
 *     esta tela com `sessionStorage.dev_vip_access === 'true'` — uma linha no
 *     console do navegador bastava. Agora perguntamos ao banco
 *     (`authService.ehDesenvolvedor()`), e o banco confere a coluna
 *     `is_superuser`, que o cliente não pode escrever.
 *  2. AS SERVER ACTIONS SUMIRAM. Elas rodavam com a CHAVE MESTRA e não
 *     verificavam quem chamava — e Server Action, como a documentação do Next.js
 *     avisa, é alcançável por POST direto. As três operações viraram funções no
 *     banco (`admin_list_users`, `admin_list_user_tenants`,
 *     `admin_sync_user_tenants`), que conferem o superusuário por dentro.
 *  3. A GRAVAÇÃO É UMA TRANSAÇÃO SÓ. A v9 fazia até 2 + 2n chamadas separadas:
 *     um erro no meio deixava empresa criada, papel desatualizado e a tela
 *     dizendo que falhou.
 *
 * 🔐 ESCONDER A TELA NUNCA FOI SEGURANÇA — e continua não sendo. A checagem
 * abaixo existe para não mostrar um painel inútil a quem não é Desenvolvedor; a
 * tranca de verdade está dentro de cada função `admin_*`.
 */
export default function TenantsPage() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioAdmin | null>(null);

  // Estados do Formulário
  const [tenantName, setTenantName] = useState("");
  const [ativas, setAtivas] = useState<EmpresaParaSincronizar[]>([]);
  const [inativas, setInativas] = useState<EmpresaParaSincronizar[]>([]);
  const [desativadas, setDesativadas] = useState<string[]>([]);

  const carregarUsuarios = useCallback(async () => {
    setLoading(true);
    setErroGeral(null);
    try {
      setUsuarios(await tenantService.listarUsuarios());
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      setErroGeral(mensagemDeErro(err, "Não foi possível carregar a lista de usuários."));
    } finally {
      setLoading(false);
    }
  }, []);

  // 🛡️ Quem pode ver esta tela?
  useEffect(() => {
    const verificarAcesso = async () => {
      const ehDev = await authService.ehDesenvolvedor();
      if (!ehDev) {
        router.replace("/dashboard");
        return;
      }
      carregarUsuarios();
    };
    verificarAcesso();
  }, [router, carregarUsuarios]);

  const handleOpenModal = async (usuario: UsuarioAdmin) => {
    setSelectedUser(usuario);
    setIsModalOpen(true);
    setLoadingModal(true);
    setDesativadas([]);
    setAtivas([]);
    setInativas([]);
    setTenantName("");

    try {
      const empresas = await tenantService.listarEmpresasDoUsuario(usuario.id);

      setAtivas(
        empresas
          .filter((e) => e.is_active)
          .map((e) => ({ tenant_id: e.tenant_id, name: e.tenant_name, is_active: true }))
      );
      setInativas(
        empresas
          .filter((e) => !e.is_active)
          .map((e) => ({ tenant_id: e.tenant_id, name: e.tenant_name, is_active: false }))
      );
    } catch (err) {
      console.error("Erro ao carregar empresas do usuário:", err);
      setErroGeral(mensagemDeErro(err));
    } finally {
      setLoadingModal(false);
    }
  };

  const adicionarEmpresa = () => {
    const nome = tenantName.trim();
    if (!nome) return;
    // Sem `slug` e sem `isNew`: o banco gera o slug (e sabe quais já existem), e
    // "empresa nova" passou a ser simplesmente `tenant_id` ausente.
    setAtivas([...ativas, { name: nome, is_active: true }]);
    setTenantName("");
  };

  /** "Remover" desativa: a empresa vai para o histórico e pode voltar. */
  const removerEmpresa = (indice: number) => {
    const alvo = ativas[indice];
    if (alvo.tenant_id) {
      setDesativadas([...desativadas, alvo.tenant_id]);
      setInativas([...inativas, { ...alvo, is_active: false }]);
    }
    setAtivas(ativas.filter((_, i) => i !== indice));
  };

  const reabilitarEmpresa = (indice: number) => {
    const alvo = inativas[indice];
    setDesativadas(desativadas.filter((id) => id !== alvo.tenant_id));
    setAtivas([...ativas, { ...alvo, is_active: true }]);
    setInativas(inativas.filter((_, i) => i !== indice));
  };

  const gravar = async () => {
    if (!selectedUser) return;
    setLoading(true);

    try {
      await tenantService.sincronizarEmpresas(selectedUser.id, ativas, desativadas);
      telemetry.capture(ANALYTICS_EVENTS.TENANTS_SYNCED, { alvo: selectedUser.id });
      setIsModalOpen(false);
      await carregarUsuarios();
    } catch (error: unknown) {
      const mensagem = mensagemDeErro(error);
      if (mensagem.includes("NOME_EMPRESA_DUPLICADO")) {
        alert("ESTE USUÁRIO JÁ TEM UMA EMPRESA COM ESSE NOME.");
      } else {
        alert("Erro ao salvar: " + mensagem);
      }
    } finally {
      setLoading(false);
    }
  };

  const pendentes = usuarios.filter((u) => {
    const papel = (u.role || "").toLowerCase();
    return papel === "pending" || papel === "user";
  });

  const operacionais = usuarios.filter((u) => (u.role || "").toLowerCase() === "active");

  if (loading && usuarios.length === 0) {
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

        {erroGeral && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-sm font-medium">
            {erroGeral}
          </div>
        )}

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-amber-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black uppercase text-slate-800">Triagem de Usuários</h2>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-xs font-black">{pendentes.length} PENDENTES</span>
          </div>

          <div className="space-y-4">
            {pendentes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum usuário aguardando triagem.</div>
            ) : (
              pendentes.map((usuario) => (
                <div key={usuario.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all gap-4">
                  <div>
                    <div className="font-black text-lg text-slate-800">{usuario.full_name || 'Usuário sem Nome'}</div>
                    <div className="text-sm text-blue-600 font-bold">{usuario.email}</div>
                  </div>
                  <button onClick={() => handleOpenModal(usuario)} className="w-full sm:w-auto bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-md">HABILITAR INFRAESTRUTURA</button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-black uppercase text-slate-800">Clientes Operacionais</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-xs font-black">{operacionais.length} ATIVOS</span>
          </div>

          <div className="space-y-4">
            {operacionais.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum cliente operacional.</div>
            ) : (
              operacionais.map((usuario) => (
                <div key={usuario.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all gap-4">
                  <div>
                    <div className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      {usuario.full_name || 'Usuário sem Nome'}
                    </div>
                    <div className="text-sm text-slate-500">{usuario.email}</div>
                  </div>
                  <button onClick={() => handleOpenModal(usuario)} className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-700 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all">GERENCIAR HABILITAÇÕES</button>
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
                  <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Consultando o banco...</p>
                </div>
              ) : (
                <>
                  <div className="p-8 sm:p-10 pb-6 shrink-0 border-b border-slate-100 bg-white z-10">
                    <div className="text-center">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                        {ativas.length > 0 || inativas.length > 0 ? 'Gerenciar Infraestrutura' : 'Habilitar Infraestrutura'}
                      </h3>
                      <p className="text-slate-500 font-medium mt-1">Usuário: <span className="text-blue-600 font-bold">{selectedUser?.full_name || selectedUser?.email}</span></p>
                    </div>

                    <div className="flex gap-2 mt-8">
                      <input type="text" placeholder="NOME DA NOVA EMPRESA/CLIENTE" value={tenantName} onChange={(e) => setTenantName(e.target.value.toUpperCase())} className="flex-1 p-5 rounded-2xl bg-slate-50 font-bold text-sm outline-none border-2 border-transparent focus:border-blue-200 transition-all" />
                      <button onClick={adicionarEmpresa} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-blue-600 transition-all text-xl">+</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 sm:p-10 pt-4 space-y-8 bg-slate-50/50">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Empresas Habilitadas</h4>
                      {ativas.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-xs italic">Nenhuma empresa ativa no momento.</div>
                      ) : (
                        ativas.map((empresa, index) => (
                          <div key={`ativa-${empresa.tenant_id ?? 'nova'}-${index}`} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between p-5 bg-slate-50/50">
                              <span className="font-black text-slate-800 uppercase text-xs tracking-widest">{empresa.name}</span>
                              <div className="flex gap-2">
                                <button onClick={() => removerEmpresa(index)} className="text-red-500 font-black text-[10px] px-3 uppercase hover:bg-red-50 rounded-xl transition-all">Remover</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {inativas.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Histórico de Empresas</h4>
                        {inativas.map((empresa, index) => (
                          <div key={`inativa-${empresa.tenant_id ?? index}`} className="bg-slate-100/50 rounded-3xl border border-slate-200 p-5 flex items-center justify-between opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-500 uppercase text-[10px] tracking-widest">{empresa.name}</span>
                              <span className="text-[9px] font-bold text-slate-400">DADOS PRESERVADOS</span>
                            </div>
                            <button onClick={() => reabilitarEmpresa(index)} className="bg-blue-100 text-blue-700 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">Reabilitar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-8 sm:p-10 pt-6 shrink-0 border-t border-slate-100 bg-white z-10 flex flex-col gap-3">
                    <button onClick={gravar} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all uppercase tracking-widest disabled:opacity-50">
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
