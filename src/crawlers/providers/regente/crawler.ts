import axios from 'axios';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { encodeFilters, filters } from './filters';

type RegenteValue = string | number | null | undefined;

interface RegenteImovel {
  Codigo: string;
  TituloSite?: string;
  Categoria: string;
  Bairro: string;
  Cidade: string;
  ValorVenda: RegenteValue;
  ValorLocacao: RegenteValue;
  Dormitorios: RegenteValue;
  Vagas: RegenteValue;
  AreaTotal: RegenteValue;
  AreaPrivativa?: RegenteValue;
  FotoDestaque: string;
  FotoDestaquePequena: string;
  Finalidade: string;
  DescricaoWeb: string;
  TotalBanheiros: RegenteValue;
  ValorIptu: RegenteValue;
  ValorCondominio: RegenteValue;
  Status: string;
}

interface RegenteApiPageData {
  pagina?: number;
  paginas?: number;
  total?: number;
  quantidade?: number;
  result?: RegenteImovel[];
}

interface RegenteApiResponse {
  success: boolean;
  data: RegenteApiPageData | Record<string, RegenteImovel | number | RegenteImovel[]>;
}

const generateSlug = (text: string | undefined, fallback: string): string => {
  const normalizedText = text?.trim() || fallback;
  return text
    ? normalizedText
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '')
    : fallback;
};

const isRegenteImovel = (value: unknown): value is RegenteImovel =>
  typeof value === 'object' &&
  value !== null &&
  'Codigo' in value &&
  typeof (value as { Codigo?: unknown }).Codigo === 'string';

const extractPageData = (
  data: RegenteApiResponse['data']
): { apartamentos: RegenteImovel[]; paginas: number } => {
  const paginas =
    'paginas' in data && typeof data.paginas === 'number'
      ? data.paginas
      : 1;

  if ('result' in data && Array.isArray(data.result)) {
    return {
      apartamentos: data.result.filter(isRegenteImovel),
      paginas,
    };
  }

  const apartamentos = Object.values(data).filter(isRegenteImovel);

  return {
    apartamentos,
    paginas,
  };
};

const normalizeRegenteValue = (value: RegenteValue): string =>
  value === null || value === undefined ? '' : String(value);

const getApartmentArea = (apto: RegenteImovel): RegenteValue => {
  const total = normalizeRegenteValue(apto.AreaTotal);
  if (total && total !== '0' && total !== '0.00') {
    return total;
  }

  return apto.AreaPrivativa;
};

const slugifyFallback = (code: string): string =>
  `imovel-${code}`
    .toLowerCase()
    .replace(/[^\w-]/g, '');

export class RegenteCrawler extends BaseCrawler {
  baseURL = 'https://regenteimoveis.com.br/wp-json/gritsoftware/v1/properties-v4';

  constructor() {
    super('regente');
  }

  /**
   * Converte strings numéricas da API (que usam ponto como decimal) para number.
   * Se houver vírgula, recorre ao parseFloat da BaseCrawler.
   */
  private parseRegenteValue(value: RegenteValue): number {
    const normalizedValue = normalizeRegenteValue(value);
    if (!normalizedValue) return 0;
    if (normalizedValue.includes(',')) return this.parseFloat(normalizedValue);
    const n = Number(normalizedValue);
    return isNaN(n) ? 0 : n;
  }

  protected async scrape(): Promise<Apartamento[]> {
    const listAlugueis: Apartamento[] = [];
    let paginaAtual = 1;
    let totalPaginas = 1;

    // Loop para buscar todas as páginas
    do {
      const currentFilters = { ...filters, pagina: paginaAtual };
      const url = `${this.baseURL}?${encodeFilters(currentFilters)}`;
      const response = await axios.get<RegenteApiResponse>(url);
      const { success, data } = response.data;

      if (!success || !data) {
        throw new Error(`Regente returned invalid payload on page ${paginaAtual}`);
      }

      const { apartamentos, paginas } = extractPageData(data);
      totalPaginas = paginas || totalPaginas;

      for (const apto of apartamentos) {
        const valorAluguel = this.parseRegenteValue(apto.ValorLocacao);
        const valorIptu = this.parseRegenteValue(apto.ValorIptu);
        const valorCondominio = this.parseRegenteValue(apto.ValorCondominio);
        const slug = generateSlug(apto.TituloSite, slugifyFallback(apto.Codigo));
        const urlApartamento = `https://regenteimoveis.com.br/imovel/${apto.Codigo}/${slug}`;

        listAlugueis.push({
          id: `${this.name}_${apto.Codigo}`,
          valor_aluguel: valorAluguel,
          valor_total: valorAluguel + valorIptu + valorCondominio,
          url_apartamento: urlApartamento,
          bairro: apto.Bairro,
          tamanho: this.parseRegenteValue(getApartmentArea(apto)),
          quartos: this.toNumber(normalizeRegenteValue(apto.Dormitorios)),
          banheiros: this.toNumber(normalizeRegenteValue(apto.TotalBanheiros)),
          garagem: this.toNumber(normalizeRegenteValue(apto.Vagas)),
          corretora: this.name,
        });
      }

      paginaAtual++;

      if (paginaAtual <= totalPaginas) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } while (paginaAtual <= totalPaginas);

    return listAlugueis;
  }
}

const regenteCrawler = new RegenteCrawler();

export default regenteCrawler;
