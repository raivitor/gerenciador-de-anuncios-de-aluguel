import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface SeiterFilters {
  bedrooms: number;
  parking: number;
  maxValue: number;
  minSize: number;
  quantity?: number;
}

export const filters: SeiterFilters = {
  bedrooms: 2,
  parking: 1,
  maxValue: DEFAULT_MAX_VALUE,
  minSize: DEFAULT_MIN_SIZE,
  quantity: 48,
};

export const buildSeiterURL = (baseURL: string, seiterFilters: SeiterFilters): string => {
  const { bedrooms, parking, maxValue, minSize, quantity = 48 } = seiterFilters;
  return `${baseURL}/dormitorios-${bedrooms}/vagas-${parking}/valor-max_${maxValue}/area-min_${minSize}/ordem-recentes/resultado-decrescente/quantidade-${quantity}/`;
};
