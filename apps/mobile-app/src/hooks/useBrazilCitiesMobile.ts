import { useState, useEffect } from 'react';

/** Opção de seleção, no mesmo formato que o Core e o SearchableSelect usam. */
export interface CityOption {
  label: string;
  value: string;
}

/** Referência estável: devolver `[]` novo a cada render remontaria o seletor à toa. */
const SEM_CIDADES: CityOption[] = [];

/**
 * 🏙️ CIDADES DO ESTADO BRASILEIRO SELECIONADO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useBrazilCitiesMobile.ts
 *
 * Gêmeo de `apps/admin-web/src/hooks/useBrazilCities.ts`. São dois arquivos e
 * não um só porque um hook de React não pode morar no `@jairo/core`: o Core é
 * consumido pelo Next.js e pelo Metro, e não declara React como dependência —
 * pôr um `useState` lá dentro amarraria o cérebro da plataforma a uma
 * biblioteca de interface. Países e estados, que são dados puros, ESSES sim
 * vêm do Core (`COUNTRIES`, `BRAZIL_STATES`).
 *
 * Cidades não cabem no bundle: são 5.570 municípios (~1 MB). Vêm do IBGE, sob
 * demanda, só do estado escolhido.
 *
 * 🏷️ A LISTA GUARDA A QUAL UF ELA PERTENCE, e o retorno só a entrega quando a UF
 * bate com a selecionada agora. É o que impede dois defeitos de uma vez: mostrar
 * as cidades da UF anterior enquanto a nova ainda carrega, e ter de limpar o
 * estado dentro do efeito (o que dispararia renderização em cascata — a mesma
 * regra `react-hooks/set-state-in-effect` que o ESLint da web cobra).
 *
 * 🛡️ Fora do Brasil o campo Cidade é texto livre — nem chamamos o IBGE.
 */
export function useBrazilCitiesMobile(country: string, state: string) {
  const [cache, setCache] = useState<{ uf: string; lista: CityOption[] }>({ uf: '', lista: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state || country !== 'BRASIL') return;

    // Se o usuário trocar de estado antes de a resposta chegar, a requisição
    // antiga não pode sobrescrever a nova — daí a bandeira de cancelamento.
    let cancelado = false;
    setLoading(true);

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
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    buscarCidades();
    return () => {
      cancelado = true;
    };
  }, [country, state]);

  const listaCorresponde = country === 'BRASIL' && !!state && cache.uf === state;
  return { cities: listaCorresponde ? cache.lista : SEM_CIDADES, loading };
}
