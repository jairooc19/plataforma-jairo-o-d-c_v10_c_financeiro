"use client";

import { useEffect, useState } from "react";
import IconeFin, { type NomeDeIcone } from "./IconeFin";

/**
 * ⋯ O BOTÃO "OPÇÕES" DE UMA LINHA DE TABELA (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/MenuDeLinha.tsx
 *
 * Pedido do dono do projeto em 13/09/2026, nas duas telas de lançamento:
 * um botão OPÇÕES por linha, com EDITAR e EXCLUIR dentro.
 *
 * ⚠️ POR QUE UM COMPONENTE, E NÃO O MENU COPIADO NAS DUAS TELAS. Porque os dois
 * menus têm as MESMAS duas armadilhas abaixo, e a segunda cópia é sempre a que
 * esquece uma delas.
 *
 * ⚠️ ARMADILHA 1 — `position: fixed`, NUNCA `absolute`. Estes menus abrem dentro
 * de tabelas que rolam (`overflow-x-auto`). Um menu `absolute` é RECORTADO pelo
 * container que rola: ele some atrás da borda da tabela, e a pessoa jura que o
 * botão não funciona. Com `fixed` + coordenadas calculadas no clique
 * (`getBoundingClientRect`), ele flutua sobre tudo. É a lição nº 4 do CLAUDE.md.
 *
 * ⚠️ ARMADILHA 2 — fechar no evento `click`, NUNCA no `mousedown`. Com
 * `mousedown`, a sequência é: o botão do mouse desce → o menu desmonta → o
 * clique tenta acontecer num botão que já não existe → **nada acontece**. O
 * item do menu simplesmente não responde, sem erro nenhum. É a lição nº 3 do
 * CLAUDE.md, e já custou caro neste projeto.
 *
 * ⚠️ ARMADILHA 3 — abrir para CIMA quando não cabe embaixo. Numa linha perto do
 * rodapé da tela, um menu que sempre desce fica escondido atrás da barra de
 * tarefas do sistema. Medimos o espaço antes de posicionar.
 */

export interface AcaoDeLinha {
  rotulo: string;
  icone: NomeDeIcone;
  aoClicar: () => void;
  /** Pinta em vermelho. Use para ações que destroem. */
  destrutiva?: boolean;
}

const ALTURA_ITEM = 38;
const RESPIRO = 12;

export default function MenuDeLinha({ acoes, rotuloAcessivel = "OPÇÕES DESTA LINHA" }: {
  acoes: AcaoDeLinha[];
  rotuloAcessivel?: string;
}) {
  const [posicao, setPosicao] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!posicao) return;
    const fechar = () => setPosicao(null);
    document.addEventListener("click", fechar);
    // Rolar a página com o menu aberto o deixaria "solto" no ar, longe da linha
    // de origem — porque `fixed` não acompanha a rolagem do conteúdo.
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("click", fechar);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [posicao]);

  const abrir = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (posicao) { setPosicao(null); return; }

    const r = e.currentTarget.getBoundingClientRect();
    const alturaMenu = acoes.length * ALTURA_ITEM + 8;
    const espacoAbaixo = window.innerHeight - r.bottom;

    setPosicao({
      top: espacoAbaixo < alturaMenu + RESPIRO ? r.top - alturaMenu - 4 : r.bottom + 4,
      right: window.innerWidth - r.right,
    });
  };

  if (acoes.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="menu"
        aria-expanded={posicao !== null}
        aria-label={rotuloAcessivel}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200
                   text-[10px] font-black uppercase tracking-widest text-slate-600"
      >
        <IconeFin nome="menu" tamanho={13} />
        OPÇÕES
      </button>

      {posicao && (
        <div
          role="menu"
          style={{ top: posicao.top, right: posicao.right }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-1"
        >
          {acoes.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              role="menuitem"
              onClick={() => { setPosicao(null); a.aoClicar(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase ${
                a.destrutiva ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <IconeFin nome={a.icone} tamanho={14} />
              {a.rotulo}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
