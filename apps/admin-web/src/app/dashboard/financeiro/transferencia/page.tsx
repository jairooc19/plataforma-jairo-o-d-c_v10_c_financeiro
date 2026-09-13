"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cadastroFinanceiroService, lancamentoService, formatarBRL, type ContaMovimento } from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import CampoDinheiro from "@/components/financeiro/CampoDinheiro";
import IconeFin from "@/components/financeiro/IconeFin";

/**
 * 🔄 TELA: TRANSFERÊNCIA ENTRE CONTAS (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/transferencia/page.tsx
 *
 * ⚠️ ESTA TELA EXISTE PARA EVITAR UM ERRO CARO. Sem ela, tirar R$ 500 do banco
 * e pôr na carteira seria registrado como dois lançamentos soltos — e aí o
 * total de despesas E o de receitas do mês ficariam inflados, porque o dinheiro
 * só mudou de bolso. Pior: apagar uma das pernas e esquecer a outra deixaria o
 * saldo de uma conta errado para sempre.
 *
 * Aqui é um fato só: o banco grava as duas pernas numa transação, com o mesmo
 * identificador de par (RN-23).
 *
 * ⚠️ NÃO HÁ CAMPOS DE PROPRIEDADE E REGIME, por decisão sua: o sistema grava
 * `PRÓPRIO` e `CAIXA` sozinho (RN-31). Com regime CAIXA, a transferência entra
 * no extrato pela regra geral e o saldo continua batendo com o do banco.
 */
export default function TransferenciaPage() {
  const { carregando: carregandoContexto, tenantId, erro: erroContexto, pode } = useEmpresaAtiva();
  const router = useRouter();

  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState(0);
  const [historico, setHistorico] = useState("");
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return;
      setContas(await cadastroFinanceiroService.listarContasMovimento(tenantId));
    };
    carregar();
  }, [tenantId]);

  const transferir = async () => {
    if (!tenantId) return;
    setErro(null); setAviso(null);
    setGravando(true);
    try {
      await lancamentoService.transferir({
        tenantId, contaOrigemId: origem, contaDestinoId: destino,
        data, valorCentavos: valor, historico: historico || null,
      });
      setAviso(`TRANSFERÊNCIA DE ${formatarBRL(valor)} REGISTRADA. AS DUAS PERNAS FORAM CRIADAS.`);
      setValor(0); setHistorico("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO TRANSFERIR.");
    } finally {
      setGravando(false);
    }
  };

  if (carregandoContexto) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }
  if (erroContexto) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">{erroContexto}</div>;
  }
  if (!pode("transferencia")) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">
      VOCÊ NÃO TEM PERMISSÃO PARA TRANSFERIR ENTRE CONTAS. FALE COM O PROPRIETÁRIO DA EMPRESA.
    </div>;
  }

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";
  const mesmaConta = origem !== "" && origem === destino;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800 mb-6">
        <IconeFin nome="transferencia" tamanho={26} traco={1.75} />
        TRANSFERÊNCIA ENTRE CONTAS
      </h1>

      {erro && <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{erro}</div>}
      {aviso && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800">{aviso}</div>}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="t-origem" className={rotulo}>CONTA DE ORIGEM (SAI O DINHEIRO)</label>
          <select id="t-origem" value={origem} onChange={(e) => setOrigem(e.target.value)} className={`${campo} uppercase font-bold`}>
            <option value="">SELECIONE</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="t-destino" className={rotulo}>CONTA DE DESTINO (ENTRA O DINHEIRO)</label>
          <select id="t-destino" value={destino} onChange={(e) => setDestino(e.target.value)} className={`${campo} uppercase font-bold`}>
            <option value="">SELECIONE</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {mesmaConta && (
            <p className="mt-1.5 text-[11px] font-bold uppercase text-red-700">
              A CONTA DE DESTINO DEVE SER DIFERENTE DA CONTA DE ORIGEM.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="t-data" className={rotulo}>DATA</label>
            <input id="t-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </div>
          <div>
            <label htmlFor="t-valor" className={rotulo}>VALOR</label>
            <CampoDinheiro id="t-valor" valorCentavos={valor} onChange={setValor} />
          </div>
        </div>

        <div>
          <label htmlFor="t-hist" className={rotulo}>HISTÓRICO</label>
          <input id="t-hist" type="text" maxLength={200} value={historico}
                 onChange={(e) => setHistorico(e.target.value.toUpperCase())}
                 className={`${campo} uppercase`} placeholder="OPCIONAL" />
        </div>

        <div className="bg-slate-50 rounded-xl p-4 text-[11px] font-bold uppercase text-slate-500 leading-relaxed">
          O SISTEMA VAI CRIAR DOIS LANÇAMENTOS: UMA SAÍDA NA ORIGEM E UMA ENTRADA NO DESTINO,
          COM A CATEGORIA &quot;TRANSFERÊNCIA ENTRE CONTAS&quot;. EXCLUIR UM DELES APAGA OS DOIS.
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={transferir}
                  disabled={gravando || !origem || !destino || mesmaConta || !data || valor <= 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
            <IconeFin nome="transferencia" tamanho={16} />
            {gravando ? "TRANSFERINDO…" : "TRANSFERIR"}
          </button>
          {/* ⚠️ VOLTA PARA "NOVO LANÇAMENTO", que desde 13/09/2026 é a única
              porta de entrada da transferência (a tela inicial e o menu OPÇÕES
              deixaram de oferecê-la). Devolver o usuário à lista de lançamentos
              o deixaria sem o caminho de volta que ele acabou de usar. */}
          <button type="button" onClick={() => router.push("/dashboard/financeiro/lancamentos/novo")}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-600">
            <IconeFin nome="voltar" tamanho={15} />
            VOLTAR
          </button>
        </div>
      </section>
    </div>
  );
}
