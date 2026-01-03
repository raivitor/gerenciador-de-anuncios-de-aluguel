import { DEFAULT_MAX_VALUE } from '@/crawlers/core/base-crawler';
export interface F1Filters {
  tipoDeImovel: number;
  cidades: number[];
  quartos: [number, number];
  valorAluguel: [number, number];
  sort: string;
}

export const filters: F1Filters = {
  tipoDeImovel: 8,
  cidades: [61, 92, 71, 34, 36, 74, 63, 47, 45],
  quartos: [2, 3],
  valorAluguel: [1000, DEFAULT_MAX_VALUE],
  sort: 'orderby:meta_value_num;order:ASC;meta_key:valor-do-aluguel',
};

export const encodeFilters = (f1Filters: F1Filters): string => {
  const params = new URLSearchParams();
  params.append('jsf', 'jet-engine:pesquisa');
  params.append(
    'tax',
    `tipo-de-imovel:${f1Filters.tipoDeImovel};cidade:${f1Filters.cidades.join(',')}`
  );
  params.append(
    'meta',
    `quartos!range:${f1Filters.quartos[0]}_${f1Filters.quartos[1]};valor-do-aluguel!range:${f1Filters.valorAluguel[0]}_${f1Filters.valorAluguel[1]}`
  );
  params.append('sort', f1Filters.sort);

  return params.toString();
};
