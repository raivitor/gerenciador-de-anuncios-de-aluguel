import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { createHttpClient } from '@/crawlers/shared/http';
import { createListing } from '@/crawlers/shared/listings';
import { collectPages } from '@/crawlers/shared/pagination';
import { buildPayload } from './filters';
import { parseSearch, parseTotal, type ImoveisPotiguaresResponse } from './parser';

const SEARCH_URL =
  'https://www.imoveispotiguares.com.br/aluguel/apartamento/natal/todos-os-bairros/todos-os-condominios/todas-as-opcoes/2-quartos+1-vagas?valor_max=3.000,00&area_min=45&pagina=1';

const API_URL = 'https://www.imoveispotiguares.com.br/retornar-imoveis-disponiveis';

class ImoveisPotiguaresCrawler extends BaseCrawler {
  baseURL: string;
  private readonly http = createHttpClient();

  constructor(baseURL = SEARCH_URL) {
    super('imoveis-potiguares');
    this.baseURL = baseURL;
  }

  protected buildPayload(page: number): string {
    return buildPayload(this.baseURL, page);
  }

  protected async scrape(): Promise<Apartamento[]> {
    const cards = await collectPages(
      this.name,
      async page => {
        const response = await this.http.post<ImoveisPotiguaresResponse>(
          API_URL,
          this.buildPayload(page),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
              Referer: this.baseURL,
            },
          }
        );
        return parseSearch(response.data, page, 20);
      },
      card => card.code
    );
    const listings: Apartamento[] = [];
    for (const card of cards) {
      let total = card.fields.valor_aluguel;
      try {
        total =
          parseTotal((await this.http.get<string>(card.url, { timeout: 15_000 })).data) ?? total;
      } catch (error) {
        console.warn(`[ImoveisPotiguares] Falha ao obter detalhes de ${card.url}:`, error);
      }
      listings.push(createListing(this.name, card.code, { ...card.fields, valor_total: total }));
    }
    return listings;
  }
}

const imoveisPotiguaresCrawler = new ImoveisPotiguaresCrawler();

export default imoveisPotiguaresCrawler;
