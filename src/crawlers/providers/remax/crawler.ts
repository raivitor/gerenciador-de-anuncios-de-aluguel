import axios from 'axios';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export const SEARCH_URL =
  'https://www.remax.com.br/listings?Country=Brasil&Province=9518&City=6580905%2C6568401&CountryId=55&CityNM=6580905-Lagoa+Nova%2C6568401-Natal&ProvinceNM=9518-Rio+Grande+do+Norte&ListingClass=-1&TransactionTypeUID=260&MacroPropertyTypeUIDs=2667%2C3245&Bedrooms=2&ParkingSpaces=1&PriceMax=2500&MinTotalArea=40';

export function buildRemaxFilterFromUrl(searchUrl: string): string {
  const url = new URL(searchUrl);
  const params = url.searchParams;

  const filters: string[] = [
    'content/TenantId eq 6',
    'content/OnHoldListing eq false',
    'content/IsRegionalOffice eq false',
    'content/IsViewable eq true',
  ];

  const countryId = params.get('CountryId');
  if (countryId) {
    filters.push(`content/MacroRegionId eq ${countryId}`);
  }

  const provinceId = params.get('Province');
  if (provinceId) {
    filters.push(`content/ProvinceID eq ${provinceId}`);
  }

  const cityParam = params.get('City');
  if (cityParam) {
    const cityIds = cityParam
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    if (cityIds.length === 1) {
      filters.push(`content/CityID eq ${cityIds[0]}`);
    } else if (cityIds.length > 1) {
      filters.push(`(${cityIds.map(id => `content/CityID eq ${id}`).join(' or ')})`);
    }
  }

  const transactionType = params.get('TransactionTypeUID');
  if (transactionType) {
    filters.push(`content/TransactionTypeUID eq ${transactionType}`);
  }

  const macroTypes = params.get('MacroPropertyTypeUIDs');
  if (macroTypes) {
    const typeIds = macroTypes
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    if (typeIds.length === 1) {
      filters.push(`content/MacroPropertyTypeUID eq ${typeIds[0]}`);
    } else if (typeIds.length > 1) {
      filters.push(`(${typeIds.map(id => `content/MacroPropertyTypeUID eq ${id}`).join(' or ')})`);
    }
  }

  const bedrooms = params.get('Bedrooms');
  if (bedrooms) {
    filters.push(`content/NumberOfBedrooms ge ${bedrooms}`);
  }

  const parking = params.get('ParkingSpaces');
  if (parking) {
    filters.push(`content/ParkingSpaces ge ${parking}`);
  }

  const minArea = params.get('MinTotalArea');
  if (minArea) {
    filters.push(`content/TotalArea ge ${minArea}`);
  }

  const maxArea = params.get('MaxTotalArea');
  if (maxArea) {
    filters.push(`content/TotalArea le ${maxArea}`);
  }

  const priceMax = params.get('PriceMax');
  if (priceMax) {
    filters.push(`content/ListingPrice le ${priceMax}`);
  }

  const priceMin = params.get('PriceMin');
  if (priceMin) {
    filters.push(`content/ListingPrice ge ${priceMin}`);
  }

  return filters.join(' and ');
}

export class RemaxCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('remax');
    this.baseURL = baseURL;
  }

  private readonly searchEndpoint = 'https://www.remax.com.br/search/listing-search/docs/search';

  private readonly axiosConfig = {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30_000,
  };

  protected async scrape(): Promise<Apartamento[]> {
    const filter = buildRemaxFilterFromUrl(this.baseURL);
    const top = 24;
    let skip = 0;
    const listings: Apartamento[] = [];

    while (true) {
      const payload = {
        count: true,
        skip,
        top,
        searchMode: 'any',
        queryType: 'full',
        scoringProfile: '',
        searchFields: '*',
        search: '*',
        filter,
        minimumCoverage: 0,
        orderby: '',
      };

      const response = await axios.post(this.searchEndpoint, payload, this.axiosConfig);
      const data = response.data;
      const totalCount: number = data['@odata.count'] || 0;
      const items: any[] = data.value || [];

      for (const item of items) {
        const c = item.content;
        const ptLink =
          c.ShortLinks?.find((s: any) => s.LanguageCode === 'pt-BR')?.ShortLink ||
          c.ShortLinks?.[0]?.ShortLink;
        const urlApartamento = ptLink
          ? `https://www.remax.com.br/${ptLink}`
          : `https://www.remax.com.br/pt-br/imoveis/${c.MLSID || c.ListingId}`;

        const valorAluguel = Number(c.ListingPrice) || 0;
        let additional = 0;
        if (Array.isArray(c.AdditionalFees)) {
          additional = c.AdditionalFees.reduce(
            (sum: number, fee: any) => sum + (Number(fee.FeeAmount || fee.Amount) || 0),
            0
          );
        }
        const valorTotal = c.TransactionCost ? Number(c.TransactionCost) : valorAluguel + additional;

        listings.push({
          id: `${this.name}_${c.MLSID || c.ListingId}`,
          valor_aluguel: valorAluguel,
          valor_total: valorTotal,
          url_apartamento: urlApartamento,
          bairro: c.LocalZone || c.GeoDatas?.[0]?.LocalZone || c.City,
          tamanho: Number(c.TotalArea || c.BuiltArea || c.LivingArea || 0),
          quartos: Number(c.NumberOfBedrooms || 0),
          banheiros: Number(c.NumberOfBathrooms || 0),
          garagem: Number(c.ParkingSpaces || c.GarageSpaces || 0),
          corretora: this.name,
        });
      }

      if (listings.length >= totalCount || items.length === 0) {
        break;
      }

      skip += top;
    }

    return listings;
  }
}

const remaxCrawler = new RemaxCrawler();

export default remaxCrawler;
