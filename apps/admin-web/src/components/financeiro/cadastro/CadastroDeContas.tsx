"use client";

import { useCallback, useEffect, useState } from "react";
import { cadastroFinanceiroService } from "@jairo/core";
import { useEmpresaAtiva } from "@/components/financeiro/useEmpresaAtiva";
import FormularioDeConta, { type SugestaoDeConta } from "./FormularioDeConta";
import ListaDeContas, { type ItemDeCadastro } from "./ListaDeContas";
import { abrirImpressao } from "@/components/financeiro/prepararImpressao";
import { formatarBRL } from "@jairo/core";

/**
 * 📇 ORQUESTRADOR DOS DOIS CADASTROS (PJODC v10)
 * Local: apps/admin-web/src/components/financeiro/cadastro/CadastroDeContas.tsx
 *
 * As duas telas de cadastro são a mesma tela, com a variante trocada — é a
 * simetria que a especificação pede na seção 11, e que aqui vira um componente
 * só com dois chamadores.
 *
 * ⚠️ AS MENSAGENS DE ERRO VÊM DO BANCO, sem reescrita. Quando a gravação for
 * recusada por tipo travado (RN-07) ou por nome repetido (RN-02), quem explica
 * o caminho é a própria função do PostgreSQL — ela já escreve "desative este e
 * crie outro com o tipo correto". Traduzir aqui criaria duas versões da mesma
 * frase, e uma delas ficaria desatualizada.
 */

const TIPOS = {
  movimento: ["CAIXA", "BANCO", "OUTRAS"],
  identificadora: ["DESPESA", "RECEITA", "OUTRAS"],
};

export default function CadastroDeContas({ variante }: { variante: "movimento" | "identificadora" }) {
  const { carregando: carregandoContexto, tenantId, erro: erroContexto, pode, nomeEmpresa } = useEmpresaAtiva();
  const ehMovimento = variante === "movimento";

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState(TIPOS[variante][0]);
  const [saldo, setSaldo] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tipoBloqueado, setTipoBloqueado] = useState(false);
  const [sugestoes, setSugestoes] = useState<SugestaoDeConta[]>([]);

  const [itens, setItens] = useState<ItemDeCadastro[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [ultimos, setUltimos] = useState(false);
  const [incluirInativos, setIncluirInativos] = useState(false);

  const [carregando, setCarregando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const pesquisar = useCallback(async () => {
    if (!tenantId) return;
    setCarregando(true);
    setErro(null);
    try {
      const filtro = { texto: filtroTexto, tipo: filtroTipo, ultimosAdicionados: ultimos, incluirInativos };
      const lista = ehMovimento
        ? await cadastroFinanceiroService.listarContasMovimento(tenantId, filtro)
        : await cadastroFinanceiroService.listarIdentificadoras(tenantId, filtro);
      setItens(lista as unknown as ItemDeCadastro[]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA NA PESQUISA.");
    } finally {
      setCarregando(false);
    }
  }, [tenantId, filtroTexto, filtroTipo, ultimos, incluirInativos, ehMovimento]);

  useEffect(() => {
    const rodar = async () => { if (tenantId) await pesquisar(); };
    rodar();
    // Só na entrada: as pesquisas seguintes são pedidas pelo botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  /** As até 4 sugestões, buscadas no banco a partir do 1º caractere. */
  useEffect(() => {
    let ativo = true;
    const buscar = async () => {
      if (!tenantId || nome.trim() === "" || editandoId) {
        // Campo vazio ou em edição: limpa a lista — mas fora do tique do
        // efeito, senão a regra `set-state-in-effect` (com razão) reclama.
        await Promise.resolve();
        if (ativo) setSugestoes([]);
        return;
      }
      try {
        const achados = ehMovimento
          ? await cadastroFinanceiroService.sugerirContasMovimento(tenantId, nome)
          : await cadastroFinanceiroService.sugerirIdentificadoras(tenantId, nome);
        if (ativo) setSugestoes(achados as SugestaoDeConta[]);
      } catch {
        if (ativo) setSugestoes([]);
      }
    };
    buscar();
    return () => { ativo = false; };
  }, [nome, tenantId, editandoId, ehMovimento]);

  const limpar = () => {
    setNome(""); setTipo(TIPOS[variante][0]); setSaldo(0); setAtivo(true);
    setEditandoId(null); setTipoBloqueado(false); setSugestoes([]);
  };

  const gravar = async () => {
    if (!tenantId) return;
    setGravando(true);
    setErro(null);
    setAviso(null);
    try {
      if (ehMovimento) {
        await cadastroFinanceiroService.gravarContaMovimento({
          tenantId, id: editandoId, nome, tipo: tipo as "CAIXA" | "BANCO" | "OUTRAS",
          saldoAberturaCentavos: saldo, isActive: ativo,
        });
      } else {
        await cadastroFinanceiroService.gravarIdentificadora({
          tenantId, id: editandoId, nome, tipo: tipo as "DESPESA" | "RECEITA" | "OUTRAS", isActive: ativo,
        });
      }
      setAviso(editandoId ? "CADASTRO ATUALIZADO." : "CADASTRO ADICIONADO.");
      limpar();
      await pesquisar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO GRAVAR.");
    } finally {
      setGravando(false);
    }
  };

  const editar = (item: ItemDeCadastro) => {
    setEditandoId(item.id);
    setNome(item.nome);
    setTipo(item.tipo);
    setSaldo(item.saldo_abertura_centavos ?? 0);
    setAtivo(item.is_active);
    setSugestoes([]);
    // A tela não sabe se há lançamento; o banco recusa se houver (RN-07), e o
    // aviso abaixo prepara o usuário em vez de deixá-lo descobrir no erro.
    setTipoBloqueado(false);
  };

  const excluir = async (item: ItemDeCadastro) => {
    if (!tenantId) return;
    if (!window.confirm(`EXCLUIR "${item.nome}"?\n\nSE HOUVER LANÇAMENTOS, A EXCLUSÃO SERÁ RECUSADA.`)) return;
    setErro(null);
    try {
      if (ehMovimento) await cadastroFinanceiroService.excluirContaMovimento(tenantId, item.id);
      else await cadastroFinanceiroService.excluirIdentificadora(tenantId, item.id);
      setAviso("CADASTRO EXCLUÍDO.");
      await pesquisar();
    } catch {
      setErro("NÃO É POSSÍVEL EXCLUIR: EXISTEM LANÇAMENTOS USANDO ESTE CADASTRO. VOCÊ PODE DESATIVÁ-LO.");
    }
  };

  const alternarAtivo = async (item: ItemDeCadastro) => {
    if (!tenantId) return;
    setErro(null);
    try {
      if (ehMovimento) {
        await cadastroFinanceiroService.gravarContaMovimento({
          tenantId, id: item.id, nome: item.nome, tipo: item.tipo as "CAIXA" | "BANCO" | "OUTRAS",
          saldoAberturaCentavos: item.saldo_abertura_centavos ?? 0, isActive: !item.is_active,
        });
      } else {
        await cadastroFinanceiroService.gravarIdentificadora({
          tenantId, id: item.id, nome: item.nome,
          tipo: item.tipo as "DESPESA" | "RECEITA" | "OUTRAS", isActive: !item.is_active,
        });
      }
      await pesquisar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "FALHA AO ALTERAR A SITUAÇÃO.");
    }
  };

  const imprimir = () => {
    const filtros: string[] = [];
    if (filtroTexto) filtros.push(`NOME CONTÉM "${filtroTexto}"`);
    if (filtroTipo) filtros.push(`TIPO ${filtroTipo}`);
    if (incluirInativos) filtros.push("INCLUINDO INATIVOS");
    if (ultimos) filtros.push("ÚLTIMOS ADICIONADOS");

    abrirImpressao({
      titulo: ehMovimento ? "CONTAS MOVIMENTO" : "CONTAS IDENTIFICADORAS",
      empresa: nomeEmpresa,
      filtros: filtros.length ? filtros : ["TODOS"],
      colunas: ehMovimento
        ? ["NOME", "TIPO", "SALDO DE ABERTURA", "SITUAÇÃO"]
        : ["NOME", "TIPO", "SITUAÇÃO"],
      colunasNumericas: ehMovimento ? [2] : [],
      linhas: itens.map((i) => ehMovimento
        ? [i.nome, i.tipo, formatarBRL(i.saldo_abertura_centavos ?? 0, { semSimbolo: true }), i.is_active ? "ATIVA" : "INATIVA"]
        : [i.nome, i.tipo, i.is_active ? "ATIVA" : "INATIVA"]),
    });
  };

  if (carregandoContexto) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }
  if (erroContexto) {
    return <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 font-black uppercase text-amber-900 text-sm">{erroContexto}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-800">
        {ehMovimento ? "CADASTRO DE CONTAS MOVIMENTO" : "CADASTRO DE CONTAS IDENTIFICADORAS"}
      </h1>

      {erro && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm font-bold uppercase text-red-800">{erro}</div>}
      {aviso && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-sm font-bold uppercase text-emerald-800">{aviso}</div>}

      {pode(ehMovimento ? "cm_gravar" : "ci_gravar") && (
        <FormularioDeConta
          variante={variante}
          nome={nome} tipo={tipo} saldoAberturaCentavos={saldo} ativo={ativo}
          editandoId={editandoId} sugestoes={sugestoes} gravando={gravando}
          tiposDisponiveis={TIPOS[variante]} tipoBloqueado={tipoBloqueado}
          onNome={setNome} onTipo={setTipo} onSaldo={setSaldo} onAtivo={setAtivo}
          onEscolherSugestao={(s) => { setSugestoes([]); editar(s as unknown as ItemDeCadastro); }}
          onGravar={gravar} onCancelar={limpar}
        />
      )}

      <ListaDeContas
        variante={variante}
        itens={itens} carregando={carregando}
        filtroTexto={filtroTexto} filtroTipo={filtroTipo} ultimos={ultimos} incluirInativos={incluirInativos}
        tiposDisponiveis={TIPOS[variante]}
        podeGravar={pode(ehMovimento ? "cm_gravar" : "ci_gravar")}
        podeExcluir={pode(ehMovimento ? "cm_excluir" : "ci_excluir")}
        onFiltroTexto={setFiltroTexto} onFiltroTipo={setFiltroTipo}
        onUltimos={setUltimos} onIncluirInativos={setIncluirInativos}
        onPesquisar={pesquisar} onEditar={editar} onExcluir={excluir}
        onAlternarAtivo={alternarAtivo} onImprimir={imprimir}
      />
    </div>
  );
}
