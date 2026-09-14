/**
 * 📥 LEITURA DA COLUNA "A" DE UM CSV OU TSV (PJODC v10)
 * Local: packages/core/src/modules/financeiro/importacao.ts
 *
 * Pedido do dono do projeto em 13/09/2026: importar cadastros a partir de um
 * arquivo, lendo **apenas a primeira coluna**.
 *
 * ⚠️ ESTE ARQUIVO NÃO TEM NADA DE REACT E NÃO TOCA NO BANCO — de propósito.
 * Ele é uma função pura: entra texto, sai lista de nomes. Isso permite que ele
 * seja TESTADO no `npm test` (ver `importacao.test.ts`), o que é impossível com
 * lógica escondida dentro de um componente de tela. Ler arquivo mal formatado é
 * exatamente o tipo de coisa que se acerta com teste, e não com tentativa.
 *
 * ===========================================================================
 * ⚠️ POR QUE NÃO DÁ PARA FAZER `texto.split("\n").map(l => l.split(",")[0])`
 * ===========================================================================
 * Parece resolver, e falha em quatro situações reais e comuns:
 *
 *  1. **Vírgula dentro do nome.** `"MERCADO SILVA, LTDA",OUTRA` — o `split(',')`
 *     devolveria `"MERCADO SILVA` (com aspa e cortado no meio).
 *  2. **Quebra de linha dentro de aspas.** O CSV permite
 *     `"CONTA\nCOM DUAS LINHAS",X` — o `split('\n')` partiria um registro em dois.
 *  3. **O Excel brasileiro não usa vírgula.** Ele salva CSV com **ponto e
 *     vírgula**, porque a vírgula é o separador decimal aqui.
 *  4. **Aspas duplicadas.** Dentro de um campo com aspas, `""` significa uma
 *     aspa literal.
 *
 * Por isso a leitura abaixo percorre caractere a caractere, com estado.
 */

/** O que a leitura de um arquivo devolve. */
export interface LeituraDeColunaA {
  /** Os nomes encontrados na primeira coluna, na ordem do arquivo. */
  nomes: string[];
  /** O separador detectado, para a tela poder mostrar. */
  separador: 'TAB' | ';' | ',' | 'NENHUM';
  /** Quantas linhas o arquivo tinha ao todo (incluindo vazias). */
  linhasLidas: number;
}

/**
 * Descobre o separador do arquivo.
 *
 * ⚠️ A ORDEM DA PREFERÊNCIA NÃO É ALFABÉTICA, É PRÁTICA:
 *   1. TAB — se existe um TAB, o arquivo é TSV e ponto final (o dono do projeto
 *      já escolheu TSV para a exportação do módulo);
 *   2. `;` — o CSV do Excel em português;
 *   3. `,` — o CSV internacional.
 *
 * Se nenhum aparecer, o arquivo tem uma coluna só — e a linha inteira é o nome.
 *
 * ⚠️ A CONTAGEM IGNORA O QUE ESTÁ DENTRO DE ASPAS, E ISSO NÃO É PERFUMARIA.
 * A primeira versão fazia `texto.split('\n')[0]` e procurava os candidatos ali.
 * O teste "quebra de linha DENTRO de aspas" derrubou essa versão: num arquivo
 * que começa com `"CONTA COM\nDUAS LINHAS",X`, aquele `split` cortava no meio
 * das aspas e a "primeira linha" virava `"CONTA COM` — que não tem vírgula
 * nenhuma. O separador era dado como inexistente e a coluna A saía com o resto
 * da linha grudado: `CONTA COM\nDUAS LINHAS,X`.
 *
 * ⚠️ E A CONTAGEM É DO ARQUIVO INTEIRO (até 64 KB), não da primeira linha.
 * Um cabeçalho de uma coluna só ("NOME") não tem separador algum, e olhar só
 * para ele daria a mesma resposta errada.
 */
function detectarSeparador(texto: string): LeituraDeColunaA['separador'] {
  const amostra = texto.slice(0, 65536);
  let dentroDeAspas = false;
  let tabs = 0, pontoEVirgula = 0, virgulas = 0;

  for (let i = 0; i < amostra.length; i++) {
    const c = amostra[i];
    if (c === '"') {
      if (dentroDeAspas && amostra[i + 1] === '"') { i += 1; continue; }
      dentroDeAspas = !dentroDeAspas;
      continue;
    }
    if (dentroDeAspas) continue;
    if (c === '\t') tabs += 1;
    else if (c === ';') pontoEVirgula += 1;
    else if (c === ',') virgulas += 1;
  }

  if (tabs > 0) return 'TAB';
  if (pontoEVirgula > 0) return ';';
  if (virgulas > 0) return ',';
  return 'NENHUM';
}

/**
 * Percorre o texto e devolve a PRIMEIRA célula de cada linha.
 *
 * ⚠️ SÓ A PRIMEIRA CÉLULA É GUARDADA. Depois de fechar a coluna A, o resto da
 * linha é atravessado sem ser acumulado — respeitando aspas, porque é a única
 * forma de saber onde a linha realmente termina. Num arquivo com 40 colunas,
 * isso evita montar na memória 39 colunas que ninguém vai olhar.
 */
function extrairPrimeiraColuna(texto: string, sep: string): { nomes: string[]; linhas: number } {
  const nomes: string[] = [];
  let atual = '';
  let dentroDeAspas = false;
  let jaFechouColunaA = false;
  let linhas = 0;

  const fecharLinha = () => {
    nomes.push(atual.trim());
    atual = '';
    jaFechouColunaA = false;
    linhas += 1;
  };

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        // Duas aspas seguidas = uma aspa literal dentro do campo.
        if (texto[i + 1] === '"') {
          if (!jaFechouColunaA) atual += '"';
          i += 1;
        } else {
          dentroDeAspas = false;
        }
      } else if (!jaFechouColunaA) {
        atual += c;
      }
      continue;
    }

    if (c === '"') { dentroDeAspas = true; continue; }

    if (sep !== '' && c === sep) { jaFechouColunaA = true; continue; }

    if (c === '\n') { fecharLinha(); continue; }

    if (c === '\r') {
      // CRLF conta como UMA quebra; CR sozinho (Mac antigo) também.
      if (texto[i + 1] === '\n') i += 1;
      fecharLinha();
      continue;
    }

    if (!jaFechouColunaA) atual += c;
  }

  // A última linha pode não terminar com quebra.
  if (atual.trim() !== '' || jaFechouColunaA) fecharLinha();

  return { nomes, linhas };
}

/**
 * Lê o texto de um CSV/TSV e devolve os nomes da coluna A.
 *
 * @param texto      o conteúdo do arquivo, já decodificado
 * @param pularPrimeiraLinha `true` quando a primeira linha é cabeçalho
 */
export function lerColunaA(texto: string, pularPrimeiraLinha = false): LeituraDeColunaA {
  // ⚠️ O BOM (Byte Order Mark) TEM DE SAIR. Arquivos salvos pelo Excel como
  // "CSV UTF-8" começam com o caractere invisível U+FEFF. Sem removê-lo, o
  // primeiro nome vira "﻿CAIXA" — que parece "CAIXA" na tela e é OUTRO
  // texto para o banco. O primeiro registro entraria duplicado para sempre,
  // e ninguém veria a diferença olhando.
  const limpo = texto.replace(/^﻿/, '');

  const separador = detectarSeparador(limpo);
  const sep = separador === 'TAB' ? '\t' : separador === 'NENHUM' ? '' : separador;

  const { nomes, linhas } = extrairPrimeiraColuna(limpo, sep);
  const comeco = pularPrimeiraLinha ? 1 : 0;

  return {
    nomes: nomes.slice(comeco).filter((n) => n !== ''),
    separador,
    linhasLidas: linhas,
  };
}

/**
 * A MESMA normalização que o banco usa (`fin_normalizar`): sem acento, sem
 * espaço nas pontas, em maiúsculas.
 *
 * ⚠️ ELA PRECISA CONCORDAR COM O BANCO, E É POR ISSO QUE EXISTE AQUI.
 * A prévia na tela marca o que é duplicado; quem realmente recusa é o índice
 * único do PostgreSQL, sobre a coluna `nome_normalizado`. Se as duas regras
 * divergissem, a prévia diria "novo" e a importação ignoraria — ou pior, o
 * contrário. O banco faz `upper(btrim(unaccent(nome)))`; o `normalize('NFD')`
 * mais a remoção das marcas de acento é o equivalente em JavaScript.
 *
 * ⚠️ ISTO NÃO SUBSTITUI A CONFERÊNCIA DO BANCO. É conforto de tela: quem decide
 * o que entra é a função `fin_importar_*`, que compara com `fin_normalizar` de
 * verdade. Se um dia as duas divergirem num caso exótico, o relatório do banco
 * é que vale — e é ele que a tela mostra no fim.
 */
export function normalizarComoOBanco(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
}

/** Uma linha da prévia, como a tela a mostra. */
export interface LinhaDaPrevia {
  /** Posição no arquivo, para a pessoa achar a linha lá. */
  linha: number;
  /** O nome como será gravado (maiúsculas, sem espaço nas pontas). */
  nome: string;
  /** A chave de comparação. */
  chave: string;
  /** Já existe no cadastro da empresa. */
  jaExiste: boolean;
  /** É repetição de uma linha ANTERIOR do mesmo arquivo. */
  repetidoNoArquivo: boolean;
  /** Nome que o sistema reserva para si (só nas identificadoras). */
  reservado: boolean;
}

/** O nome que o banco reserva para a categoria de transferência (RN-30). */
export const NOME_RESERVADO_TRANSFERENCIA = normalizarComoOBanco('TRANSFERENCIA ENTRE CONTAS');

/**
 * Monta a prévia: para cada nome lido, diz se ele entra e por quê não.
 *
 * @param nomes         o que saiu de `lerColunaA`
 * @param jaCadastrados os nomes que a empresa já tem
 * @param ehIdentificadora aplica a regra do nome reservado
 */
export function montarPrevia(
  nomes: string[],
  jaCadastrados: string[],
  ehIdentificadora = false,
): LinhaDaPrevia[] {
  const existentes = new Set(jaCadastrados.map(normalizarComoOBanco));
  const vistos = new Set<string>();

  return nomes.map((bruto, i) => {
    const nome = bruto.trim().toUpperCase();
    const chave = normalizarComoOBanco(bruto);
    const repetidoNoArquivo = vistos.has(chave);
    vistos.add(chave);

    return {
      linha: i + 1,
      nome,
      chave,
      jaExiste: existentes.has(chave),
      repetidoNoArquivo,
      reservado: ehIdentificadora && chave === NOME_RESERVADO_TRANSFERENCIA,
    };
  });
}

/** O que a função de importação do banco devolve. */
export interface RelatorioDeImportacao {
  success: boolean;
  recebidos: number;
  criados: number;
  ja_existiam: number;
  repetidos_no_arquivo: number;
  vazios: number;
  /** Só nas identificadoras. */
  reservados?: number;
  nomes_criados: string[];
  nomes_ja_existiam: string[];
  nomes_reservados?: string[];
}
