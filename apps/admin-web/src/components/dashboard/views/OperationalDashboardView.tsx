"use client";

import React from "react";
import { modulosDoMembro } from "@jairo/core";
import ModuleCard from "@/components/dashboard/modules/ModuleCard";

interface OperationalDashboardViewProps {
  /**
   * Os módulos que ESTE membro pode abrir nesta empresa, já cruzados pelo banco
   * (`modulos_do_membro`): liberado ao membro, contratado pela empresa e ativo
   * no catálogo.
   */
  modulosPermitidos: string[];
}

/**
 * 🚀 VIEW: DASHBOARD OPERACIONAL (CLIENTE) — PJODC v10
 * Local: apps/admin-web/src/components/dashboard/views/OperationalDashboardView.tsx
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NO DEGRAU 5
 * ===========================================================================
 * Até aqui esta tela era um cartaz fixo: mostrava "Aguardando Liberação" para
 * todo mundo, sempre, e **ignorava** a lista de módulos do banco. Liberar um
 * módulo a um membro não mudava nada aqui — era a lacuna L3 do degrau 4.
 *
 * ⚠️ **CORRIGIDO EM 19/09/2026 (degrau 08).** Este parágrafo terminava com a frase
 * "(O aplicativo já fazia certo desde a v10: ele lia `allowed_modules`.)" — e ela
 * estava **errada nos dois sentidos**. Ler `allowed_modules` não era "certo": essa
 * coluna é a chave que o Proprietário entrega à EQUIPE dele, e para o próprio dono
 * da empresa está vazia. O aplicativo mostrava "Nenhum módulo ativo" ao
 * Proprietário de uma empresa que tinha o módulo contratado, sem erro e sem pista.
 * Passou despercebido porque, sem nenhum módulo plugado no telefone, os dois
 * caminhos devolviam a mesma lista vazia. O aplicativo agora chama
 * `modulos_do_membro()`, como esta tela.
 *
 * ⚠️ E NOTE O QUE ESTE ARQUIVO **NÃO** TEM: o nome de nenhum módulo. Ele recebe
 * identificadores do banco, pede os manifestos ao registro do Core e desenha um
 * cartão para cada um. Plugar o décimo módulo não vai exigir tocar aqui.
 *
 * 📖 `MODULOS.md` na raiz.
 */
export default function OperationalDashboardView({
  modulosPermitidos,
}: OperationalDashboardViewProps) {
  const modulos = modulosDoMembro(modulosPermitidos);

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-lg font-black uppercase tracking-widest text-slate-400">
        Módulos Operacionais
      </h2>

      {modulos.length === 0 ? (
        /* 🚧 SEM MÓDULO PARA ESTE MEMBRO NESTA EMPRESA.
           São três causas possíveis, e a mensagem não tenta adivinhar qual:
           a empresa não contratou, o membro não foi liberado, ou nenhum módulo
           está plugado na plataforma (o estado de hoje). */
        <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-sm border border-slate-200">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
            🚧
          </div>
          <h3 className="text-xl font-black text-slate-700 uppercase mb-2 tracking-tighter">
            Nenhum módulo disponível
          </h3>
          <p className="text-slate-500 font-medium text-sm">
            Fale com o administrador da plataforma para contratar ou liberar um módulo
            para o seu acesso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((modulo) => (
            <ModuleCard key={modulo.id} modulo={modulo} />
          ))}
        </div>
      )}
    </div>
  );
}
