import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface SeiterFilters {
  bedrooms: number;
  parking: number;
  maxValue: number;
  minSize: number;
}

export const filters: SeiterFilters = {
  bedrooms: 1,
  parking: 1,
  maxValue: DEFAULT_MAX_VALUE,
  minSize: DEFAULT_MIN_SIZE,
};

export const buildSeiterURL = (baseURL: string, seiterFilters: SeiterFilters): string => {
  const { bedrooms, maxValue, minSize } = seiterFilters;
  return `${baseURL}/imoveis/aluguel/apartamento/florianopolis/dormitorios-${bedrooms}/valor-0-${maxValue}/area-${minSize}`;
};
