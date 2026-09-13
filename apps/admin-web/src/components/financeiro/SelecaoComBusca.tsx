"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import IconeFin from "./IconeFin";

/**
 * 🔎 CAMPO QUE SE DIGITA **E** SE ESCOLHE DA LISTA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/SelecaoComBusca.tsx
 *
 * Pedido do dono do projeto em 13/09/2026: "APRESENTA A LISTA DE REGISTRO MAS
 * QUERO TAMBÉM PODER DIGITAR E AO DIGITAR O PRIMEIRO CARACTER IR APRESENTANDO
 * OS PRIMEIROS 4 REGISTROS EXISTENTES NO BANCO DE DADOS INDEPENDENTE DA POSIÇÃO
 * DO CARACTER NO REGISTRO."
 *
 * São, portanto, DOIS comportamentos no mesmo campo:
 *   • clicou sem digitar nada → a lista inteira, como o `<select>` antigo;
 *   • digitou 1 caractere ou mais → **as 4 sugestões que o BANCO devolve**.
 *
 * ⚠️ QUEM BUSCA É O BANCO, NÃO ESTA TELA. A função `fin_buscar_identificadoras`
 * já faz `LIKE '%texto%'` sobre a coluna `nome_normalizado` (sem acento, em
 * maiúsculas) e corta em 4. Filtrar aqui no navegador daria o mesmo resultado
 * HOJE — e mentiria amanhã: a lista carregada na tela é só a primeira página do
 * cadastro. Numa empresa com 500 categorias, o item digitado poderia
 * simplesmente não estar na memória do navegador, e o campo diria "nada
 * encontrado" sobre algo que existe.
 *
 * ⚠️ "INDEPENDENTE DA POSIÇÃO" É O `%` DOS DOIS LADOS. Um `LIKE 'texto%'`
 * (só no fim) acharia "LUZ" ao digitar "LU", mas nunca acharia "CONTA DE LUZ".
 * O `%texto%` acha nos dois casos — e é o que a função do banco já fazia desde
 * o degrau 7. Aqui só passamos a usá-la.
 *
 * ⚠️ O `debounce` DE 250ms NÃO É ENFEITE. Sem ele, digitar "ALUGUEL" dispara
 * SETE chamadas ao banco, e as respostas podem chegar fora de ordem — a lista
 * piscaria e poderia terminar mostrando o resultado de "ALUG" depois do de
 * "ALUGUEL". O contador `buscaAtual` descarta resposta atrasada mesmo assim,
 * porque debounce reduz a corrida, não a elimina.
 */

export interface OpcaoDeBusca {
  id: string;
  nome: string;
  tipo?: string;
}

export default function SelecaoComBusca({
  id, valor, opcoes, aoEscolher, aoBuscar, placeholder = "DIGITE OU ESCOLHA", desabilitado,
}: {
  id: string;
  /** O id do item escolhido, ou "" quando nada está escolhido. */
  valor: string;
  /** A lista já carregada — o que aparece ao abrir sem digitar nada. */
  opcoes: OpcaoDeBusca[];
  aoEscolher: (id: string) => void;
  /** A busca no banco. Recebe o texto digitado, devolve até 4. */
  aoBuscar: (texto: string) => Promise<OpcaoDeBusca[]>;
  placeholder?: string;
  desabilitado?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState<OpcaoDeBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [destacado, setDestacado] = useState(0);

  const caixa = useRef<HTMLDivElement>(null);
  const buscaAtual = useRef(0);

  const escolhido = opcoes.find((o) => o.id === valor) ?? null;

  /** O que a lista mostra agora: as 4 do banco, ou a lista inteira. */
  const listaVisivel = texto.trim() ? sugestoes : opcoes;

  /**
   * ⚠️ FECHA NO `click`, NUNCA NO `mousedown`. Com `mousedown` a lista desmonta
   * ANTES de o React processar o clique no item, e a escolha não acontece —
   * a lição nº 3 do CLAUDE.md, que já custou caro neste projeto.
   */
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);

  /**
   * A busca no banco, com espera.
   *
   * ⚠️ A CHAMADA VIVE DENTRO DO EFEITO e o estado só muda depois do `await`
   * (regra `react-hooks/set-state-in-effect`). Não se cala essa regra com
   * `eslint-disable` neste projeto.
   */
  useEffect(() => {
    const procurado = texto.trim();

    /**
     * ⚠️ SAIR SEM MEXER EM ESTADO NENHUM QUANDO O CAMPO ESTÁ VAZIO.
     *
     * A versão anterior fazia `setSugestoes([])` aqui, e o
     * `react-hooks/set-state-in-effect` reprovou — com razão: `setState` no
     * MESMO tique do efeito dispara renderização em cascata. Neste projeto essa
     * regra não se cala com `eslint-disable`.
     *
     * E não precisa mesmo: com o campo vazio, a lista exibida é `opcoes`, e
     * `sugestoes` nem é lido. Quem limpa é o `onChange`, que é evento de gente
     * digitando — o lugar certo para mudar estado.
     */
    if (!procurado) return;

    const meuTurno = ++buscaAtual.current;

    const relogio = setTimeout(() => {
      const rodar = async () => {
        // `setBuscando(true)` também mora AQUI DENTRO, e não no corpo do
        // efeito, pela mesma razão. Efeito colateral: o "PROCURANDO…" só
        // aparece depois dos 250ms — o que é melhor, porque em digitação rápida
        // ele nem chega a piscar.
        setBuscando(true);
        try {
          const achados = await aoBuscar(procurado);
          // Resposta atrasada de uma digitação anterior: descartada.
          if (meuTurno !== buscaAtual.current) return;
          setSugestoes(achados);
          setDestacado(0);
        } catch {
          if (meuTurno !== buscaAtual.current) return;
          setSugestoes([]);
        } finally {
          if (meuTurno === buscaAtual.current) setBuscando(false);
        }
      };
      rodar();
    }, 250);

    return () => clearTimeout(relogio);
  }, [texto, aoBuscar]);

  const selecionar = useCallback((opcao: OpcaoDeBusca) => {
    aoEscolher(opcao.id);
    setTexto("");
    setSugestoes([]);
    setAberto(false);
  }, [aoEscolher]);

  const limpar = () => {
    aoEscolher("");
    setTexto("");
    setSugestoes([]);
    setAberto(true);
  };

  /** Setas e Enter: quem digita rápido não quer tirar a mão do teclado. */
  const noTeclado = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setAberto(false); return; }
    if (!aberto) { setAberto(true); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestacado((i) => Math.min(i + 1, listaVisivel.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestacado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const alvo = listaVisivel[destacado];
      if (alvo) { e.preventDefault(); selecionar(alvo); }
    }
  };

  const campo =
    "w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none uppercase font-bold";

  return (
    <div className="relative" ref={caixa} onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${id}-lista`}
          autoComplete="off"
          disabled={desabilitado}
          // Enquanto não se digita nada, o campo MOSTRA o que está escolhido.
          // Ao digitar, ele passa a mostrar o que se está digitando — senão o
          // nome antigo brigaria com o texto novo no mesmo espaço.
          value={texto || escolhido?.nome || ""}
          placeholder={placeholder}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          onChange={(e) => {
            const novo = e.target.value.toUpperCase();
            setTexto(novo);
            setAberto(true);
            // Apagou tudo: volta à lista completa na hora, sem esperar o
            // debounce e sem deixar sugestões velhas na memória.
            if (!novo.trim()) { setSugestoes([]); setBuscando(false); }
          }}
          onKeyDown={noTeclado}
          className={`${campo} pr-16`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(escolhido || texto) && !desabilitado && (
            <button
              type="button"
              onClick={limpar}
              aria-label="LIMPAR A ESCOLHA"
              className="p-1 rounded text-slate-400 hover:text-slate-700"
            >
              <IconeFin nome="fechar" tamanho={14} />
            </button>
          )}
          <span className="text-slate-400 pointer-events-none">
            <IconeFin nome={buscando ? "recarregar" : "pesquisar"} tamanho={15} />
          </span>
        </div>
      </div>

      {aberto && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200
                     rounded-xl shadow-xl py-1"
        >
          {texto.trim() && (
            <li className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
              {buscando ? "PROCURANDO…" : `${sugestoes.length} DE ATÉ 4 SUGESTÕES DO BANCO`}
            </li>
          )}

          {listaVisivel.length === 0 && !buscando && (
            <li className="px-3 py-3 text-xs font-bold uppercase text-slate-400">
              NENHUM REGISTRO ENCONTRADO.
            </li>
          )}

          {listaVisivel.map((o, i) => (
            <li key={o.id} role="option" aria-selected={o.id === valor}>
              <button
                type="button"
                onClick={() => selecionar(o)}
                onMouseEnter={() => setDestacado(i)}
                className={`w-full text-left px-3 py-2 text-sm uppercase ${
                  i === destacado ? "bg-blue-50" : ""
                } ${o.id === valor ? "font-black text-blue-700" : "font-bold text-slate-700"}`}
              >
                {o.nome}
                {o.tipo && (
                  <span className="ml-2 text-[10px] font-bold text-slate-400">{o.tipo}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
