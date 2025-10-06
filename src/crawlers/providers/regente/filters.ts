import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface RegenteFilters {
  finalidade: string;
  codigo: string;
  tipo_imovel: string;
  preco_min: string;
  preco_max: number;
  vagas: number[];
  area_min: number;
  area_max: string;
  bairro: string[];
}

export const filters: RegenteFilters = {
  finalidade: 'Aluguel',
  codigo: '',
  tipo_imovel: 'Apartamento',
  preco_min: '',
  preco_max: DEFAULT_MAX_VALUE,
  vagas: [1, 2],
  area_min: DEFAULT_MIN_SIZE,
  area_max: '',
  bairro: [
    'Agronômica',
    'Carvoeira',
    'Córrego Grande',
    'Itacorubi',
    'João Paulo',
    'Monte Verde',
    'Pantanal',
    'Santa Mônica',
    'Trindade',
  ],
};

export const encodeFilters = (regenteFilters: RegenteFilters): string => {
  const params = new URLSearchParams();

  params.append('finalidade', regenteFilters.finalidade);
  if (regenteFilters.codigo) params.append('codigo', regenteFilters.codigo);
  params.append('tipo_imovel', regenteFilters.tipo_imovel);
  if (regenteFilters.preco_min) params.append('preco_min', regenteFilters.preco_min);
  params.append('preco_max', regenteFilters.preco_max.toString());
  regenteFilters.vagas.forEach(vaga => params.append('vagas', vaga.toString()));
  params.append('area_min', regenteFilters.area_min.toString());
  if (regenteFilters.area_max) params.append('area_max', regenteFilters.area_max);
  params.append('bairro', regenteFilters.bairro.join(','));

  return params.toString();
};
