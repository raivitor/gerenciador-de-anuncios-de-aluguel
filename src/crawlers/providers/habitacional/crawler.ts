import axios from 'axios';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { parseDetail, parseSearch, type SearchListing } from './parser';

export const SEARCH_URL =
  'https://habitacionalonline.com.br/busca?finalidade=Aluguel&tipo=Apartamento%2CApartamento+Duplex&dormitorios=2&vagas=1&max=3000.00&areaPrivativaMin=45.00';

const headers = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export class HabitacionalCrawler extends BaseCrawler {
  baseURL = 'https://habitacionalonline.com.br';

  constructor(private readonly searchUrl = SEARCH_URL) {
    super('habitacional');
  }

  private pageUrl(page: number): string {
    const url = new URL(this.searchUrl);
    url.searchParams.set('page', String(page));
    return url.toString();
  }

  private async get(url: string): Promise<string> {
    const response = await axios.get<string>(url, { headers, timeout: 90_000 });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Habitacional: HTTP ${response.status} em ${url}`);
    }
    return response.data;
  }

  protected async scrape(): Promise<Apartamento[]> {
    const firstUrl = this.pageUrl(1);
    const first = parseSearch(await this.get(firstUrl), firstUrl);
    const listings = new Map<string, SearchListing>();
    const fingerprints = new Set<string>();
    const addPage = (result: ReturnType<typeof parseSearch>) => {
      const fingerprint = [...new Set(result.listings.map(item => item.code))].sort().join('|');
      if (fingerprints.has(fingerprint)) throw new Error('Habitacional: página repetida');
      fingerprints.add(fingerprint);
      for (const listing of result.listings) listings.set(listing.code, listing);
    };
    addPage(first);
    for (let page = 2; page <= first.pages; page += 1) {
      addPage(parseSearch(await this.get(this.pageUrl(page)), this.pageUrl(page)));
    }

    const result: Apartamento[] = [];
    for (const listing of listings.values()) {
      const parsed = parseDetail(await this.get(listing.url), listing);
      if (parsed) result.push(parsed);
    }
    return result;
  }
}

const habitacionalCrawler = new HabitacionalCrawler();

export default habitacionalCrawler;
