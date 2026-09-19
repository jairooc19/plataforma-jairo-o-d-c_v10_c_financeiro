"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cadastroFinanceiroService, lancamentoService, permissaoFinanceiroService,
  formatarBRL, formatarDataBR, paraCentavos, linhaAbreFicha,
  recadoDeExclusao, fraseDeReversibilidade,
  type ContaMovimento, type ContaIdentificadora,
} from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import { baixarTSV } from "@/components/financeiro/exportarTSV";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";
import IconeFin from "@/components/financeiro/IconeFin";
import AtalhosDeMes from "@/components/financeiro/AtalhosDeMes";
import MenuDeLinha, { type AcaoDeLinha } from "@/components/financeiro/MenuDeLinha";
import DetalheDoLancamento from "@/components/financeiro/lancamento/DetalheDoLancamento";

/**
 * 🔎 TELA: PESQUISAR LANÇAMENTOS (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/financeiro/lancamentos/pesquisar/page.tsx
 *
 * Os 13 filtros da especificação (seção 15), todos cruzando entre si (RN-03).
 *
 * ⚠️ A FAIXA DE TOTAIS ACIMA DA LISTA não é enfeite: numa pesquisa financeira é
 * a informação mais consultada — "quanto deu isso tudo?" — e sai da mesma
 * consulta, sem custo.
 */
export default function PesquisarLancamentosPage() {
  const { carregando: carregandoContexto, tenantId, erro: erroContexto, pode, nomeEmpresa } = useEmpresaAtiva();
  const router = useRouter();

  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [categorias, setCategorias] = useState<ContaIdentificadora[]>([]);
  const [membros, setMembros] = useState<Array<{ user_id: string; email: string }>>([]);

  const [contasSel, setContasSel] = useState<string[]>([]);
  const [categoriasSel, setCategoriasSel] = useState<string[]>([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [valorDe, setValorDe] = useState("");
  const [valorAte, setValorAte] = useState("");
  const [tipoCM, setTipoCM] = useState("");
  const [tipoCI, setTipoCI] = useState("");
  const [usuario, setUsuario] = useState("");
  const [texto, setTexto] = useState("");
  const [tipoMov, setTipoMov] = useState("");
  const [propriedade, setPropriedade] = useState("");
  const [regime, setRegime] = useState("");
  const [soTransferencias, setSoTransferencias] = useState(false);
  const [ultimos, setUltimos] = useState(false);

  const [linhas, setLinhas] = useState<Awaited<ReturnType<typeof lancamentoService.pesquisar>>>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * 🎁 O RECADO DEPOIS DE EXCLUIR (18/09/2026).
   *
   * ⚠️ ELE GUARDA O OBJETO INTEIRO, E NÃO SÓ O TEXTO, porque o `ofereceLixeira`
   * decide se aparece o atalho. Guardar só a frase obrigaria a tela a deduzir
   * de novo, pelo texto, algo que o Core já decidiu.
   */
  const [aviso, setAviso] = useState<ReturnType<typeof recadoDeExclusao> | null>(null);

  /**
   * Qual lançamento está com a ficha aberta (17/09/2026).
   *
   * ⚠️ GUARDA O `id`, E NÃO A LINHA. A janela busca o registro inteiro pelo id,
   * porque a linha da lista é um recorte: ela não traz PROPRIEDADE, REGIME, os
   * tipos gravados das duas contas nem as datas de criação. Guardar a linha
   * encheria a ficha de campos em branco — e é a mesma razão pela qual o
   * extrato faz assim desde 16/09.
   */
  const [detalheId, setDetalheId] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!tenantId) return;
      const [cm, ci, ms] = await Promise.all([
        cadastroFinanceiroService.listarContasMovimento(tenantId, { incluirInativos: true }),
        cadastroFinanceiroService.listarIdentificadoras(tenantId, { incluirInativos: true }),
        permissaoFinanceiroService.listarMembros(tenantId),
      ]);
      setContas(cm); setCategorias(ci);
      setMembros(ms.map((m) => ({ user_id: m.user_id, email: m.email })));
    };
    carregar();
  }, [tenantId]);

  const pesquisar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true); setErro(null);
    try {
      setLinhas(await lancamentoService.pesquisar(tenantId, {
        contasMovimento: contasSel.length ? contasSel : undefined,
        contasIdentificadoras: categoriasSel.length ? categoriasSel : undefined,
        dataInicial: de || null,
        dataFinal: ate || null,
        valorDeCentavos: valorDe ? paraCentavos(valorDe) : null,
        valorAteCentavos: valorAte ? paraCentavos(valorAte) : null,
        tipoContaMovimento: tipoCM || null,
        tipoContaIdentificadora: tipoCI || null,
        usuarioId: usuario || null,
        textoHistorico: texto || null,
        tipoMovimento: tipoMov || null,
        propriedade: propriedade || null,
        regime: regime || null,
        somenteTransferencias: soTransferencias,
        ultimosAdicionados: ultimos,
      }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA NA PESQUISA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, contasSel, categoriasSel, de, ate, valorDe, valorAte, tipoCM, tipoCI,
      usuario, texto, tipoMov, propriedade, regime, soTransferencias, ultimos]);

  const excluir = async (id: string) => {
    if (!tenantId) return;
    const l = linhas.find((x) => x.id === id);
    if (!l) return;
    const texto =
      `EXCLUIR ESTE LANÇAMENTO?\n\n` +
      `DATA: ${formatarDataBR(l.data_movimento)}\n` +
      `CONTA: ${l.conta_movimento?.nome ?? ""}\n` +
      `IDENTIFICADORA: ${l.conta_identificadora?.nome ?? ""}\n` +
      `TIPO: ${l.tipo_movimento}\n` +
      `VALOR: ${formatarBRL(l.valor_centavos)}\n\n` +
      (l.transferencia_id ? "ESTE LANÇAMENTO FAZ PARTE DE UMA TRANSFERÊNCIA. EXCLUIR VAI APAGAR AS DUAS PERNAS.\n\n" : "") +
      /*
        ⚠️ AQUI ESTAVA ESCRITO "ESTA AÇÃO NÃO PODE SER DESFEITA" — e isso deixou
        de ser verdade em 17/09/2026, quando a LIXEIRA nasceu. A frase ficou
        para trás por dois dias, ensinando o contrário do que o sistema faz:
        quem excluísse por engano não iria procurar o que achava perdido.
      */
      fraseDeReversibilidade(pode("lc_excluir_lote"));
    if (!window.confirm(texto)) return;

    setErro(null); setAviso(null);
    try {
      const r = await lancamentoService.excluir(tenantId, id);
      setAviso(recadoDeExclusao({
        apagados: r.apagados,
        eraTransferencia: r.eraTransferencia,
        podeRestaurar: pode("lc_excluir_lote"),
      }));
      await pesquisar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO EXCLUIR.");
    }
  };

  /**
   * As ações do menu OPÇÕES de cada linha (13/09/2026).
   *
   * ⚠️ EDITAR SAI DESTA TELA E VAI PARA "NOVO LANÇAMENTO". Não é desvio: o
   * formulário completo (conta, categoria, tipo, propriedade, regime, valor,
   * histórico e ordem) mora lá, e ele já sabe editar. Duplicá-lo aqui criaria
   * duas telas capazes de gravar o mesmo registro — e no dia em que uma regra
   * mudasse, alguém corrigiria só uma delas.
   *
   * ⚠️ TRANSFERÊNCIA NÃO OFERECE "EDITAR". Ela tem duas pernas amarradas
   * (RN-23); alterar uma sozinha deixaria o saldo da outra conta errado para
   * sempre. O caminho é excluir (o banco apaga as duas) e lançar de novo.
   */
  const acoesDoLancamento = (l: (typeof linhas)[number]): AcaoDeLinha[] => {
    const acoes: AcaoDeLinha[] = [];

    if ((pode("lc_editar_todos") || pode("lc_editar_proprios")) && !l.transferencia_id) {
      acoes.push({
        rotulo: "EDITAR",
        icone: "editar",
        aoClicar: () => router.push(`/dashboard/financeiro/lancamentos/novo?editar=${l.id}`),
      });
    }

    if (pode("lc_excluir_todos") || pode("lc_excluir_proprios")) {
      acoes.push({
        rotulo: "EXCLUIR",
        icone: "excluir",
        destrutiva: true,
        aoClicar: () => excluir(l.id),
      });
    }

    return acoes;
  };

  const totalEntradas = linhas.filter((l) => l.tipo_movimento === "ENTRADA").reduce((s, l) => s + l.valor_centavos, 0);
  const totalSaidas   = linhas.filter((l) => l.tipo_movimento === "SAIDA").reduce((s, l) => s + l.valor_centavos, 0);

  if (carregandoContexto) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }
  if (erroContexto) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">{erroContexto}</div>;
  }

  const rot = "block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1";
  const campo = "w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:border-blue-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tighter text-slate-800"><IconeFin nome="pesquisar" tamanho={26} traco={1.75} />PESQUISAR LANÇAMENTOS</h1>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-red-800">{erro}</div>}

      {/*
        O recado da exclusão — com o atalho para a lixeira SÓ para quem pode
        restaurar. Mandar quem não pode para uma tela que vai recusá-lo seria
        trocar uma frase inútil por um caminho sem saída.
      */}
      {aviso && (
        <div className="flex flex-wrap items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-xs font-bold uppercase text-emerald-800">
          <span>{aviso.texto}</span>
          {aviso.ofereceLixeira && (
            <Link href="/dashboard/financeiro/dependentes"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">
              <IconeFin nome="aberto" tamanho={13} />
              IR PARA A LIXEIRA
            </Link>
          )}
          <button type="button" onClick={() => setAviso(null)}
                  className="ml-auto text-[10px] font-black uppercase tracking-widest text-emerald-700">
            FECHAR
          </button>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="p-cm" className={rot}>CONTAS MOVIMENTO</label>
            <select id="p-cm" multiple value={contasSel} size={3}
                    onChange={(e) => setContasSel(Array.from(e.target.selectedOptions, (o) => o.value))}
                    className={`${campo} uppercase`}>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="p-ci" className={rot}>CONTAS IDENTIFICADORAS</label>
            <select id="p-ci" multiple value={categoriasSel} size={3}
                    onChange={(e) => setCategoriasSel(Array.from(e.target.selectedOptions, (o) => o.value))}
                    className={`${campo} uppercase`}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-de" className={rot}>PERÍODO — DE</label>
            <input id="p-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} className={campo} />
            <label htmlFor="p-ate" className={`${rot} mt-2`}>ATÉ</label>
            <input id="p-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={campo} />
            {/* ⚠️ OS MESMOS ATALHOS DA CONFERÊNCIA DA CONTA, PELO MESMO
                COMPONENTE (14/09/2026). Esta tela tem os mesmos dois campos de
                data e o mesmo atrito; uma segunda cópia do cálculo é sempre a
                que esquece um detalhe — aqui custou uma linha. */}
            <div className="mt-2">
              <AtalhosDeMes
                id="p-atalhos"
                de={de}
                ate={ate}
                aoEscolher={(periodo) => { setDe(periodo.de); setAte(periodo.ate); }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="p-vde" className={rot}>VALOR — DE</label>
            <input id="p-vde" type="text" value={valorDe} onChange={(e) => setValorDe(e.target.value)} className={campo} placeholder="0,00" />
            <label htmlFor="p-vate" className={`${rot} mt-2`}>ATÉ</label>
            <input id="p-vate" type="text" value={valorAte} onChange={(e) => setValorAte(e.target.value)} className={campo} placeholder="0,00" />
          </div>

          <div>
            <label htmlFor="p-tcm" className={rot}>TIPO DA CONTA MOVIMENTO</label>
            <select id="p-tcm" value={tipoCM} onChange={(e) => setTipoCM(e.target.value)} className={campo}>
              <option value="">TODOS</option><option>CAIXA</option><option>BANCO</option><option>OUTRAS</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-tci" className={rot}>TIPO DA IDENTIFICADORA</label>
            <select id="p-tci" value={tipoCI} onChange={(e) => setTipoCI(e.target.value)} className={campo}>
              <option value="">TODOS</option><option>DESPESA</option><option>RECEITA</option><option>OUTRAS</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-user" className={rot}>USUÁRIO</label>
            <select id="p-user" value={usuario} onChange={(e) => setUsuario(e.target.value)} className={campo}>
              <option value="">TODOS</option>
              {membros.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-hist" className={rot}>TEXTO NO HISTÓRICO</label>
            <input id="p-hist" type="text" value={texto} onChange={(e) => setTexto(e.target.value.toUpperCase())} className={`${campo} uppercase`} />
          </div>

          <div>
            <label htmlFor="p-tm" className={rot}>TIPO DO MOVIMENTO</label>
            <select id="p-tm" value={tipoMov} onChange={(e) => setTipoMov(e.target.value)} className={campo}>
              <option value="">TODOS</option><option value="ENTRADA">ENTRADA</option><option value="SAIDA">SAÍDA</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-prop" className={rot}>PROPRIEDADE</label>
            <select id="p-prop" value={propriedade} onChange={(e) => setPropriedade(e.target.value)} className={campo}>
              <option value="">TODAS</option><option value="PROPRIO">PRÓPRIO</option><option value="TERCEIROS">TERCEIROS</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-reg" className={rot}>REGIME</label>
            <select id="p-reg" value={regime} onChange={(e) => setRegime(e.target.value)} className={campo}>
              <option value="">TODOS</option><option value="CAIXA">CAIXA</option><option value="COMPETENCIA">COMPETÊNCIA</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
              <input type="checkbox" checked={soTransferencias} onChange={(e) => setSoTransferencias(e.target.checked)} className="w-4 h-4" />
              TRANSFERÊNCIA ENTRE CONTAS
            </label>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600">
              <input type="checkbox" checked={ultimos} onChange={(e) => setUltimos(e.target.checked)} className="w-4 h-4" />
              ÚLTIMOS ADICIONADOS
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" onClick={pesquisar}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
            <IconeFin nome="pesquisar" tamanho={16} />
            PESQUISAR
          </button>
          {pode("imprimir") && (
            <>
              <button type="button" disabled={linhas.length === 0}
                      onClick={() => abrirImpressao({
                        titulo: "LANÇAMENTOS",
                        empresa: nomeEmpresa,
                        filtros: [
                          de || ate ? `PERÍODO ${de || "…"} A ${ate || "…"}` : "TODOS OS PERÍODOS",
                          tipoMov ? `SOMENTE ${tipoMov}` : "ENTRADAS E SAÍDAS",
                          soTransferencias ? "SOMENTE TRANSFERÊNCIAS" : "",
                        ].filter(Boolean),
                        colunas: ["DATA", "CONTA", "IDENTIFICADORA", "TIPO", "VALOR", "HISTÓRICO", "USUÁRIO"],
                        colunasNumericas: [4],
                        linhas: linhas.map((l) => [
                          formatarDataBR(l.data_movimento),
                          l.conta_movimento?.nome ?? "",
                          l.conta_identificadora?.nome ?? "",
                          l.tipo_movimento === "SAIDA" ? "SAÍDA" : "ENTRADA",
                          formatarBRL(l.valor_centavos, { semSimbolo: true }),
                          l.historico ?? "",
                          l.usuario?.email ?? "",
                        ]),
                        rodape: `${linhas.length} LANÇAMENTO(S) · ENTRADAS ${formatarBRL(totalEntradas)} · SAÍDAS ${formatarBRL(totalSaidas)}`,
                      })}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-30">
                <IconeFin nome="imprimir" tamanho={15} />
                IMPRIMIR
              </button>
              <button type="button" disabled={linhas.length === 0}
                      onClick={() => baixarTSV(linhas, nomeEmpresa)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-30">
                <IconeFin nome="exportar" tamanho={15} />
                EXPORTAR TSV
              </button>
            </>
          )}
        </div>
      </section>

      {/* A faixa de totais do que está filtrado */}
      {linhas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Total rotulo="LANÇAMENTOS" valor={String(linhas.length)} />
          <Total rotulo="ENTRADAS" valor={formatarBRL(totalEntradas)} cor="text-emerald-700" />
          <Total rotulo="SAÍDAS" valor={formatarBRL(totalSaidas)} cor="text-red-700" />
          <Total rotulo="DIFERENÇA" valor={formatarBRL(totalEntradas - totalSaidas)} />
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
        {carregando ? (
          <p className="text-sm text-slate-400 font-bold uppercase">CARREGANDO…</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-slate-400 font-bold uppercase">NENHUM LANÇAMENTO ENCONTRADO.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                {["DATA","CONTA","IDENTIFICADORA","TIPO","VALOR","HISTÓRICO","USUÁRIO","AÇÕES"].map((c) => (
                  <th key={c} className="px-2 py-2 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                /**
                 * ⚠️ 17/09/2026 — A LINHA INTEIRA ABRE A FICHA, como já
                 * acontecia no extrato da CONFERÊNCIA DA CONTA. Quem decide se
                 * a linha abre é `linhaAbreFicha`, do Core, e não um `if`
                 * escrito aqui: as duas telas fazem a MESMA pergunta, e a
                 * resposta tem teste (`manutencaoRegras.test.ts`). Duas cópias
                 * do critério seriam duas chances de ele divergir.
                 */
                const abrir = linhaAbreFicha(l) ? () => setDetalheId(l.id) : undefined;
                return (
                <tr key={l.id}
                    onClick={abrir}
                    onKeyDown={abrir ? (e) => { if (e.key === "Enter") abrir(); } : undefined}
                    tabIndex={abrir ? 0 : undefined}
                    title={abrir ? "VER TODAS AS INFORMAÇÕES DESTE LANÇAMENTO" : undefined}
                    className={`hover:bg-blue-50/40 ${abrir ? "cursor-pointer" : ""}`}>
                  <td className="px-2 py-2 border-b border-slate-100 whitespace-nowrap">{formatarDataBR(l.data_movimento)}</td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">{l.conta_movimento?.nome}</td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase">
                    {l.conta_identificadora?.nome}
                    {l.transferencia_id && <span className="ml-1 text-[9px] font-black text-blue-600">TRANSF</span>}
                  </td>
                  <td className={`px-2 py-2 border-b border-slate-100 font-black ${l.tipo_movimento === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                    {l.tipo_movimento === "ENTRADA" ? "ENTRADA" : "SAÍDA"}
                  </td>
                  <td className="px-2 py-2 border-b border-slate-100 text-right font-mono">{formatarBRL(l.valor_centavos, { semSimbolo: true })}</td>
                  <td className="px-2 py-2 border-b border-slate-100 uppercase text-slate-500 max-w-[200px] truncate">{l.historico ?? ""}</td>
                  <td className="px-2 py-2 border-b border-slate-100 text-slate-400">{l.usuario?.email ?? ""}</td>
                  {/* ⚠️ EXCLUIR ERA UM BOTÃO SOLTO E ENTROU PARA DENTRO DE
                      "OPÇÕES" (13/09/2026), ao lado de EDITAR. Um botão de
                      apagar exposto direto na linha, alinhado com o cursor que
                      rola a tabela, é convite a clique acidental — e este
                      apaga dinheiro lançado. Duas etapas: abrir o menu, depois
                      escolher; e ainda há a confirmação do navegador. */}
                  {/* ⚠️ ESTA CÉLULA CORTA A PROPAGAÇÃO DO CLIQUE, E NÃO É
                      ENFEITE (17/09/2026). Com a linha inteira clicável, o
                      clique em "OPÇÕES" subiria até a `<tr>` e a ficha abriria
                      POR CIMA do menu — a ação que a pessoa pediu sumiria atrás
                      de uma janela que ela não pediu. O clique é um só; quem
                      está mais perto fica com ele. Não quebra build, não acusa
                      erro, e só aparece no dedo de quem usa. */}
                  <td className="px-2 py-2 border-b border-slate-100 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}>
                    <MenuDeLinha acoes={acoesDoLancamento(l)} />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* A ficha completa do lançamento — a mesma janela do extrato. */}
      <DetalheDoLancamento
        tenantId={tenantId}
        lancamentoId={detalheId}
        onFechar={() => setDetalheId(null)}
      />
    </div>
  );
}

function Total({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{rotulo}</p>
      <p className={`text-lg font-black mt-1 ${cor ?? "text-slate-800"}`}>{valor}</p>
    </div>
  );
}
