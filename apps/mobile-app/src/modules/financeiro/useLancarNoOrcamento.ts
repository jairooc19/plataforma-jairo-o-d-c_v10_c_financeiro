import { useCallback, useEffect, useState } from 'react';
import {
  cadastroFinanceiroService,
  lancamentoService,
  orcamentoService,
  dataPadraoNaCompetencia,
  ehDataNaCompetencia,
  hojeISO,
  type ContaMovimento,
  type ContaIdentificadora,
  type LinhaDoDinheiro,
} from '@jairo/core';

/**
 * 🧠 O CÉREBRO DO LANÇAMENTO A PARTIR DO DINHEIRO DO PERÍODO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/useLancarNoOrcamento.ts
 *
 * É o "NOVO LANÇAMENTO" reduzido, o mesmo desenho que o site já tem. O que sai e
 * o que fica — e o porquê, que é o que importa para quem mexer nisto depois:
 *
 *   ✗ TRANSFERÊNCIA    — transferir não consome orçamento: é o mesmo dinheiro
 *                        mudando de lugar.
 *   ✗ ORDEM NO EXTRATO — ⚠️ ela NÃO deixa de existir: o banco a atribui sozinho
 *                        (RN-11), mandando o lançamento para o fim do dia. O que
 *                        some é o CAMPO. Se ela sumisse de verdade, o extrato
 *                        embaralharia os lançamentos do mesmo dia a cada abertura.
 *   ✗ REGIME           — fixo em CAIXA, e é coerente: o realizado do orçamento só
 *                        conta CAIXA (RN-19), então um lançamento de COMPETÊNCIA
 *                        não mexeria na barra que a pessoa está olhando.
 *   ⛔ TIPO DO MOVIMENTO — decidido pelo TIPO da conta: ENTRADA na receita, SAÍDA
 *                        na despesa. Em OUTRAS fica livre, porque "OUTRAS" existe
 *                        justamente para o que vai nos dois sentidos.
 *   ✓ CONTA MOVIMENTO  — a única pergunta de verdade que sobra: de onde sai (ou
 *                        para onde entra) o dinheiro.
 *
 * ⚠️ A BARRA DAQUELA CONTA É RELIDA A CADA GRAVAÇÃO, e é por isso que existe o
 * contador `releitura` abaixo — ver a explicação nele.
 */
export function useLancarNoOrcamento(
  tenantId: string | null,
  contaIdentificadoraId: string,
  competencia: string,
) {
  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [categoria, setCategoria] = useState<ContaIdentificadora | null>(null);
  const [linha, setLinha] = useState<LinhaDoDinheiro | null>(null);

  const [contaMovimentoId, setContaMovimentoId] = useState('');
  const [dataEscolhida, setData] = useState<string | null>(null);
  const [tipoMov, setTipoMov] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [propriedade, setPropriedade] = useState<'PROPRIO' | 'TERCEIROS'>('PROPRIO');
  const [valor, setValor] = useState(0);
  const [historico, setHistorico] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gravados, setGravados] = useState(0);

  /**
   * ⚠️ UM CONTADOR QUE SÓ CRESCE, e não um `useCallback` chamado de fora.
   *
   * A busca precisa ser refeita DEPOIS DE GRAVAR — e gravar não muda a conta nem a
   * competência, que são as dependências naturais do efeito. É a armadilha que este
   * projeto já documentou na sugestão de ordem do lançamento: **prender um efeito ao
   * que MUDA falha quando a tela foi feita para NÃO mudar.** Um número que só cresce
   * é o jeito de dizer "leia de novo, mesmo que nada pareça diferente".
   */
  const [releitura, setReleitura] = useState(0);

  const data = dataEscolhida ?? dataPadraoNaCompetencia(competencia, hojeISO());

  /** O tipo do movimento é decidido pelo TIPO da conta — e travado nos dois casos. */
  const tipoTravado = categoria?.tipo === 'RECEITA' || categoria?.tipo === 'DESPESA';

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      // ⚠️ O `if` fica DENTRO do efeito: `return` antecipado no corpo do componente
      // muda a contagem de hooks entre renderizações.
      if (!tenantId || !contaIdentificadoraId) {
        if (!cancelado) setCarregando(false);
        return;
      }

      try {
        const [cm, ci, dp] = await Promise.all([
          cadastroFinanceiroService.listarContasMovimento(tenantId),
          cadastroFinanceiroService.listarIdentificadoras(tenantId, { incluirInativos: true }),
          orcamentoService.dinheiroDoPeriodo(tenantId, competencia),
        ]);
        if (cancelado) return;

        const cat = ci.find((c) => c.id === contaIdentificadoraId) ?? null;
        setContas(cm);
        setCategoria(cat);
        setLinha(dp.find((l) => l.conta_id === contaIdentificadoraId) ?? null);

        if (cat?.tipo === 'RECEITA') setTipoMov('ENTRADA');
        else if (cat?.tipo === 'DESPESA') setTipoMov('SAIDA');
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'FALHA AO CARREGAR.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [tenantId, contaIdentificadoraId, competencia, releitura]);

  /**
   * A data escolhida cai FORA da competência que a pessoa está olhando?
   *
   * ⚠️ ISTO É AVISO, NUNCA BLOQUEIO. Lançar 03/10 no orçamento de setembro produz
   * um lançamento **válido** que não mexe naquela barra — e quem não for avisado
   * conclui que a gravação falhou, e lança de novo. Mas pode ser proposital, então
   * a tela pergunta em vez de recusar.
   */
  const dataForaDaCompetencia = !ehDataNaCompetencia(data, competencia);

  const gravar = useCallback(async () => {
    if (!tenantId || !contaMovimentoId || valor <= 0) return;

    setGravando(true);
    setErro(null);
    setAviso(null);
    try {
      await lancamentoService.gravar(tenantId, {
        id: null,
        conta_movimento_id: contaMovimentoId,
        conta_identificadora_id: contaIdentificadoraId,
        data_movimento: data,
        // ⚠️ `null` = o banco escolhe a próxima ordem do dia (RN-11).
        ordem_extrato: null,
        tipo_movimento: tipoMov,
        propriedade,
        regime: 'CAIXA',
        valor_centavos: valor,
        historico: historico || null,
      });

      setAviso('LANÇAMENTO REGISTRADO. A BARRA ACIMA JÁ FOI ATUALIZADA.');
      setGravados((n) => n + 1);

      // ⚠️ MANTÉM CONTA E DATA, LIMPA VALOR E HISTÓRICO. Lançar em série é o caso
      // comum (cinco notas do mesmo dia, do mesmo caixa); zerar tudo obrigaria a
      // reescolher as duas coisas que NÃO mudam a cada lançamento.
      setValor(0);
      setHistorico('');
      setReleitura((n) => n + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'FALHA AO GRAVAR O LANÇAMENTO.');
    } finally {
      setGravando(false);
    }
  }, [tenantId, contaMovimentoId, contaIdentificadoraId, data, tipoMov, propriedade, valor, historico]);

  return {
    contas,
    categoria,
    linha,
    carregando,
    gravando,
    erro,
    aviso,
    gravados,
    contaMovimentoId,
    setContaMovimentoId,
    data,
    setData,
    tipoMov,
    setTipoMov,
    tipoTravado,
    propriedade,
    setPropriedade,
    valor,
    setValor,
    historico,
    setHistorico,
    dataForaDaCompetencia,
    /** `true` quando dá para gravar: conta escolhida e valor acima de zero. */
    podeGravar: !!contaMovimentoId && valor > 0 && !gravando,
    gravar,
  };
}
