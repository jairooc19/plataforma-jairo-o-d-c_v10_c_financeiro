"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  authService,
  moduleService,
  MODULOS_INSTALADOS,
  type EmpresaParaModulos,
  type ModuloDaEmpresa,
} from "@jairo/core";

/**
 * 🧩 CONTRATAÇÃO DE MÓDULOS POR EMPRESA — PAINEL DE ENGENHARIA (PJODC v10)
 * Local: apps/admin-web/src/app/dashboard/modulos/page.tsx
 *
 * ===========================================================================
 * O QUE ESTA TELA RESOLVE (lacuna L4 do degrau 4)
 * ===========================================================================
 * Até aqui só existia "este MEMBRO pode abrir o módulo". Não existia "esta
 * EMPRESA contratou" — e como o Proprietário monta a própria equipe, ele podia
 * liberar para si um módulo que a empresa nunca contratou. Aqui o Desenvolvedor
 * contrata; lá, na Central de Comandos, o Proprietário distribui o que foi
 * contratado.
 *
 * ⚠️ ESTA TELA É DA PLATAFORMA E NÃO CONHECE MÓDULO NENHUM. Tudo o que ela
 * lista vem do catálogo `platform_modules`, que é preenchido pelo SEED DE CADA
 * MÓDULO. Quando NÃO há módulo plugado, ela mostra um aviso explicando isso —
 * e esse aviso é condicional (`MODULOS_INSTALADOS.length === 0`), não fixo.
 *
 * ⚠️ ESTE COMENTÁRIO DIZIA "Com zero módulos plugados (o ESTADO DE HOJE)" ATÉ
 * 17/09/2026. Hoje há UM módulo plugado, e o aviso de estado vazio, portanto,
 * NÃO aparece. O código sempre esteve certo; era o comentário que descrevia um
 * passado. Qual módulo é, esta tela não sabe nem precisa saber — quem responde
 * é `MODULOS_INSTALADOS`, do Core.
 *
 * ⚠️ QUEM AUTORIZA É O BANCO. Todas as chamadas passam por funções que conferem
 * `is_superuser()` por dentro; abrir esta URL sem ser o Desenvolvedor devolve
 * erro 42501 do PostgreSQL, não uma tela em branco enganosa.
 *
 * 📖 `MODULOS.md` na raiz.
 */
export default function ModulosPage() {
  const router = useRouter();

  const [empresas, setEmpresas] = useState<EmpresaParaModulos[]>([]);
  const [selecionada, setSelecionada] = useState<EmpresaParaModulos | null>(null);
  const [modulos, setModulos] = useState<ModuloDaEmpresa[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [carregandoModulos, setCarregandoModulos] = useState(false);
  const [gravando, setGravando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregarEmpresas = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setEmpresas(await moduleService.listarEmpresas());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar as empresas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  /**
   * 🛡️ QUEM PODE VER ESTA TELA.
   *
   * ⚠️ ESTE REDIRECIONAMENTO É CONFORTO, NÃO SEGURANÇA. Quem protege são as
   * funções do banco, que conferem `is_superuser()` por dentro: sem elas, tirar
   * este `if` pelo console do navegador abriria a tela — e ela não conseguiria
   * ler nem gravar nada. É o mesmo desenho da Central de Comandos.
   *
   * (O carregamento fica dentro de uma função async por exigência do
   * `react-hooks/set-state-in-effect`: chamar `setState` direto no corpo do
   * efeito é erro de lint neste projeto.)
   */
  useEffect(() => {
    const verificarAcesso = async () => {
      const ehDev = await authService.ehDesenvolvedor();
      if (!ehDev) {
        router.replace("/dashboard");
        return;
      }
      carregarEmpresas();
    };
    verificarAcesso();
  }, [router, carregarEmpresas]);

  const abrirEmpresa = async (empresa: EmpresaParaModulos) => {
    setSelecionada(empresa);
    setCarregandoModulos(true);
    setErro(null);
    setAviso(null);
    try {
      setModulos(await moduleService.listarModulosDaEmpresa(empresa.id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar os módulos da empresa.");
      setModulos([]);
    } finally {
      setCarregandoModulos(false);
    }
  };

  /**
   * ⚠️ DESCONTRATAR LIMPA OS MEMBROS, e a limpeza acontece DENTRO da função do
   * banco, na mesma transação. Por isso aqui há uma chamada só — quebrar isso
   * em "desligar" + "limpar" deixaria a empresa sem contrato e os membros com o
   * módulo na lista, se a segunda falhasse.
   */
  const alternar = async (modulo: ModuloDaEmpresa) => {
    if (!selecionada) return;

    const ligando = !modulo.contratado;
    if (!ligando) {
      const ok = window.confirm(
        `Descontratar "${modulo.nome}" de ${selecionada.tenant_name}?\n\n` +
          "O módulo também será retirado de todos os membros desta empresa que o tinham liberado."
      );
      if (!ok) return;
    }

    setGravando(modulo.module_id);
    setErro(null);
    setAviso(null);
    try {
      await moduleService.definirContrato(selecionada.id, modulo.module_id, ligando);
      setModulos(await moduleService.listarModulosDaEmpresa(selecionada.id));
      await carregarEmpresas();
      setAviso(
        ligando
          ? `"${modulo.nome}" contratado para ${selecionada.tenant_name}.`
          : `"${modulo.nome}" descontratado de ${selecionada.tenant_name}.`
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gravar o contrato.");
    } finally {
      setGravando(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-800">
              Módulos
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Contratação de módulos por empresa. O Proprietário só distribui à equipe
              o que estiver contratado aqui.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:border-slate-300 transition-all"
          >
            ← Voltar ao painel
          </Link>
        </header>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4 text-sm font-medium">
            {erro}
          </div>
        )}
        {aviso && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-4 text-sm font-medium">
            {aviso}
          </div>
        )}

        {/* 🧩 AVISO PARA O CASO DE NÃO HAVER MÓDULO PLUGADO — hoje há um, então
            ele não aparece. O catálogo do banco é preenchido pelo seed de cada
            módulo; o registro do Core (`MODULOS_INSTALADOS`) diz quais têm
            código instalado.

            ⚠️ NÃO ESCREVA O NOME DO MÓDULO NESTE COMENTÁRIO. A primeira versão
            desta correção (17/09/2026) o citou, e o `npm run modulos:verificar`
            acusou violação R1/R8 na hora: arquivo de plataforma não nomeia peça
            fora dos 3 pontos de solda — comentário incluído. */}
        {MODULOS_INSTALADOS.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-900">
            <strong className="font-black uppercase tracking-wide text-xs block mb-1">
              Nenhum módulo instalado no código
            </strong>
            O registro do Core (<code className="font-mono">modules/registro.ts</code>) está
            vazio. Um módulo aparece nesta tela depois que o SQL dele grava a linha em{" "}
            <code className="font-mono">platform_modules</code>; para as telas funcionarem,
            ele também precisa ser plugado no registro. Ver <code className="font-mono">MODULOS.md</code>.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* COLUNA: EMPRESAS */}
          <section className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-black uppercase text-slate-800 mb-4">Empresas</h2>

            {carregando ? (
              <p className="text-sm text-slate-400 font-medium">Carregando…</p>
            ) : empresas.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">
                Nenhuma empresa cadastrada. Crie uma na Central de Comandos.
              </p>
            ) : (
              <ul className="space-y-2">
                {empresas.map((empresa) => {
                  const ativa = selecionada?.id === empresa.id;
                  return (
                    <li key={empresa.id}>
                      <button
                        type="button"
                        onClick={() => abrirEmpresa(empresa)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${
                          ativa
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black text-slate-800 uppercase text-sm tracking-tight">
                            {empresa.tenant_name}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {empresa.qtd_modulos} mód.
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          {empresa.owner_email}
                          {!empresa.is_active && (
                            <span className="ml-2 text-red-600 font-bold uppercase">desativada</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* COLUNA: MÓDULOS DA EMPRESA */}
          <section className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-black uppercase text-slate-800 mb-4">
              {selecionada ? selecionada.tenant_name : "Catálogo"}
            </h2>

            {!selecionada ? (
              <p className="text-sm text-slate-400 font-medium">
                Escolha uma empresa ao lado para ver e mudar os módulos contratados.
              </p>
            ) : carregandoModulos ? (
              <p className="text-sm text-slate-400 font-medium">Carregando…</p>
            ) : modulos.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">
                O catálogo está vazio: nenhum módulo foi cadastrado no banco ainda.
              </p>
            ) : (
              <ul className="space-y-3">
                {modulos.map((modulo) => (
                  <li
                    key={modulo.module_id}
                    className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border border-slate-200"
                  >
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 uppercase text-sm tracking-tight">
                        {modulo.nome}
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate">
                        <code className="font-mono">{modulo.module_id}</code>
                        {modulo.descricao ? ` · ${modulo.descricao}` : ""}
                      </div>
                      {!modulo.no_catalogo && (
                        <div className="text-xs text-amber-700 font-bold mt-1">
                          Inativo no catálogo da plataforma
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => alternar(modulo)}
                      disabled={gravando === modulo.module_id}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                        modulo.contratado
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {gravando === modulo.module_id
                        ? "…"
                        : modulo.contratado
                          ? "Contratado"
                          : "Contratar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
