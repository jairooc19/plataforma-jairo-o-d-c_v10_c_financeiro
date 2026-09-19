import { useCallback, useEffect, useState } from 'react';
import {
  orcamentoService,
  competenciaAtual,
  ritmoDoMes,
  hojeISO,
  exibicaoDoDinheiro,
  alternarModoDoDinheiro,
  modoGravado,
  CHAVE_MODO_DINHEIRO,
  type ConfigDoDinheiro,
  type LinhaDoDinheiro,
  type ModoDoDinheiro,
} from '@jairo/core';

import { storageService } from '@/services/storageService';

/**
 * 🧠 O CÉREBRO DO DINHEIRO DO PERÍODO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/useDinheiroDoPeriodo.ts
 *
 * ⚠️ ELE NÃO FILTRA NADA E NÃO ESCONDE NADA. As contas que este membro pode ver e
 * se ele recebe valores são decididos DENTRO do banco, por
 * `fin_dinheiro_do_periodo`. Se o filtro morasse aqui, bastaria adulterar o
 * aplicativo para ver o que a tela escondeu — o valor teria viajado até o aparelho
 * de qualquer jeito.
 *
 * A `config` existe para a tela **se desenhar**: escrever "você vê somente o
 * percentual" e decidir se o botão de alternância pode ou não alternar.
 *
 * ===========================================================================
 * 🔀 O BOTÃO "VALORES + %" × "SÓ %" (19/09/2026)
 * ===========================================================================
 * A preferência de quem olha mora no COFRE DO APARELHO, e não em estado de
 * componente. O motivo é uma regra deste projeto: *"o que precisa sobreviver a um
 * VOLTAR não mora em estado"*. No telemóvel é pior que no site — sair da tela e
 * voltar **remonta** o componente, e quem tivesse escondido os valores para mostrar
 * o ecrã a alguém os veria reaparecer sozinhos.
 *
 * ⚠️ E A PREFERÊNCIA NÃO É AUTORIZAÇÃO. Quem está bloqueado pelo Proprietário
 * continua bloqueado, mesmo que edite o cofre à mão: a decisão é da
 * `exibicaoDoDinheiro()`, no Core, com 13 testes — e, antes dela, do banco, que
 * simplesmente não envia os valores. Ver `modoDinheiroRegras.ts`.
 */
export function useDinheiroDoPeriodo(tenantId: string | null) {
  const [competencia, setCompetencia] = useState<string>(() => competenciaAtual());

  const [linhas, setLinhas] = useState<LinhaDoDinheiro[]>([]);
  const [config, setConfig] = useState<ConfigDoDinheiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** A escolha do aparelho. `null` = nunca escolheu, ou ainda não foi lida. */
  const [escolha, setEscolha] = useState<ModoDoDinheiro | null>(null);

  /**
   * ⚠️ CONGELADO NA PRIMEIRA RENDERIZAÇÃO, como o gêmeo do site. `hojeISO()` no
   * corpo do hook mudaria de valor à meia-noite, no meio de uma sessão aberta, e a
   * marca do ritmo do mês saltaria sem ninguém tocar em nada.
   */
  const [hoje] = useState(hojeISO);

  // ─────────────────────────────────────────────────────────────────────────
  // A PREFERÊNCIA GRAVADA
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    const ler = async () => {
      const bruto = await storageService.getItem(CHAVE_MODO_DINHEIRO);
      if (!cancelado) setEscolha(modoGravado(bruto));
    };

    ler();
    return () => {
      cancelado = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // OS DADOS
  // ─────────────────────────────────────────────────────────────────────────
  const carregar = useCallback(
    async (comoRecarga = false) => {
      /**
       * ⚠️ O `if` FICA DENTRO DO EFEITO / DA FUNÇÃO, NUNCA ANTES DO HOOK. Um
       * `return` antecipado no corpo do componente muda a contagem de hooks entre
       * renderizações, e o React derruba a tela com "rendered fewer hooks than
       * expected". É proibição explícita do `CLAUDE.md`.
       */
      if (!tenantId) return;

      if (comoRecarga) setRecarregando(true);
      else setCarregando(true);
      setErro(null);

      try {
        const [cfg, r] = await Promise.all([
          orcamentoService.configDoDinheiro(tenantId),
          orcamentoService.dinheiroDoPeriodo(tenantId, competencia),
        ]);
        setConfig(cfg);
        setLinhas(r);
      } catch (e) {
        /**
         * 🎁 ESTADO DE ERRO DE VERDADE (bónus B4). No site a internet é dada; num
         * telemóvel ela cai no elevador. Uma roda girando para sempre é a forma
         * mais comum de um aplicativo PARECER quebrado estando são — então aqui o
         * erro vira texto na tela, com um botão de tentar de novo.
         */
        setLinhas([]);
        setErro(
          e instanceof Error
            ? e.message
            : 'NÃO FOI POSSÍVEL CARREGAR. VERIFIQUE A SUA CONEXÃO E TENTE DE NOVO.',
        );
      } finally {
        setCarregando(false);
        setRecarregando(false);
      }
    },
    [tenantId, competencia],
  );

  useEffect(() => {
    const rodar = async () => {
      await carregar();
    };
    rodar();
  }, [carregar]);

  // ─────────────────────────────────────────────────────────────────────────
  // O QUE A TELA CONSOME
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ⚠️ O BLOCO "FORA" NÃO CONTA AQUI, e a distinção importa: gastar sem orçar não
   * é "ter orçamento". Se o FORA contasse, a tela mostraria só o gasto imprevisto e
   * diria que o mês está orçado — o oposto da verdade.
   */
  const semOrcamento =
    !carregando && !linhas.some((l) => l.linha_tipo === 'CONTA' && l.bloco !== 'FORA');

  /** `true` quando o banco devolveu valores; `false` no modo percentual dele. */
  const veValores = config?.ve_valores !== false;

  const exibicao = exibicaoDoDinheiro(veValores, escolha);

  /**
   * Alterna e GRAVA. Recusa quando não pode — a recusa está no Core, e esta guarda
   * é a segunda: um toque que não deveria acontecer não deve gravar preferência.
   */
  const alternarModo = useCallback(async () => {
    if (!exibicao.podeAlternar) return;

    const proximo = alternarModoDoDinheiro(exibicao.modo);
    setEscolha(proximo);
    await storageService.setItem(CHAVE_MODO_DINHEIRO, proximo);
  }, [exibicao.podeAlternar, exibicao.modo]);

  return {
    competencia,
    setCompetencia,
    linhas,
    carregando,
    recarregando,
    erro,
    semOrcamento,
    veValores,
    /** `{ modo, podeAlternar, motivo }` — ver `modoDinheiroRegras.ts`. */
    exibicao,
    alternarModo,
    /** 🎁 Quanto do mês já passou, para a marca na barra. */
    ritmo: ritmoDoMes(competencia, hoje),
    recarregar: () => carregar(true),
  };
}
