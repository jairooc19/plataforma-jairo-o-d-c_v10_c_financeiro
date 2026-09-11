"use client";

import { useState, useEffect } from "react";

/** Opção de seleção, no mesmo formato que o SearchableSelect e o Core usam. */
export interface CityOption {
  label: string;
  value: string;
}

/** Referência estável: devolver `[]` novo a cada render remontaria o seletor à toa. */
const SEM_CIDADES: CityOption[] = [];

/**
 * 🏙️ CIDADES DO ESTADO BRASILEIRO SELECIONADO (PJODC v10)
 * Local: apps/admin-web/src/hooks/useBrazilCities.ts
 *
 * Países e estados vêm prontos do Core (lista estática, sem rede). As cidades
 * não: são 5.570 municípios (~1 MB), grandes demais para o bundle — por isso
 * vêm do IBGE, sob demanda, só do estado escolhido.
 *
 * Fica num hook próprio porque DOIS formulários precisam da mesma lista: o
 * cadastro/completar-cadastro (useAuthLogic) e a edição de perfil no dashboard.
 * Duas cópias da mesma busca seria uma para consertar e outra para esquecer.
 *
 * 🏷️ A LISTA GUARDA A QUAL UF ELA PERTENCE, e o retorno só a entrega quando a UF
 * bate com a selecionada agora. É o que impede dois defeitos de uma vez: mostrar
 * as cidades da UF anterior enquanto a nova ainda carrega, e ter de limpar o
 * estado dentro do efeito (o que dispararia uma renderização em cascata).
 *
 * 🛡️ Fora do Brasil o campo Cidade é texto livre — nem chamamos o IBGE.
 */
export function useBrazilCities(country: string, state: string): CityOption[] {
  const [cache, setCache] = useState<{ uf: string; lista: CityOption[] }>({ uf: '', lista: [] });

  useEffect(() => {
    if (!state || country !== 'BRASIL') return;

    // Se o usuário trocar de estado antes da resposta chegar, a requisição
    // antiga não pode sobrescrever a nova — daí a bandeira de cancelamento.
    let cancelado = false;

    const buscarCidades = async () => {
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios`
        );
        const data = await res.json();
        if (cancelado) return;
        setCache({
          uf: state,
          lista: data.map((c: { nome: string }) => ({
            label: c.nome.toUpperCase(),
            value: c.nome.toUpperCase(),
          })),
        });
      } catch (erro) {
        if (!cancelado) console.error('[IBGE] Cidades não puderam ser carregadas:', erro);
      }
    };

    buscarCidades();
    return () => { cancelado = true; };
  }, [country, state]);

  const listaCorresponde = country === 'BRASIL' && !!state && cache.uf === state;
  return listaCorresponde ? cache.lista : SEM_CIDADES;
}
