import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface CreditoRealFilters {
  valueType: boolean;
  imovelTypes: string[];
  neighborhoods: string[];
  cityState: string;
  finalValue: number;
  areaInitialValue: number;
  parking: number;
}

export const filters: CreditoRealFilters = {
  valueType: true,
  imovelTypes: ['Apartamento'],
  neighborhoods: [
    // 'Agronômica',
    // 'Carvoeira',
    // 'Córrego Grande',
    // 'Itacorubi',
    // 'João Paulo',
    // 'Monte Verde',
    // 'Pantanal',
    // 'Santa Mônica',
    // 'Trindade',
  ],
  cityState: 'Florianópolis_SC',
  finalValue: DEFAULT_MAX_VALUE,
  areaInitialValue: DEFAULT_MIN_SIZE,
  parking: 1,
};

export const encodeFilters = (creditoRealFilters: CreditoRealFilters): string =>
  encodeURIComponent(JSON.stringify(creditoRealFilters));
