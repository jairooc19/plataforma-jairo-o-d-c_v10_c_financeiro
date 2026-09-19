import { useCallback, useEffect, useState } from 'react';
import {
  lancamentoService,
  mesInteiro,
  type LancamentoNaLista,
} from '@jairo/core';

/**
 * 🧠 O CÉREBRO DE "MEUS LANÇAMENTOS" — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/useMeusLancamentos.ts
 *
 * A lista do que **esta pessoa** lançou no período que ela está olhando no
 * DINHEIRO DO PERÍODO. Pedido do dono do projeto em 19/09/2026.
 *
 * ===========================================================================
 * ⚠️ QUEM FILTRA POR PESSOA É O BANCO, NÃO ESTA LISTA
 * ===========================================================================
 * O filtro `usuarioId` vai na consulta (`fin_pesquisar_lancamentos`), e não num
 * `.filter()` depois de receber tudo. A diferença não é de estilo: a resposta é
 * **paginada**. Trazendo a página inteira da empresa e filtrando aqui, uma pessoa
 * que lançou pouco num mês movimentado veria a lista vazia — os lançamentos dela
 * estariam na página 3, que nunca foi pedida.
 *
 * ⚠️ E O PERÍODO É O MÊS DA COMPETÊNCIA, do dia 1 ao último dia. Quem calcula é
 * `mesInteiro()`, no Core, com teste — a tentação de montar as duas datas à mão
 * aqui é onde nasce o defeito do "31 de março menos um mês".
 *
 * ⚠️ O TETO É EXPLÍCITO, E A LISTA AVISA QUANDO ENCOSTA NELE. É regra deste
 * projeto para lista que leva a uma ação destrutiva: sem o aviso, quem vê 200
 * registros acha que viu o mês inteiro, e conclui que um lançamento sumiu.
 */

/** O teto de registros por leitura. Acima disto, a tela avisa que cortou. */
const TETO = 200;

export function useMeusLancamentos(
  tenantId: string | null,
  usuarioId: string | null,
  competencia: string,
) {
  const [lista, setLista] = useState<LancamentoNaLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (comoRecarga = false) => {
      if (!tenantId || !usuarioId) {
        setCarregando(false);
        return;
      }

      if (comoRecarga) setRecarregando(true);
      else setCarregando(true);
      setErro(null);

      try {
        const mes = mesInteiro(competencia);
        const r = await lancamentoService.pesquisar(tenantId, {
          usuarioId,
          dataInicial: mes.de,
          dataFinal: mes.ate,
          porPagina: TETO,
        });
        setLista(r);
      } catch (e) {
        setLista([]);
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
    [tenantId, usuarioId, competencia],
  );

  useEffect(() => {
    const rodar = async () => {
      await carregar();
    };
    rodar();
  }, [carregar]);

  /**
   * Apaga um lançamento.
   *
   * ⚠️ O BANCO DECIDE, E ELE PODE APAGAR **DUAS** LINHAS. Numa transferência as
   * duas pernas são amarradas (RN-23): apagar uma apaga a outra, na mesma
   * transação. É por isso que a resposta traz `apagados` e `eraTransferencia` —
   * a tela precisa dizer isso a quem apertou o botão, senão a pessoa volta ao
   * extrato e encontra um lançamento a menos do que esperava.
   *
   * ⚠️ E A PERMISSÃO É CONFERIDA LÁ DENTRO. Esconder o botão na tela é conforto;
   * quem recusa é `fin_excluir_lancamento`, com `fin_pode`.
   */
  const excluir = useCallback(
    async (id: string) => {
      if (!tenantId) return null;
      const r = await lancamentoService.excluir(tenantId, id);
      await carregar(true);
      return r;
    },
    [tenantId, carregar],
  );

  const totalCentavos = lista.reduce(
    (soma, l) => soma + (l.tipo_movimento === 'ENTRADA' ? l.valor_centavos : -l.valor_centavos),
    0,
  );

  return {
    lista,
    carregando,
    recarregando,
    erro,
    /** `true` quando a leitura encostou no teto — a lista pode estar cortada. */
    cortada: lista.length >= TETO,
    teto: TETO,
    /** Entradas menos saídas do que ESTA pessoa lançou no mês. */
    totalCentavos,
    excluir,
    recarregar: () => carregar(true),
  };
}
