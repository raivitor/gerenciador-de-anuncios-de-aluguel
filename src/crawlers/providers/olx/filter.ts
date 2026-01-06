import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface OlxFilters {
  ps: number; // preço mínimo
  pe: number; // Preço máximo
  gsp: number[]; // Garagem
  ss: number; // Tamanho mínimo
  rts: number; // subtipo de imóvel (apto padrão)
  ros: number[]; // Quartos
}

export const filters: OlxFilters = {
  ps: 2000,
  pe: 3800,
  gsp: [1, 2],
  ss: 60,
  rts: 306,
  ros: [2, 3],
};

export const encodeFilters = (olxFilters: OlxFilters): string => {
  const params = new URLSearchParams();
  params.append('ps', String(olxFilters.ps));
  params.append('pe', String(olxFilters.pe));
  olxFilters.gsp.forEach(g => params.append('gsp', String(g)));
  params.append('ss', String(olxFilters.ss));
  params.append('rts', String(olxFilters.rts));
  //olxFilters.ros.forEach(r => params.append('ros', String(r)));

  return params.toString();
};
