import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface DudaFilters {
  categoriagrupo: string;
  finalidade: string;
  tipo_residencial: string[];
  cidadebairro: string[];
  dormitorios: number[];
  vagas: number[];
  valorlocacao: [number, number];
  area: [number, number];
  ordenar: string;
}

export const filters: DudaFilters = {
  categoriagrupo: 'Residencial',
  finalidade: 'aluguel',
  tipo_residencial: ['apartamento'],
  cidadebairro: ['florianopolis'],
  dormitorios: [2, 3],
  vagas: [1],
  valorlocacao: [0, DEFAULT_MAX_VALUE],
  area: [DEFAULT_MIN_SIZE, 509],
  ordenar: 'exclusivosDesc',
};

export const encodeFilters = (dudaFilters: DudaFilters): string => {
  const params = new URLSearchParams();
  params.append('categoriagrupo', dudaFilters.categoriagrupo);
  params.append('finalidade', dudaFilters.finalidade);

  dudaFilters.tipo_residencial.forEach(t => params.append('tipo_residencial[]', t));
  dudaFilters.cidadebairro.forEach(cb => params.append('cidadebairro[]', cb));
  dudaFilters.dormitorios.forEach(d => params.append('dormitorios[]', String(d)));
  dudaFilters.vagas.forEach(v => params.append('vagas[]', String(v)));

  params.append('valorlocacao', `${dudaFilters.valorlocacao[0]},${dudaFilters.valorlocacao[1]}`);
  params.append('area', `${dudaFilters.area[0]},${dudaFilters.area[1]}`);

  return params.toString();
};
