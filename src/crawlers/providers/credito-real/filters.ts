import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface CreditoRealFilters {
  valueType: boolean;
  imovelTypes: string[];
  neighborhoods: string[];
  finalValue: number;
  areaInitialValue: number;
  parking: number;
  bedrooms: number;
  cityState: string;
}

export const filters: CreditoRealFilters = {
  valueType: true,
  imovelTypes: ['Apartamento'],
  neighborhoods: [
    'Agronômica',
    'Carvoeira',
    'Córrego Grande',
    'Itacorubi',
    'João Paulo',
    'Monte Verde',
    'Pantanal',
    'Santa Mônica',
    'Trindade',
    'Parque São Jorge',
  ],
  cityState: 'Florianópolis_SC',
  finalValue: DEFAULT_MAX_VALUE,
  areaInitialValue: DEFAULT_MIN_SIZE,
  parking: 1,
  bedrooms: 3,
};

export const encodeFilters = (creditoRealFilters: CreditoRealFilters): string => {
  const params = new URLSearchParams();
  params.append('valueType', String(creditoRealFilters.valueType));
  params.append('cityState', creditoRealFilters.cityState);
  params.append('imovelTypes', creditoRealFilters.imovelTypes.join(','));
  params.append('neighborhoods', creditoRealFilters.neighborhoods.join(','));
  params.append('parking', String(creditoRealFilters.parking));
  params.append('areaInitialValue', String(creditoRealFilters.areaInitialValue));
  params.append('finalValue', String(creditoRealFilters.finalValue));

  return params.toString();
};
