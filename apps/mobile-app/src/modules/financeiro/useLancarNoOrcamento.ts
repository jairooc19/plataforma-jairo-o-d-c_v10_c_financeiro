import { useCallback, useEffect, useState } from 'react';
import {
  cadastroFinanceiroService,
  lancamentoService,
  orcamentoService,
  dataPadraoNaCompetencia,
  ehDataNaCompetencia,
  ritmoDoMes,
  hojeISO,
  normalizarComoOBanco,
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
  /** O id do lançamento a EDITAR. `null`/ausente = lançamento novo. */
  lancamentoId: string | null = null,
) {
  const [contas, setContas] = useState<ContaMovimento[]>([]);
  const [categoria, setCategoria] = useState<ContaIdentificadora | null>(null);
  const [linha, setLinha] = useState<LinhaDoDinheiro | null>(null);

  const [contaMovimentoId, setContaMovimentoId] = useState('');
  const [dataEscolhida, setData] = useState<string | null>(null);
  const [tipoMov, setTipoMov] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [propriedade, setPropriedade] = useState<'PROPRIO' | 'TERCEIROS'>('PROPRIO');
  const [valor, setValor] = useState(0);
  const [historico, setHistoricoCru] = useState('');

  /**
   * ⚠️ MAIÚSCULAS E TETO DE 200, COMO NO SITE. O módulo grava histórico em caixa
   * alta em toda tela, e a coluna do banco tem limite — deixar o telefone gravar
   * minúsculas faria o mesmo lançamento aparecer diferente conforme o aparelho em
   * que foi digitado, e um texto longo demais só seria recusado no fim, pelo banco.
   */
  const setHistorico = useCallback((texto: string) => {
    setHistoricoCru(texto.toUpperCase().slice(0, 200));
  }, []);

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

  /** Congelado: `hojeISO()` no corpo mudaria à meia-noite, no meio da sessão. */
  const [hoje] = useState(hojeISO);

  const data = dataEscolhida ?? dataPadraoNaCompetencia(competencia, hoje);

  /**
   * ⚠️ CONGELADO NA PRIMEIRA RENDERIZAÇÃO, e a barra do topo o recebe. Eu passava
   * `ritmo={0}` nesta tela, o que apagava a marca do mês na barra — a mesma barra
   * que, na tela de origem, mostra quanto do mês já passou. Duas telas com a mesma
   * barra dizendo coisas diferentes é pior do que não ter a marca em nenhuma.
   */
  const ritmo = ritmoDoMes(competencia, hoje);

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

        /**
         * ✏️ MODO EDIÇÃO (19/09/2026): os campos nascem preenchidos com o que está
         * gravado.
         *
         * ⚠️ A LEITURA É POR `buscarPorId`, e não pela linha que a lista já tinha em
         * mãos. A lista traz o RECORTE que serve para somar; a edição precisa do
         * registro inteiro — é a mesma razão pela qual a ficha de detalhe do extrato
         * busca sob demanda em vez de alargar o `RETURNS TABLE` da listagem.
         */
        if (lancamentoId) {
          const atual = await lancamentoService.buscarPorId(tenantId, lancamentoId);
          if (!cancelado && atual) {
            setContaMovimentoId(atual.conta_movimento_id);
            setData(atual.data_movimento);
            setTipoMov(atual.tipo_movimento as 'ENTRADA' | 'SAIDA');
            setPropriedade(atual.propriedade as 'PROPRIO' | 'TERCEIROS');
            setValor(atual.valor_centavos);
            setHistoricoCru(atual.historico ?? '');
          }
        }

        const cat = ci.find((c) => c.id === contaIdentificadoraId) ?? null;
        setContas(cm);
        setCategoria(cat);
        setLinha(dp.find((l) => l.conta_id === contaIdentificadoraId) ?? null);

        /**
         * 🎯 A CONTA "ESCOLHER DEPOIS" JÁ VEM PREENCHIDA (19/09/2026, pedido do
         * dono do projeto).
         *
         * Ela é a conta de passagem de quem lança agora e decide de onde saiu o
         * dinheiro mais tarde — o caso mais comum de quem registra pelo telemóvel,
         * no balcão. Deixá-la como padrão tira o passo que mais custa na tela: a
         * única pergunta de verdade do formulário reduzido.
         *
         * ⚠️ A COMPARAÇÃO É POR `normalizarComoOBanco`, NUNCA POR IGUALDADE DE
         * TEXTO. É a mesma regra do `fin_normalizar` (sem acento, sem espaço nas
         * pontas, em maiúsculas) — cadastrada como "Escolher Depois", "ESCOLHER
         * DEPOIS " ou "escolher depois", ela é a mesma conta, e comparar cru
         * deixaria o campo vazio sem ninguém entender por quê.
         *
         * ⚠️ SÓ PREENCHE SE NADA ESTIVER ESCOLHIDO. Depois de gravar, a tela
         * MANTÉM a conta usada para o próximo lançamento (é o desenho de lançar em
         * série); sobrescrevê-la aqui desfaria essa escolha a cada releitura.
         *
         * ⚠️ E NÃO EXISTINDO A CONTA, O CAMPO FICA VAZIO — sem inventar substituto.
         * Nem toda empresa cadastra essa conta, e escolher outra por conta própria
         * gravaria dinheiro na conta errada.
         */
        setContaMovimentoId((atual) => {
          // ⚠️ NUNCA NA EDIÇÃO. Sugerir uma conta por cima do que está gravado
          // trocaria a conta do lançamento sem ninguém pedir — é a mesma armadilha
          // da sugestão de ordem, que o projeto já documentou: sugestão automática
          // durante a EDIÇÃO sobrescreve o dado real pelo palpite.
          if (lancamentoId) return atual;
          if (atual) return atual;
          const passagem = cm.find(
            (c) => normalizarComoOBanco(c.nome) === 'ESCOLHER DEPOIS',
          );
          return passagem ? passagem.id : atual;
        });

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
  }, [tenantId, contaIdentificadoraId, competencia, releitura, lancamentoId]);

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
        id: lancamentoId,
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

      if (lancamentoId) {
        /**
         * ⚠️ EDITAR NÃO LIMPA O FORMULÁRIO. Editar é UM ato, não uma série: zerar o
         * valor depois de gravar faria a tela parecer que perdeu a alteração, e um
         * segundo toque no botão gravaria o mesmo lançamento com valor zero.
         */
        setAviso('LANÇAMENTO ALTERADO. A BARRA ACIMA JÁ FOI ATUALIZADA.');
        setReleitura((n) => n + 1);
      } else {
        setAviso('LANÇAMENTO REGISTRADO. A BARRA ACIMA JÁ FOI ATUALIZADA.');
        setGravados((n) => n + 1);

        // ⚠️ MANTÉM CONTA E DATA, LIMPA VALOR E HISTÓRICO. Lançar em série é o caso
        // comum (cinco notas do mesmo dia, do mesmo caixa); zerar tudo obrigaria a
        // reescolher as duas coisas que NÃO mudam a cada lançamento.
        setValor(0);
        setHistorico('');
        setReleitura((n) => n + 1);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'FALHA AO GRAVAR O LANÇAMENTO.');
    } finally {
      setGravando(false);
    }
  }, [
    tenantId,
    contaMovimentoId,
    contaIdentificadoraId,
    data,
    tipoMov,
    propriedade,
    valor,
    historico,
    setHistorico,
    lancamentoId,
  ]);

  /**
   * A busca de contas movimento NO BANCO, para o campo que se digita.
   *
   * ⚠️ ELA MORA AQUI E NÃO NA TELA porque precisa do `tenantId`, e porque a tela
   * não deve conhecer o serviço — ela conhece este hook. Sem `tenantId` devolve
   * lista vazia em vez de estourar: o campo mostra "nada encontrado", que é a
   * verdade naquele instante.
   */
  const buscarContas = useCallback(
    async (texto: string) => {
      if (!tenantId) return [];
      return cadastroFinanceiroService.sugerirContasMovimento(tenantId, texto);
    },
    [tenantId],
  );

  return {
    contas,
    buscarContas,
    /** `true` quando a tela está editando um lançamento existente. */
    editando: lancamentoId !== null,
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
    ritmo,
    /** `true` quando dá para gravar: conta escolhida e valor acima de zero. */
    podeGravar: !!contaMovimentoId && valor > 0 && !gravando,
    gravar,
  };
}
