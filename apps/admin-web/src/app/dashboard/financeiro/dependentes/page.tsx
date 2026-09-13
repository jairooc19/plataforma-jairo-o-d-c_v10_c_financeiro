"use client";

import { useCallback, useEffect, useState } from "react";
import {
  permissaoFinanceiroService, extratoService, cadastroFinanceiroService,
  PERMISSOES_FINANCEIRO, ROTULO_DA_PERMISSAO, PERMISSOES_PADRAO_DEPENDENTE,
  formatarDataBR,
  type PermissaoFinanceiro, type MembroDoModulo, type ContaMovimento, type FechamentoDaConta,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import IconeFin from "@/components/financeiro/IconeFin";

/**
 * 🔑 TELA: DEPENDENTES E FECHAMENTO DE PERÍODO (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/dependentes/page.tsx
 *
 * Duas coisas que só o Proprietário faz: habilitar Dependentes (com as 17
 * permissões, uma a uma) e fechar períodos.
 *
 * ⚠️ A TELA ESTÁ DENTRO DO MÓDULO, por decisão sua (pergunta 24) — assim ela
 * some junto quando o módulo for desplugado. Quem é membro da empresa continua
 * sendo assunto da plataforma; aqui só se decide o que ele pode fazer aqui
 * dentro.
 *
 * ⚠️ E OS BOTÕES SÃO CONFORTO, NÃO SEGURANÇA: quem recusa uma operação é a
 * função do banco, que confere `fin_pode()` antes de agir (RN-25).
 */
export default function DependentesPage() {
  const { carregando: carregandoContexto, tenantId, erro: erroContexto, pode } = useEmpresaAtiva();

  const [membros, setMembros] = useState<MembroDoModulo[]>([]);
  const [email, setEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoDaConta[]>([]);
  const [contaFechar, setContaFechar] = useState("");
  const [dataFechar, setDataFechar] = useState("");
  const [observacao, setObservacao] = useState("");

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    const [ms, cs, fs] = await Promise.all([
      permissaoFinanceiroService.listarMembros(tenantId),
      cadastroFinanceiroService.listarContasMovimento(tenantId),
      extratoService.fechamentos(tenantId),
    ]);
    setMembros(ms); setContas(cs); setFechamentos(fs);
  }, [tenantId]);

  // ⚠️ O `await` dentro da função interna não é enfeite: `react-hooks/
  // set-state-in-effect` recusa efeito que chame setState no MESMO tique, e a
  // regra está certa — seria uma renderização em cascata. Esperando a promessa,
  // o estado só muda quando a resposta chega.
  useEffect(() => {
    const rodar = async () => { await carregar(); };
    rodar();
  }, [carregar]);

  const procurar = async () => {
    if (!tenantId || !email.trim()) return;
    setBuscando(true); setErro(null); setAviso(null);
    try {
      const achado = await permissaoFinanceiroService.procurarPorEmail(tenantId, email.trim());
      if (!achado) {
        setErro("USUÁRIO NÃO ENCONTRADO. ELE PRECISA CRIAR UMA CONTA NA PLATAFORMA ANTES DE SER HABILITADO.");
        return;
      }
      const jaMembro = membros.find((m) => m.user_id === achado.id);
      setAviso(
        jaMembro
          ? `${achado.email} JÁ É MEMBRO DESTA EMPRESA. AJUSTE AS PERMISSÕES NA LISTA ABAIXO.`
          : `${achado.email} EXISTE NA PLATAFORMA, MAS AINDA NÃO É MEMBRO DESTA EMPRESA. ADICIONE-O PELA CENTRAL DE COMANDO DE TRIPULAÇÃO DO PAINEL.`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA NA BUSCA.");
    } finally {
      setBuscando(false);
    }
  };

  const alternarModulo = async (m: MembroDoModulo) => {
    if (!tenantId) return;
    setErro(null);
    try {
      await permissaoFinanceiroService.definirAcesso({
        tenantId, memberId: m.member_id, ativo: !m.modulo_ativo,
        permissoes: m.permissoes.length ? m.permissoes : PERMISSOES_PADRAO_DEPENDENTE,
      });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO ALTERAR O ACESSO.");
    }
  };

  const alternarPermissao = async (m: MembroDoModulo, p: PermissaoFinanceiro) => {
    if (!tenantId) return;
    const novas = m.permissoes.includes(p) ? m.permissoes.filter((x) => x !== p) : [...m.permissoes, p];
    try {
      await permissaoFinanceiroService.definirAcesso({
        tenantId, memberId: m.member_id, ativo: m.modulo_ativo, permissoes: novas,
      });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR A PERMISSÃO.");
    }
  };

  const fechar = async () => {
    if (!tenantId || !dataFechar) return;
    setErro(null); setAviso(null);
    try {
      const r = await extratoService.fecharPeriodo({
        tenantId, contaMovimentoId: contaFechar || null, fechadoAte: dataFechar, observacao: observacao || null,
      });
      setAviso(`PERÍODO FECHADO EM ${r.contasFechadas} CONTA(S).`);
      setObservacao("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO FECHAR O PERÍODO.");
    }
  };

  const reabrir = async (contaId: string) => {
    if (!tenantId) return;
    if (!window.confirm("REABRIR O PERÍODO DESTA CONTA? OS LANÇAMENTOS VOLTARÃO A ACEITAR ALTERAÇÃO.")) return;
    try {
      await extratoService.reabrirPeriodo(tenantId, contaId);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO REABRIR.");
    }
  };

  if (carregandoContexto) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }
  if (erroContexto) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">{erroContexto}</div>;
  }

  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-500 focus:outline-none";
  const rot = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800"><IconeFin nome="configuracoes" tamanho={26} traco={1.75} />CONFIGURAÇÕES DO MÓDULO</h1>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{erro}</div>}
      {aviso && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800">{aviso}</div>}

      {/* ---------------- DEPENDENTES ---------------- */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-5">DEPENDENTES DO MÓDULO</h2>

        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="d-email" className={rot}>PROCURAR USUÁRIO POR E-MAIL</label>
            <input id="d-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   className={campo} placeholder="PESSOA@EXEMPLO.COM" />
          </div>
          <button type="button" onClick={procurar} disabled={buscando || !email.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
            <IconeFin nome="pesquisar" tamanho={15} />
            {buscando ? "PROCURANDO…" : "PROCURAR"}
          </button>
        </div>

        <div className="space-y-4">
          {membros.filter((m) => m.role !== "OWNER").length === 0 && (
            <p className="text-sm text-slate-400 font-bold uppercase">
              NENHUM DEPENDENTE NESTA EMPRESA AINDA.
            </p>
          )}

          {membros.filter((m) => m.role !== "OWNER").map((m) => (
            <div key={m.member_id} className="border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-black uppercase text-slate-800 text-sm">{m.full_name ?? m.email}</p>
                  <p className="text-[11px] font-bold text-slate-400">{m.email}</p>
                </div>
                <button type="button" onClick={() => alternarModulo(m)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          m.modulo_ativo ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}>
                  <IconeFin nome={m.modulo_ativo ? "ativo" : "inativo"} tamanho={13} />
                  {m.modulo_ativo ? "MÓDULO ATIVO" : "MÓDULO DESATIVADO"}
                </button>
              </div>

              {m.modulo_ativo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PERMISSOES_FINANCEIRO.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-600">
                      <input type="checkbox" checked={m.permissoes.includes(p)}
                             onChange={() => alternarPermissao(m, p)} className="w-4 h-4" />
                      {ROTULO_DA_PERMISSAO[p]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FECHAMENTO DE PERÍODO ---------------- */}
      {pode("fechar_periodo") && (
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">FECHAMENTO DE PERÍODO</h2>
          <p className="text-[11px] font-bold uppercase text-slate-400 mb-5">
            DEPOIS DE FECHADO, NÃO SE CRIA, ALTERA NEM EXCLUI LANÇAMENTO ATÉ A DATA — NAQUELA CONTA.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label htmlFor="f-conta" className={rot}>CONTA</label>
              <select id="f-conta" value={contaFechar} onChange={(e) => setContaFechar(e.target.value)} className={`${campo} uppercase font-bold`}>
                <option value="">TODAS AS CONTAS</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-data" className={rot}>FECHADO ATÉ</label>
              <input id="f-data" type="date" value={dataFechar} onChange={(e) => setDataFechar(e.target.value)} className={campo} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="f-obs" className={rot}>OBSERVAÇÃO</label>
              <input id="f-obs" type="text" maxLength={200} value={observacao}
                     onChange={(e) => setObservacao(e.target.value.toUpperCase())}
                     className={`${campo} uppercase`} placeholder="CONFERIDO CONTRA O EXTRATO" />
            </div>
          </div>

          <button type="button" onClick={fechar} disabled={!dataFechar}
                  className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
            <IconeFin nome="fechado" tamanho={15} />
            FECHAR PERÍODO
          </button>

          {fechamentos.length > 0 && (
            <ul className="mt-6 divide-y divide-slate-100">
              {fechamentos.map((f) => {
                const conta = contas.find((c) => c.id === f.conta_movimento_id);
                return (
                  <li key={f.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase text-slate-800">
                        {conta?.nome ?? "CONTA"} · FECHADO ATÉ {formatarDataBR(f.fechado_ate)}
                      </p>
                      {f.observacao && <p className="text-[11px] font-bold uppercase text-slate-400">{f.observacao}</p>}
                    </div>
                    <button type="button" onClick={() => reabrir(f.conta_movimento_id)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                      <IconeFin nome="aberto" tamanho={13} />
                      REABRIR
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
