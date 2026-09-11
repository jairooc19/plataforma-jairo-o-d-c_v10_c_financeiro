/**
 * 🇧🇷 UNIDADES FEDERATIVAS DO BRASIL (PJODC v4)
 *
 * Lista estática: carrega junto com o bundle, sem depender de rede.
 *
 * Motivo (2026-08-31): a API restcountries.com/v3.1 foi descontinuada e passou a
 * responder um objeto de erro no lugar do array. O `data.sort()` do formulário
 * lançava TypeError, caía no catch, e o campo País ficava permanentemente vazio.
 * A v5 devolve a mesma descontinuação — não havia URL para trocar.
 *
 * As cidades continuam vindo do IBGE, que responde normalmente: são 5.570
 * municípios (~1 MB), grandes demais para embutir no bundle.
 */

import type { LocationOption } from './countries';

/** 27 unidades federativas. O `value` é a sigla, como o banco espera. */
export const BRAZIL_STATES: LocationOption[] = [
  { label: 'ACRE', value: 'AC' },
  { label: 'ALAGOAS', value: 'AL' },
  { label: 'AMAPÁ', value: 'AP' },
  { label: 'AMAZONAS', value: 'AM' },
  { label: 'BAHIA', value: 'BA' },
  { label: 'CEARÁ', value: 'CE' },
  { label: 'DISTRITO FEDERAL', value: 'DF' },
  { label: 'ESPÍRITO SANTO', value: 'ES' },
  { label: 'GOIÁS', value: 'GO' },
  { label: 'MARANHÃO', value: 'MA' },
  { label: 'MATO GROSSO', value: 'MT' },
  { label: 'MATO GROSSO DO SUL', value: 'MS' },
  { label: 'MINAS GERAIS', value: 'MG' },
  { label: 'PARÁ', value: 'PA' },
  { label: 'PARAÍBA', value: 'PB' },
  { label: 'PARANÁ', value: 'PR' },
  { label: 'PERNAMBUCO', value: 'PE' },
  { label: 'PIAUÍ', value: 'PI' },
  { label: 'RIO DE JANEIRO', value: 'RJ' },
  { label: 'RIO GRANDE DO NORTE', value: 'RN' },
  { label: 'RIO GRANDE DO SUL', value: 'RS' },
  { label: 'RONDÔNIA', value: 'RO' },
  { label: 'RORAIMA', value: 'RR' },
  { label: 'SANTA CATARINA', value: 'SC' },
  { label: 'SÃO PAULO', value: 'SP' },
  { label: 'SERGIPE', value: 'SE' },
  { label: 'TOCANTINS', value: 'TO' },
];
