import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface DaltonFilters {
  categoriagrupo: string;
  finalidade: string;
  tipo: string[];
  cidadebairro: string[];
  dormitorios: number[];
  vagas: number[];
  valorlocacao: [number, number];
  area: [number, number];
  ordenar: string;
}

export const filters: DaltonFilters = {
  categoriagrupo: 'Residencial',
  finalidade: 'aluguel',
  tipo: ['apartamento'],
  cidadebairro: ['florianopolis'],
  dormitorios: [2, 3],
  vagas: [1],
  valorlocacao: [0, DEFAULT_MAX_VALUE],
  area: [DEFAULT_MIN_SIZE, 509],
  ordenar: 'precoAsc',
};

export const encodeFilters = (daltonFilters: DaltonFilters): string => {
  const params = new URLSearchParams();
  params.append('categoriagrupo', daltonFilters.categoriagrupo);
  params.append('finalidade', daltonFilters.finalidade);

  daltonFilters.tipo.forEach(t => params.append('tipo[]', t));
  daltonFilters.cidadebairro.forEach(cb => params.append('cidadebairro[]', cb));
  daltonFilters.dormitorios.forEach(d => params.append('dormitorios[]', String(d)));
  daltonFilters.vagas.forEach(v => params.append('vagas[]', String(v)));

  params.append(
    'valorlocacao',
    `${daltonFilters.valorlocacao[0]},${daltonFilters.valorlocacao[1]}`
  );
  params.append('area', `${daltonFilters.area[0]},${daltonFilters.area[1]}`);
  params.append('ordenar', daltonFilters.ordenar);

  return params.toString();
};
