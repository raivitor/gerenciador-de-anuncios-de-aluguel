import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { createHttpClient } from '@/crawlers/shared/http';
import { collectPages, pageUrl } from '@/crawlers/shared/pagination';

import { parseDetail, parseSearch } from './parser';

const SEARCH_URL = 'https://ibeda.com.br/apartamento/para-alugar';

function buildPageUrl(searchUrl: string, page: number): string {
  if (page === 1) return searchUrl;
  return pageUrl(searchUrl, 'pagina', page);
}

class IbedaCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('ibeda');
    this.baseURL = baseURL;
  }

  private readonly http = createHttpClient({ timeout: 90_000 });

  protected async scrape(): Promise<Apartamento[]> {
    const cards = await collectPages(
      this.name,
      async page => {
        const url = buildPageUrl(this.baseURL, page);
        const html = (await this.http.get<string>(url)).data;
        return parseSearch(html, url, page);
      },
      card => card.code
    );

    const result: Apartamento[] = [];
    for (const card of cards) {
      try {
        const detailHtml = (await this.http.get<string>(card.url)).data;
        const parsed = parseDetail(detailHtml, card);
        if (parsed) {
          result.push(parsed);
        }
      } catch (error) {
        console.warn(`[${this.name}] Falha ao obter detalhes de ${card.url}:`, error);
      }
    }

    return result;
  }
}

const ibedaCrawler = new IbedaCrawler();

export default ibedaCrawler;
