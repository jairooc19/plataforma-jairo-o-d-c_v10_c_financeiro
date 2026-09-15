"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import IconeFin from "../IconeFin";
import { OPCOES, type ItemDeMenu } from "./opcoes";

/**
 * 📋 O MENU "OPÇÕES" — PAINEL QUE ENTRA PELA ESQUERDA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/menu/PainelDeOpcoes.tsx
 *
 * Pedido do dono do projeto em 13/09/2026, em duas partes:
 *   1. o menu fica num LADO da tela (era o direito);
 *   2. a lista tem NÍVEL e SUBNÍVEL, e o subnível só aparece se o nível pai for
 *      clicado.
 *
 * ⚠️ EM 14/09/2026 ELE MUDOU PARA A ESQUERDA, E O BOTÃO FOI JUNTO. Mover só o
 * painel deixaria o clique num canto e o resultado no outro — funciona, mas o
 * olho acompanha o dedo, e esse salto cansa no uso diário. Quem abre o painel é
 * o botão da `MolduraFinanceiro`, que por isso também trocou de lado.
 *
 * ⚠️ TROCAR `right-0` POR `left-0` NÃO BASTA: A BORDA TAMBÉM VIRA. A linha
 * cinza divisória precisa ficar do lado voltado para o conteúdo — com
 * `border-l` num painel à esquerda, ela fica colada na borda da janela, onde
 * ninguém a vê, e o painel perde a separação visual do texto.
 *
 * ⚠️ POR QUE UM PAINEL LATERAL E NÃO A CAIXINHA SUSPENSA DE ANTES. A caixinha
 * abria colada ao botão e tinha altura livre: com os níveis abrindo e fechando,
 * ela cresceria e encolheria por cima do conteúdo, e num "CADASTROS" +
 * "LANÇAMENTOS" abertos ao mesmo tempo passaria do rodapé. O painel ocupa a
 * altura inteira, rola sozinho e não disputa espaço com a tela por baixo.
 *
 * ⚠️ O QUE ABRE UM NÍVEL É O CLIQUE, NÃO O PASSAR DO MOUSE. Menu que abre
 * sozinho ao roçar o cursor dispara na hora errada e é impossível de usar em
 * tela sensível ao toque — e o dono do projeto pediu "SE FOR CLICADO".
 *
 * ⚠️ O FUNDO ESCURO FECHA NO EVENTO `click`, NUNCA NO `mousedown`. Com
 * `mousedown` o painel desmonta ANTES de o React processar o clique do item, e
 * o item simplesmente não abre — a lição nº 3 do CLAUDE.md, que já custou caro
 * neste projeto.
 */

export default function PainelDeOpcoes({
  aberto, onFechar, pode, onEmDesenvolvimento,
}: {
  aberto: boolean;
  onFechar: () => void;
  /** Pergunta a permissão ao contexto. Sem permissão, o item nem é desenhado. */
  pode: (permissao: string) => boolean;
  onEmDesenvolvimento: (rotulo: string) => void;
}) {
  const pathname = usePathname();

  /**
   * Quais níveis estão abertos. Começa VAZIO — é isto que faz o subnível
   * aparecer só depois do clique no pai.
   */
  const [abertos, setAbertos] = useState<string[]>([]);

  const alternar = (rotulo: string) =>
    setAbertos((atuais) =>
      atuais.includes(rotulo) ? atuais.filter((r) => r !== rotulo) : [...atuais, rotulo],
    );

  /**
   * ⌨️ A TECLA ESC FECHA O PAINEL (14/09/2026).
   *
   * ⚠️ O EFEITO FICA ACIMA DO `if (!aberto) return null` DE PROPÓSITO. As regras
   * dos hooks do React proíbem chamar `useEffect` depois de um retorno
   * antecipado — a quantidade de hooks tem de ser a mesma em toda renderização.
   * Por isso quem decide é o `if` DENTRO do efeito, e não a posição dele.
   *
   * ⚠️ E ELE ESCUTA `keydown`, NÃO `keyup`. Com `keyup`, segurar a tecla não
   * fecharia nada até soltar, e o Esc de quem digita rápido se perderia.
   */
  useEffect(() => {
    if (!aberto) return;
    const noTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", noTeclado);
    return () => document.removeEventListener("keydown", noTeclado);
  }, [aberto, onFechar]);

  /** Um item só entra na tela se o usuário puder usá-lo. */
  const permitido = (item: ItemDeMenu) => !item.exige || pode(item.exige);

  /** Um nível pai sem nenhum filho permitido não deve aparecer vazio. */
  const visivel = (item: ItemDeMenu): boolean =>
    item.filhos ? item.filhos.some(permitido) : permitido(item);

  if (!aberto) return null;

  return (
    <>
      {/* Cortina: escurece o conteúdo e fecha ao clique fora do painel */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onFechar}
        aria-hidden="true"
      />

      <nav
        aria-label="OPÇÕES DO CONTROLE FINANCEIRO"
        className="fixed top-0 left-0 z-50 h-full w-[19rem] max-w-[85vw] bg-white border-r border-slate-200
                   shadow-2xl flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">OPÇÕES</span>
          <button
            type="button"
            onClick={onFechar}
            aria-label="FECHAR O MENU"
            className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
          >
            <IconeFin nome="fechar" tamanho={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {OPCOES.filter(visivel).map((item) => {
            if (item.filhos) {
              const estaAberto = abertos.includes(item.rotulo);
              return (
                <div key={item.rotulo}>
                  <button
                    type="button"
                    onClick={() => alternar(item.rotulo)}
                    aria-expanded={estaAberto}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black uppercase
                               tracking-wide text-slate-700 hover:bg-slate-100"
                  >
                    <IconeFin nome={item.icone} tamanho={18} />
                    <span className="flex-1 text-left">{item.rotulo}</span>
                    <IconeFin nome={estaAberto ? "fecharNivel" : "abrirNivel"} tamanho={16} />
                  </button>

                  {/* O SUBNÍVEL: só existe na árvore depois do clique no pai */}
                  {estaAberto && (
                    <div className="ml-4 pl-3 border-l border-slate-200 mt-1 space-y-0.5">
                      {item.filhos.filter(permitido).map((filho) => (
                        <ItemLink key={filho.rotulo} item={filho} pathname={pathname} onIr={onFechar} />
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (item.emDesenvolvimento) {
              return (
                <button
                  key={item.rotulo}
                  type="button"
                  onClick={() => { onFechar(); onEmDesenvolvimento(item.rotulo); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-black uppercase
                             tracking-wide text-slate-400 hover:bg-slate-50"
                >
                  <IconeFin nome={item.icone} tamanho={18} />
                  <span className="flex-1 text-left">{item.rotulo}</span>
                </button>
              );
            }

            return <ItemLink key={item.rotulo} item={item} pathname={pathname} onIr={onFechar} negrito />;
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
          CONTROLE FINANCEIRO
        </div>
      </nav>
    </>
  );
}

/** Uma folha do menu: leva a uma tela e fecha o painel. */
function ItemLink({
  item, pathname, onIr, negrito,
}: {
  item: ItemDeMenu;
  pathname: string | null;
  onIr: () => void;
  negrito?: boolean;
}) {
  const atual = pathname === item.href;
  return (
    <Link
      href={item.href!}
      onClick={onIr}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl uppercase tracking-wide ${
        negrito ? "text-sm font-black" : "text-[13px] font-bold"
      } ${atual ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
    >
      <IconeFin nome={item.icone} tamanho={negrito ? 18 : 16} />
      <span className="flex-1">{item.rotulo}</span>
    </Link>
  );
}
