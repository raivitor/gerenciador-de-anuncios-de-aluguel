import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';
export interface DudaFilters {
  finalidade: string;
  city: string;
  tipo_imovel: string[];
  dorm: string[];
  garages: string[];
  min_value_squaremeters: string;
  max_value_squaremeters: string;
  min_value: string;
  max_value: string;
}

interface DudaFilterRuntimeConfig {
  maxValue?: number;
  minSize?: number;
}

const DEFAULT_CITY_ID = '2';
const DEFAULT_PROPERTY_TYPE_IDS = ['2'];
const DEFAULT_BEDROOM_IDS = ['2', '3'];
const DEFAULT_GARAGE_IDS = ['1'];
const DEFAULT_DUDA_MAX_VALUE = DEFAULT_MAX_VALUE;
const DEFAULT_DUDA_MIN_SIZE = DEFAULT_MIN_SIZE;

const formatCurrency = (value: number): string =>
  value > 0
    ? `R$ ${value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '';

const formatSquareMeters = (value: number): string =>
  value > 0
    ? `${value.toLocaleString('pt-BR', {
        maximumFractionDigits: 0,
      })} m²`
    : '';

export const buildFilters = ({
  maxValue = DEFAULT_DUDA_MAX_VALUE,
  minSize = DEFAULT_DUDA_MIN_SIZE,
}: DudaFilterRuntimeConfig = {}): DudaFilters => ({
  finalidade: 'alugar',
  city: DEFAULT_CITY_ID,
  tipo_imovel: [...DEFAULT_PROPERTY_TYPE_IDS],
  dorm: [...DEFAULT_BEDROOM_IDS],
  garages: [...DEFAULT_GARAGE_IDS],
  min_value_squaremeters: formatSquareMeters(minSize),
  max_value_squaremeters: '',
  min_value: '',
  max_value: formatCurrency(maxValue),
});

export const filters: DudaFilters = buildFilters();

export const encodeFilters = (dudaFilters: DudaFilters): string =>
  Buffer.from(JSON.stringify(dudaFilters), 'utf8').toString('base64');

export const decodeFilters = (encodedFilters: string): DudaFilters =>
  JSON.parse(Buffer.from(encodedFilters, 'base64').toString('utf8')) as DudaFilters;
