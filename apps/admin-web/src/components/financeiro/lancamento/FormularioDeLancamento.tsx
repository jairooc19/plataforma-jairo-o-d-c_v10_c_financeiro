"use client";

import Link from "next/link";
import { formatarBRL } from "@jairo/core";
import CampoDinheiro from "../CampoDinheiro";
import IconeFin from "../IconeFin";
import SelecaoComBusca from "../SelecaoComBusca";
import type { useNovoLancamento } from "./useNovoLancamento";

/**
 * ✍️ A COLUNA ESQUERDA: O FORMULÁRIO DO LANÇAMENTO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/lancamento/FormularioDeLancamento.tsx
 *
 * Só desenho. Estado e chamadas ao banco vivem em `useNovoLancamento.ts`.
 *
 * ⚠️ A PORTA DA TRANSFERÊNCIA É AQUI, E SÓ AQUI (decisão do dono do projeto em
 * 13/09/2026). Transferir é um jeito de lançar — duas pernas de lançamento numa
 * operação só (RN-23) —, então o caminho para ela sai de dentro de "Novo
 * Lançamento". Ela não está mais na tela inicial nem no menu OPÇÕES.
 */
export default function FormularioDeLancamento({
  m,
}: {
  m: ReturnType<typeof useNovoLancamento>;
}) {
  const { formulario: f, contaEscolhida, categoriaEscolhida, contas, categorias } = m;
  const { pode } = m.ctx;

  const rotulo = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5";
  const campo = "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none";

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-800">
          <IconeFin nome={m.editandoId ? "editar" : "novo"} tamanho={20} traco={1.75} />
          {m.editandoId ? "EDITAR LANÇAMENTO" : "NOVO LANÇAMENTO"}
        </h1>
        {m.gravadosNaSessao > 0 && !m.editandoId && (
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
            <IconeFin nome="ativo" tamanho={13} />
            {m.gravadosNaSessao} NESTA SESSÃO
          </span>
        )}
      </div>

      {/* ⚠️ A FAIXA DO MODO EDIÇÃO NÃO É ENFEITE. Sem ela, a pessoa que clicou
          em EDITAR numa linha do extrato veria um formulário preenchido e
          acharia que estava criando um lançamento novo — e o botão de gravar
          SUBSTITUIRIA o antigo em silêncio. */}
      {m.editandoId && (
        <div className="mb-4 flex items-start justify-between gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2 text-xs font-bold uppercase text-amber-900">
            <IconeFin nome="editar" tamanho={15} />
            <span>ALTERANDO UM LANÇAMENTO EXISTENTE — GRAVAR SUBSTITUI O REGISTRO.</span>
          </div>
          <button
            type="button"
            onClick={m.limparFormulario}
            className="shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-900 hover:text-amber-700"
          >
            <IconeFin nome="fechar" tamanho={13} />
            CANCELAR
          </button>
        </div>
      )}

      {/* A TRANSFERÊNCIA, no lugar que o dono do projeto pediu */}
      {pode("transferencia") && (
        <Link
          href="/dashboard/financeiro/transferencia"
          className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50
                     hover:bg-white hover:border-blue-400 transition-all"
        >
          <IconeFin nome="transferencia" tamanho={18} traco={1.75} />
          <span className="flex-1 text-xs font-black uppercase tracking-widest text-slate-700">
            TRANSFERÊNCIA ENTRE CONTAS
          </span>
          <IconeFin nome="abrirNivel" tamanho={16} />
        </Link>
      )}

      {m.erro && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3
                        text-xs font-bold uppercase text-red-800">
          <IconeFin nome="atencao" tamanho={15} />
          <span>{m.erro}</span>
        </div>
      )}
      {m.aviso && (
        <div className="mb-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3
                        text-xs font-bold uppercase text-emerald-800">
          <IconeFin nome="ativo" tamanho={15} />
          <span>{m.aviso}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* CONTA MOVIMENTO + adicionar nova (modal) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="l-conta" className={rotulo.replace(" mb-1.5", "")}>CONTA MOVIMENTO</label>
            {pode("cm_gravar") && (
              <button type="button" onClick={() => m.setModal("movimento")}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                <IconeFin nome="adicionar" tamanho={13} />
                ADICIONAR NOVA
              </button>
            )}
          </div>
          {/* ⚠️ CAMPO QUE SE DIGITA **E** SE ESCOLHE (14/09/2026). Era um
              `<select>` puro. Agora, ao digitar o primeiro caractere, o BANCO
              devolve até 4 sugestões, casando o texto em qualquer posição do
              nome e ignorando acento (`fin_buscar_contas_movimento`). Clicar
              sem digitar continua abrindo a lista completa, como antes.

              ⚠️ QUEM BUSCA É O BANCO, NÃO ESTA TELA. A lista `contas` é só a
              primeira página do cadastro: numa empresa com 300 contas, filtrar
              no navegador diria "nada encontrado" sobre algo que existe. */}
          <SelecaoComBusca
            id="l-conta"
            valor={f.contaId}
            opcoes={contas}
            aoEscolher={f.setContaId}
            aoBuscar={m.sugerirContasMovimento}
            placeholder="DIGITE PARA PROCURAR OU CLIQUE PARA VER A LISTA"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              TIPO: {contaEscolhida?.tipo ?? "—"}
            </span>
            {f.saldoDaConta !== null && (
              <span className="text-[11px] font-black uppercase text-slate-600">
                SALDO ATUAL: {formatarBRL(f.saldoDaConta)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="l-data" className={rotulo}>DATA DO MOVIMENTO</label>
            <input id="l-data" type="date" value={f.data} onChange={(e) => f.setData(e.target.value)} className={campo} />
          </div>
          <div>
            <label htmlFor="l-ordem" className={rotulo}>ORDEM NO EXTRATO</label>
            <input id="l-ordem" type="number" min={1} value={f.ordem}
                   onChange={(e) => f.setOrdem(e.target.value === "" ? "" : Number(e.target.value))}
                   className={campo} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="l-tipo" className={rotulo}>TIPO DO MOVIMENTO</label>
            <select id="l-tipo" value={f.tipoMov} onChange={(e) => f.setTipoMov(e.target.value as "ENTRADA" | "SAIDA")}
                    className={`${campo} font-bold`}>
              <option value="ENTRADA">ENTRADA</option>
              <option value="SAIDA">SAÍDA</option>
            </select>
          </div>
          <div>
            <label htmlFor="l-prop" className={rotulo}>PROPRIEDADE</label>
            <select id="l-prop" value={f.propriedade}
                    onChange={(e) => f.setPropriedade(e.target.value as "PROPRIO" | "TERCEIROS")}
                    className={`${campo} font-bold`}>
              <option value="PROPRIO">PRÓPRIO</option>
              <option value="TERCEIROS">TERCEIROS</option>
            </select>
          </div>
          <div>
            <label htmlFor="l-regime" className={rotulo}>REGIME</label>
            <select id="l-regime" value={f.regime}
                    onChange={(e) => f.setRegime(e.target.value as "CAIXA" | "COMPETENCIA")}
                    className={`${campo} font-bold`}>
              <option value="CAIXA">CAIXA</option>
              <option value="COMPETENCIA">COMPETÊNCIA</option>
            </select>
          </div>
        </div>

        {/* CONTA IDENTIFICADORA + adicionar nova */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="l-cat" className={rotulo.replace(" mb-1.5", "")}>
              CONTA IDENTIFICADORA DO MOVIMENTO
            </label>
            {pode("ci_gravar") && (
              <button type="button" onClick={() => m.setModal("identificadora")}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                <IconeFin nome="adicionar" tamanho={13} />
                ADICIONAR NOVA
              </button>
            )}
          </div>
          {/* ⚠️ CAMPO QUE SE DIGITA **E** SE ESCOLHE (13/09/2026). Era um
              `<select>` puro: com muitas categorias, achar uma exigia rolar a
              lista inteira. Agora, ao digitar o primeiro caractere, o BANCO
              devolve até 4 sugestões — casando o texto em qualquer posição do
              nome e ignorando acento (`fin_buscar_identificadoras`). Clicar sem
              digitar continua abrindo a lista completa, como antes. */}
          <SelecaoComBusca
            id="l-cat"
            valor={f.categoriaId}
            opcoes={categorias}
            aoEscolher={f.setCategoriaId}
            aoBuscar={m.sugerirIdentificadoras}
            placeholder="DIGITE PARA PROCURAR OU CLIQUE PARA VER A LISTA"
          />
          <span className="text-[11px] font-bold uppercase text-slate-400">
            TIPO: {categoriaEscolhida?.tipo ?? "—"}
          </span>
        </div>

        <div>
          <label htmlFor="l-valor" className={rotulo}>VALOR DO LANÇAMENTO</label>
          <CampoDinheiro id="l-valor" valorCentavos={f.valor} onChange={f.setValor} />
        </div>

        {/* ⚠️ O HISTÓRICO OCUPA A LINHA INTEIRA, ABAIXO DO VALOR (pedido de
            13/09/2026). Ele aceita 200 caracteres e dividia a linha com o valor:
            na prática, sobravam menos de 30 caracteres visíveis de cada vez, e
            quem escreve um histórico longo digitava às cegas. Campo de texto
            livre e campo numérico curto não têm por que dividir a mesma linha. */}
        <div>
          <label htmlFor="l-hist" className={rotulo}>HISTÓRICO DO MOVIMENTO</label>
          <input id="l-hist" type="text" maxLength={200} value={f.historico}
                 onChange={(e) => f.setHistorico(e.target.value.toUpperCase())}
                 className={`${campo} uppercase`} placeholder="OPCIONAL — ATÉ 200 CARACTERES" />
          <span className="text-[11px] font-bold uppercase text-slate-400">
            {f.historico.length}/200
          </span>
        </div>

        <button
          type="button"
          onClick={m.gravar}
          disabled={m.gravando || !f.contaId || !f.categoriaId || !f.data || f.valor <= 0}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white
                     text-xs font-black uppercase tracking-widest disabled:opacity-40 ${
                       m.editandoId ? "bg-amber-600" : "bg-blue-600"
                     }`}
        >
          <IconeFin nome="salvar" tamanho={16} />
          {m.gravando ? "GRAVANDO…" : m.editandoId ? "SALVAR ALTERAÇÕES" : "GRAVAR LANÇAMENTO"}
        </button>
      </div>
    </section>
  );
}
