import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface IbagyFilters {
  categoriagrupo: string;
  finalidade: string;
  tipo_residencial: string[];
  cidadebairro: string[];
  dormitorios: number[];
  vagas: number[];
  valorlocacao: [number, number];
  area: [number, number];
  filterpacote: string;
  ordenar: string;
}

export const filters: IbagyFilters = {
  categoriagrupo: 'Residencial',
  finalidade: 'aluguel',
  tipo_residencial: ['apartamento'],
  cidadebairro: [
    'florianopolis, agronomica',
    'florianopolis, carvoeira',
    'florianopolis, corrego-grande',
    'florianopolis, itacorubi',
    'florianopolis, joao-paulo',
    'florianopolis, monte-verde',
    'florianopolis, pantanal',
    'florianopolis, santa-monica',
    'florianopolis, trindade',
  ],
  dormitorios: [2, 3],
  vagas: [1],
  valorlocacao: [0, DEFAULT_MAX_VALUE],
  area: [DEFAULT_MIN_SIZE, 509],
  filterpacote: 'Sim',
  ordenar: 'maior_area_priv',
};

export const encodeFilters = (ibagyFilters: IbagyFilters): string => {
  const params = new URLSearchParams();
  params.append('categoriagrupo', ibagyFilters.categoriagrupo);
  params.append('finalidade', ibagyFilters.finalidade);

  ibagyFilters.tipo_residencial.forEach(t => params.append('tipo_residencial[]', t));
  ibagyFilters.cidadebairro.forEach(cb => params.append('cidadebairro[]', cb));
  ibagyFilters.dormitorios.forEach(d => params.append('dormitorios[]', String(d)));
  ibagyFilters.vagas.forEach(v => params.append('vagas[]', String(v)));

  params.append('valorlocacao', `${ibagyFilters.valorlocacao[0]},${ibagyFilters.valorlocacao[1]}`);
  params.append('filterpacote', ibagyFilters.filterpacote);
  params.append('area', `${ibagyFilters.area[0]},${ibagyFilters.area[1]}`);
  params.append('ordenar', ibagyFilters.ordenar);

  return params.toString();
};
