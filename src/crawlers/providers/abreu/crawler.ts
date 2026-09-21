import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { createHttpClient } from '@/crawlers/shared/http';
import { collectPages, pageUrl } from '@/crawlers/shared/pagination';

import { parseDetail, parseSearch } from './parser';

const SEARCH_URL =
  'https://www.abreuimoveis.com.br/pesquisa-de-imoveis/?busca_free=&locacao_venda=L&valor_loc_min_input=0&valor_loc_max_input=0&valor_ven_min_input=0&valor_ven_max_input=0&id_cidade%5B%5D=2&dormitorio=&garagem=1&finalidade=residencial&a_min=&a_max=&area_tipo=&vmi=&vma=&ordem=1';

function buildPageUrl(searchUrl: string, page: number): string {
  if (page === 1) return searchUrl;
  return pageUrl(searchUrl, 'pag', page);
}

class AbreuCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('abreu');
    this.baseURL = baseURL;
  }

  private readonly http = createHttpClient({ timeout: 60_000 });

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

const abreuCrawler = new AbreuCrawler();

export default abreuCrawler;
