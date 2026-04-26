import axios from 'axios';

import { BaseCrawler } from '../../core/base-crawler.ts';
import type { Apartamento } from '../../core/types.ts';

import { buildFilters, encodeFilters } from './filter.ts';
import { DUDA_SITE_ORIGIN, parseLoadMoreResponse, parseSearchPageHtml } from './parser.ts';

export class DudaCrawler extends BaseCrawler {
  private readonly defaultHeaders = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  constructor() {
    super('duda');
  }

  baseURL = `${DUDA_SITE_ORIGIN}/alugar/florianopolis`;

  private buildSearchUrl(encodedFilters: string): string {
    const url = new URL(this.baseURL);
    url.searchParams.set('filters', encodedFilters);
    return url.toString();
  }

  private buildLoadMoreUrl(encodedFilters: string, pageNumber: number): string {
    const url = new URL(this.baseURL);
    url.searchParams.set('filters', encodedFilters);
    url.searchParams.set('action', 'loadMoreImoveis');
    url.searchParams.set('page', String(pageNumber));
    return url.toString();
  }

  private mapListingToApartamento(listing: ReturnType<typeof parseSearchPageHtml>[number]): Apartamento {
    return {
      id: `${this.name}_${listing.id}`,
      valor_aluguel: listing.valor_aluguel,
      valor_total: listing.valor_aluguel + listing.condominio + listing.iptu,
      url_apartamento: listing.url_apartamento,
      bairro: listing.bairro,
      tamanho: listing.tamanho,
      quartos: listing.quartos,
      banheiros: listing.banheiros,
      garagem: listing.garagem,
      corretora: this.name,
    } satisfies Apartamento;
  }

  protected async scrape(): Promise<Apartamento[]> {
    const encodedFilters = encodeFilters(
      buildFilters({
        maxValue: this.maxValue,
        minSize: this.minSize,
      })
    );
    const apartamentos = new Map<string, Apartamento>();

    const { data: initialHtml } = await axios.get<string>(this.buildSearchUrl(encodedFilters), {
      headers: this.defaultHeaders,
      timeout: 90_000,
    });

    for (const listing of parseSearchPageHtml(initialHtml)) {
      apartamentos.set(listing.id, this.mapListingToApartamento(listing));
    }

    for (let page = 2; ; page += 1) {
      const { data } = await axios.get<string | object>(this.buildLoadMoreUrl(encodedFilters, page), {
        headers: {
          ...this.defaultHeaders,
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 90_000,
      });

      const pageItems = parseLoadMoreResponse(data as string | { content?: string });
      if (!pageItems.length) break;

      const previousSize = apartamentos.size;
      for (const listing of pageItems) {
        apartamentos.set(listing.id, this.mapListingToApartamento(listing));
      }
      if (apartamentos.size === previousSize) break;
    }

    return Array.from(apartamentos.values());
  }
}

const dudaCrawler = new DudaCrawler();

export default dudaCrawler;
