import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { createHttpClient } from '@/crawlers/shared/http';
import { collectPages } from '@/crawlers/shared/pagination';

import { parseDetail, parseSearch } from './parser';

const SEARCH_URL =
  'https://karllabrandaoimoveis.com.br/alugar/rn/natal/dormitorios-2/vagas-1/ordem-valor/resultado-crescente/quantidade-12/';

function buildPageUrl(searchUrl: string, page: number): string {
  if (page === 1) return searchUrl;
  const base = searchUrl.replace(/\/+$/, '');
  return `${base}/pagina-${page}/`;
}

class KarllaBrandaoCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('karlla-brandao');
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
        const parsed = parseDetail(detailHtml, card, this.minSize, this.maxValue);
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

const karllaBrandaoCrawler = new KarllaBrandaoCrawler();

export default karllaBrandaoCrawler;
