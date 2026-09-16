"use client";

import { useEffect, useState } from "react";
import { lancamentoService, type LancamentoNaLista } from "@jairo/core";

/**
 * 🔎 O ESTADO DA JANELA DE DETALHE DO LANÇAMENTO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/lancamento/useDetalheDoLancamento.ts
 *
 * Busca UM lançamento inteiro e cuida do Esc. Nada de desenho mora aqui — a
 * janela é `DetalheDoLancamento.tsx`, e a regra de ouro do projeto manda
 * separar as duas coisas.
 *
 * ⚠️ A BUSCA É POR `id`, E NÃO PELA LINHA QUE O USUÁRIO CLICOU. A linha do
 * extrato é uma fotografia de dez campos feita para somar saldo; o registro
 * tem dezessete. Reaproveitar a linha encheria a janela de campos em branco.
 *
 * ⚠️ O `id` PODE TROCAR SEM A JANELA FECHAR — basta clicar noutra linha com a
 * janela aberta. Por isso o efeito depende dele e zera o dado antes de buscar:
 * sem isso, a janela mostraria por um instante o lançamento ANTERIOR sob o
 * cabeçalho do novo, que é o tipo de engano que ninguém percebe estar vendo.
 */
export function useDetalheDoLancamento(
  tenantId: string | null,
  lancamentoId: string | null,
  aoFechar: () => void,
) {
  const [dado, setDado] = useState<LancamentoNaLista | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // ⚠️ O `if` fica DENTRO do efeito, nunca antes dele: a contagem de hooks
    // tem de ser a mesma em toda renderização.
    if (!tenantId || !lancamentoId) return;

    // Descartada quando o efeito é substituído — evita que uma resposta lenta
    // do lançamento anterior sobrescreva a do que o usuário acabou de abrir.
    let valida = true;

    const buscar = async () => {
      setDado(null);
      setErro(null);
      setCarregando(true);
      try {
        const r = await lancamentoService.detalhar(tenantId, lancamentoId);
        if (!valida) return;
        if (r) setDado(r);
        else setErro("ESTE LANÇAMENTO NÃO EXISTE MAIS. ATUALIZE O EXTRATO.");
      } catch (e) {
        if (valida) setErro(e instanceof Error ? e.message : "FALHA AO LER O LANÇAMENTO.");
      } finally {
        if (valida) setCarregando(false);
      }
    };

    void buscar();
    return () => { valida = false; };
  }, [tenantId, lancamentoId]);

  /** Esc fecha — o mesmo reflexo de qualquer janela do sistema operacional. */
  useEffect(() => {
    if (!lancamentoId) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") aoFechar(); };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [lancamentoId, aoFechar]);

  return { dado, carregando, erro };
}
