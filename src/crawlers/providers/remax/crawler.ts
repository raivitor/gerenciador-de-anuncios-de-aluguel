import { BaseCrawler } from '@/crawlers/core/base-crawler';
import { createHttpClient } from '@/crawlers/shared/http';
import { collectPages } from '@/crawlers/shared/pagination';
import { buildRemaxFilterFromUrl } from './filters';
import { parseSearch, type RemaxResponse } from './parser';
export { buildRemaxFilterFromUrl } from './filters';

export const SEARCH_URL =
  'https://www.remax.com.br/listings?Country=Brasil&Province=9518&City=6580905%2C6568401&CountryId=55&CityNM=6580905-Lagoa+Nova%2C6568401-Natal&ProvinceNM=9518-Rio+Grande+do+Norte&ListingClass=-1&TransactionTypeUID=260&MacroPropertyTypeUIDs=2667%2C3245&Bedrooms=2&ParkingSpaces=1&PriceMax=2500&MinTotalArea=40';

export class RemaxCrawler extends BaseCrawler {
  baseURL: string;
  private readonly http = createHttpClient({
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  private readonly searchEndpoint = 'https://www.remax.com.br/search/listing-search/docs/search';

  constructor(baseURL = SEARCH_URL) {
    super('remax');
    this.baseURL = baseURL;
  }

  protected async scrape() {
    const filter = buildRemaxFilterFromUrl(this.baseURL);
    const top = 24;
    return collectPages(
      this.name,
      async page => {
        const skip = (page - 1) * top;
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
        const response = await this.http.post<RemaxResponse>(this.searchEndpoint, payload);
        return parseSearch(response.data, skip, top);
      },
      listing => listing.id
    );
  }
}

const remaxCrawler = new RemaxCrawler();

export default remaxCrawler;
