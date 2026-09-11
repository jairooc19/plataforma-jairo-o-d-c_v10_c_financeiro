import { useMemo } from 'react';

/**
 * 👋 A SAUDAÇÃO DO CABEÇALHO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useGreeting.ts
 *
 * v9: [100% NATIVO — HOOK]
 *
 * Devolve "Bom dia", "Boa tarde" ou "Boa noite" conforme a hora do aparelho, e
 * o primeiro nome de quem está logado.
 *
 * 🕐 A HORA É A DO APARELHO, E ISSO É O CERTO AQUI. Seria tentador usar o fuso
 * de São Paulo, como o CLAUDE.md exige para DATAS de emissão e vencimento — mas
 * a regra de lá existe porque aquelas datas são um FATO do negócio, igual para
 * todo mundo. Uma saudação é o oposto: ela se refere ao momento de quem lê. Um
 * Proprietário em Lisboa às 9h da manhã deve ler "Bom dia", não "Boa noite"
 * porque no Brasil ainda é madrugada.
 *
 * ✂️ O NOME É CORTADO NO PRIMEIRO ESPAÇO. "Jairo Oliveira da Cunha" num
 * cabeçalho de telefone quebraria em duas linhas ou viraria reticências, e
 * nenhum dos dois é uma saudação. O primeiro nome é como as pessoas se
 * cumprimentam.
 *
 * ⚠️ O `useMemo` NÃO TEM A HORA COMO DEPENDÊNCIA, e isso é deliberado. A
 * saudação é calculada quando a tela monta e não se atualiza sozinha à meia-noite
 * — corrigir isso exigiria um cronômetro rodando o tempo todo, redesenhando o
 * cabeçalho, para acertar um caso que só acontece se o usuário ficar com o app
 * aberto atravessando a virada da tarde para a noite. O custo não paga o ganho.
 */
export interface Saudacao {
  /** "Bom dia", "Boa tarde" ou "Boa noite". */
  periodo: string;
  /** Primeiro nome, ou string vazia quando não há nome. */
  primeiroNome: string;
  /** A frase pronta: "Bom dia, Jairo" — ou só "Bom dia" se não há nome. */
  texto: string;
}

export function useGreeting(nomeCompleto?: string | null): Saudacao {
  return useMemo(() => {
    const hora = new Date().getHours();

    const periodo =
      hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite';

    /**
     * `split(' ')[0]` sobre a string aparada. Sem o `trim()`, um nome que venha
     * do banco com espaço à frente devolveria string vazia como "primeiro
     * nome" — e a saudação sairia "Bom dia, " com a vírgula pendurada.
     */
    const primeiroNome = (nomeCompleto ?? '').trim().split(/\s+/)[0] ?? '';

    return {
      periodo,
      primeiroNome,
      texto: primeiroNome ? `${periodo}, ${primeiroNome}` : periodo,
    };
  }, [nomeCompleto]);
}
