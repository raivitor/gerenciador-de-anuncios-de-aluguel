import { DEFAULT_MAX_VALUE } from '@/crawlers/core/base-crawler';

export interface SeiterFilters {
  bedrooms: number;
  parking: number;
  maxValue: number;
  quantity?: number;
}

export const filters: SeiterFilters = {
  bedrooms: 2,
  parking: 1,
  maxValue: DEFAULT_MAX_VALUE,
  quantity: 48,
};

export const buildSeiterURL = (baseURL: string, seiterFilters: SeiterFilters): string => {
  const { bedrooms, parking, maxValue, quantity = 48 } = seiterFilters;
  return `${baseURL}/dormitorios-${bedrooms}/vagas-${parking}/valor-max_${maxValue}/ordem-valor/resultado-decrescente/quantidade-${quantity}/`;
};
