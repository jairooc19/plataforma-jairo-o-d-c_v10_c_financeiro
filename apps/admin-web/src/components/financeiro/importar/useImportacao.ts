"use client";

import { useCallback, useState } from "react";
import {
  cadastroFinanceiroService, lerColunaA, montarPrevia,
  type LinhaDaPrevia, type RelatorioDeImportacao,
  type TipoContaMovimento, type TipoContaIdentificadora,
} from "@jairo/core";
import { lerTextoDoArquivo, TAMANHO_MAXIMO_BYTES } from "./lerArquivo";

/**
 * 🧠 O CÉREBRO DA IMPORTAÇÃO (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/importar/useImportacao.ts
 *
 * Guarda os quatro momentos da importação e as decisões entre eles. O modal
 * (`ImportarCadastros.tsx`) só desenha.
 *
 * OS QUATRO MOMENTOS:
 *   1. ESCOLHER  — o tipo e o arquivo
 *   2. CONFERIR  — a prévia, com o que entra e o que não entra
 *   3. GRAVAR    — uma chamada só ao banco
 *   4. RELATÓRIO — o que o banco realmente fez
 *
 * ⚠️ O PASSO 4 NÃO É O PASSO 2 REPETIDO, E A DIFERENÇA IMPORTA. A prévia é um
 * palpite bem informado feito no navegador; o relatório é o que o PostgreSQL
 * fez de fato. Entre um e outro, outra pessoa pode ter cadastrado o mesmo nome
 * na outra ponta. Mostrar a prévia como se fosse resultado seria mentir com
 * confiança.
 */

export type EtapaDaImportacao = "escolher" | "conferir" | "gravando" | "relatorio";

export function useImportacao({
  variante, tenantId, tiposDisponiveis, nomesJaCadastrados, aoTerminar,
}: {
  variante: "movimento" | "identificadora";
  tenantId: string | null;
  tiposDisponiveis: string[];
  /** Os nomes que a empresa já tem — para a prévia marcar o que é repetido. */
  nomesJaCadastrados: string[];
  aoTerminar: () => Promise<void> | void;
}) {
  const ehMovimento = variante === "movimento";

  const [etapa, setEtapa] = useState<EtapaDaImportacao>("escolher");
  const [tipo, setTipo] = useState(tiposDisponiveis[0]);
  const [nomeDoArquivo, setNomeDoArquivo] = useState("");
  const [separador, setSeparador] = useState("");
  const [codificacao, setCodificacao] = useState("");
  const [temCabecalho, setTemCabecalho] = useState(false);
  const [textoBruto, setTextoBruto] = useState("");

  const [previa, setPrevia] = useState<LinhaDaPrevia[]>([]);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [relatorio, setRelatorio] = useState<RelatorioDeImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  /** Uma linha só pode ser importada se não for repetida nem reservada. */
  const importavel = useCallback(
    (l: LinhaDaPrevia) => !l.jaExiste && !l.repetidoNoArquivo && !l.reservado,
    [],
  );

  /**
   * Refaz a prévia a partir do texto já lido.
   *
   * ⚠️ ELA É REFEITA AO TROCAR "A PRIMEIRA LINHA É CABEÇALHO", e não só ao
   * abrir o arquivo. Sem isso, marcar a caixa mudaria o texto explicativo e não
   * a lista — e a pessoa importaria a palavra "NOME" como se fosse uma conta.
   *
   * ⚠️ AS LINHAS QUE NÃO PODEM ENTRAR JÁ NASCEM DESMARCADAS. Deixá-las marcadas
   * e ignorá-las depois faria o contador do botão prometer mais do que o banco
   * vai gravar, e o relatório final pareceria ter perdido registros.
   */
  const recalcular = useCallback((texto: string, cabecalho: boolean) => {
    const leitura = lerColunaA(texto, cabecalho);
    const linhas = montarPrevia(leitura.nomes, nomesJaCadastrados, !ehMovimento);
    setSeparador(leitura.separador);
    setPrevia(linhas);
    setMarcados(new Set(linhas.filter(importavel).map((l) => l.linha)));
  }, [nomesJaCadastrados, ehMovimento, importavel]);

  const escolherArquivo = async (arquivo: File) => {
    setErro(null);
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErro(`ARQUIVO GRANDE DEMAIS (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). O LIMITE É 2 MB.`);
      return;
    }
    try {
      const { texto, codificacao: cod } = await lerTextoDoArquivo(arquivo);
      setNomeDoArquivo(arquivo.name);
      setCodificacao(cod);
      setTextoBruto(texto);
      recalcular(texto, temCabecalho);
      setEtapa("conferir");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL LER O ARQUIVO.");
    }
  };

  const alternarCabecalho = (valor: boolean) => {
    setTemCabecalho(valor);
    if (textoBruto) recalcular(textoBruto, valor);
  };

  const alternarLinha = (linha: number) => {
    setMarcados((atuais) => {
      const novo = new Set(atuais);
      if (novo.has(linha)) novo.delete(linha); else novo.add(linha);
      return novo;
    });
  };

  /** Marcar/desmarcar todos — só mexe no que pode ser importado. */
  const marcarTodos = (valor: boolean) =>
    setMarcados(valor ? new Set(previa.filter(importavel).map((l) => l.linha)) : new Set());

  const escolhidos = previa.filter((l) => marcados.has(l.linha) && importavel(l));

  const gravar = async () => {
    if (!tenantId || escolhidos.length === 0) return;
    setEtapa("gravando");
    setErro(null);
    try {
      const nomes = escolhidos.map((l) => l.nome);
      const r = ehMovimento
        ? await cadastroFinanceiroService.importarContasMovimento(tenantId, tipo as TipoContaMovimento, nomes)
        : await cadastroFinanceiroService.importarIdentificadoras(tenantId, tipo as TipoContaIdentificadora, nomes);
      setRelatorio(r);
      setEtapa("relatorio");
      await aoTerminar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA NA IMPORTAÇÃO.");
      setEtapa("conferir");
    }
  };

  const recomecar = () => {
    setEtapa("escolher");
    setNomeDoArquivo(""); setSeparador(""); setCodificacao(""); setTextoBruto("");
    setPrevia([]); setMarcados(new Set()); setRelatorio(null); setErro(null);
  };

  return {
    etapa, tipo, setTipo, nomeDoArquivo, separador, codificacao,
    temCabecalho, alternarCabecalho,
    previa, marcados, alternarLinha, marcarTodos, importavel, escolhidos,
    relatorio, erro, escolherArquivo, gravar, recomecar,
  };
}
