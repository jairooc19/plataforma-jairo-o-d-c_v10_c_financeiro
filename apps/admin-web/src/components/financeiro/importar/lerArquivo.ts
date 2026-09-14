"use client";

/**
 * 📂 LER O ARQUIVO ESCOLHIDO E DESCOBRIR O SEU ACENTO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/importar/lerArquivo.ts
 *
 * A separação é de propósito: quem interpreta o CSV/TSV é
 * `@jairo/core → lerColunaA`, que é função pura e TESTADA no `npm test`. Aqui
 * fica só o pedaço que depende do navegador — transformar um `File` em texto.
 *
 * ===========================================================================
 * ⚠️ O PROBLEMA DO ACENTO, QUE ARRUINARIA A IMPORTAÇÃO EM SILÊNCIO
 * ===========================================================================
 * Um arquivo de texto não guarda em que "alfabeto" foi escrito. Quem lê precisa
 * adivinhar. O Excel em português, ao salvar como "CSV (separado por
 * ponto e vírgula)", usa **Windows-1252** — não UTF-8.
 *
 * Lendo um arquivo Windows-1252 como se fosse UTF-8, os acentos viram lixo:
 *
 *   | no arquivo | lido como UTF-8 |
 *   |---|---|
 *   | ÁGUA        | `<20>GUA`  (com o caractere de substituição �) |
 *   | ALUGUÉL     | `ALUGU�L` |
 *   | CONDOMÍNIO  | `CONDOM�NIO` |
 *
 * E aí a importação **funciona**: ela grava "ALUGU?L" como cadastro, sem erro
 * nenhum, e a pessoa só descobre olhando a lista depois. Pior ainda, uma
 * segunda importação do mesmo arquivo — agora corrigido — criaria "ALUGUÉL" ao
 * lado, porque para o banco são dois nomes diferentes.
 *
 * A saída é a que está abaixo: tentar UTF-8 primeiro e, se aparecer o caractere
 * de substituição `�`, reler tudo como Windows-1252.
 *
 * ⚠️ POR QUE NÃO TENTAR WINDOWS-1252 PRIMEIRO. Porque ele **nunca falha** —
 * qualquer sequência de bytes é "válida" nele. Lendo um UTF-8 legítimo como
 * Windows-1252, "ÁGUA" viraria "Ã�GUA" sem nenhum sinal de erro. O UTF-8 é o
 * único dos dois que sabe dizer "estes bytes não são meus", então ele tem de
 * ser o primeiro a opinar.
 */

/** O texto do arquivo, mais qual alfabeto acabou sendo usado. */
export interface TextoDoArquivo {
  texto: string;
  codificacao: 'UTF-8' | 'WINDOWS-1252';
}

export async function lerTextoDoArquivo(arquivo: File): Promise<TextoDoArquivo> {
  const bytes = await arquivo.arrayBuffer();

  // `fatal: false` faz o decodificador marcar o que não entendeu com �
  // em vez de lançar erro — é exatamente esse marcador que queremos procurar.
  const comoUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  if (!comoUtf8.includes('�')) {
    return { texto: comoUtf8, codificacao: 'UTF-8' };
  }

  try {
    return {
      texto: new TextDecoder('windows-1252').decode(bytes),
      codificacao: 'WINDOWS-1252',
    };
  } catch {
    // Navegador sem esse decodificador (raro). Melhor o texto imperfeito do
    // que nenhum: a prévia deixa a pessoa ver os nomes antes de gravar.
    return { texto: comoUtf8, codificacao: 'UTF-8' };
  }
}

/** Limite de tamanho, para o navegador não travar com um arquivo enorme. */
export const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024; // 2 MB

/** As extensões que o seletor de arquivo oferece. */
export const EXTENSOES_ACEITAS = '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain';
