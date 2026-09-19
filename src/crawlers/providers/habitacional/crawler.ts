import { createHttpClient } from '@/crawlers/shared/http';
import { collectPages, pageUrl } from '@/crawlers/shared/pagination';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { parseDetail, parseSearch } from './parser';

export const SEARCH_URL =
  'https://habitacionalonline.com.br/busca?finalidade=Aluguel&tipo=Apartamento%2CApartamento+Duplex&dormitorios=2&vagas=1&max=3000.00&areaPrivativaMin=45.00';

export class HabitacionalCrawler extends BaseCrawler {
  baseURL = 'https://habitacionalonline.com.br';

  constructor(private readonly searchUrl = SEARCH_URL) {
    super('habitacional');
  }

  private readonly http = createHttpClient({ timeout: 90_000 });

  protected async scrape(): Promise<Apartamento[]> {
    let pages = 1;
    const listings = await collectPages(
      this.name,
      async page => {
        const url = pageUrl(this.searchUrl, 'page', page);
        const parsed = parseSearch((await this.http.get<string>(url)).data, url);
        if (page === 1) pages = parsed.pages;
        if (page > 1 && !parsed.listings.length) {
          throw new Error('Habitacional: busca esvaziou durante a paginação');
        }
        return { items: parsed.listings, hasNext: page < pages };
      },
      listing => listing.code
    );

    const result: Apartamento[] = [];
    for (const listing of listings) {
      const parsed = parseDetail((await this.http.get<string>(listing.url)).data, listing);
      if (parsed) result.push(parsed);
    }
    return result;
  }
}

const habitacionalCrawler = new HabitacionalCrawler();

export default habitacionalCrawler;
