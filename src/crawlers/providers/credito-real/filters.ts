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
  imovelTypes: [
    'Apartamento Garden',
    'Cobertura',
    'Casa em Condomínio',
    'Casa Geminada',
    'Casa Sobrado',
    'Apartamento',
  ],
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
  finalValue: 4000,
  areaInitialValue: 70,
  parking: 1,
};

export const encodeFilters = (creditoRealFilters: CreditoRealFilters): string =>
  encodeURIComponent(JSON.stringify(creditoRealFilters));
