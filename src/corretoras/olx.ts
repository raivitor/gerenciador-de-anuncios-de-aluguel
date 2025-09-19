import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseCrawler, type RentalListing } from './crawler';

export class OlxCrawler extends BaseCrawler {
  baseURL =
    'https://www.olx.com.br/imoveis/aluguel/estado-sc/florianopolis-e-regiao/leste/trindade?pe=4000&gsp=1&gsp=2&ss=70&ret=1020';
  constructor() {
    super('olx', 'olx_anuncio.json');
  }

  protected setPageDefaults = async (page: Page): Promise<void> => {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
  };

  protected buildPageUrl = (pageNumber: number): string => {
    const url = new URL(this.baseURL);
    url.searchParams.set('o', pageNumber.toString());
    return url.toString();
  };

  protected navigateToListingsPage = async (page: Page, pageNumber: number): Promise<void> => {
    const url = this.buildPageUrl(pageNumber);
    console.log('Navigating to OLX URL:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('h1.olx-text--bold', { timeout: 60_000 }).catch(() => null);
  };

  protected getValueByKey = (item: any[] = [], key: string): string => {
    const found = item.find((el: any) => el.name === key);
    return found ? found.value : '';
  };

  protected parseFloat = (value: string): number => {
    const cleaned = value
      .replace(/[^\d,.-]/g, '')
      .replace('.', '')
      .replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  protected async scrape(): Promise<RentalListing[]> {
    let browser: Browser | undefined;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await this.setPageDefaults(page);

      const currentPage = 1;
      //let totalItems: number | null = null;
      //while (true) {
      await this.navigateToListingsPage(page, currentPage);
      const rawListings = await page.evaluate(() => {
        const json = document.querySelector<HTMLElement>('#__NEXT_DATA__')?.innerText;
        const ads = json ? JSON.parse(json).props.pageProps.ads : [];
        return ads.map((item: any) => ({
          id: item.listId,
          priceValue: item.priceValue,
          url_apartamento: item.friendlyUrl,
          properties: item.properties,
        }));
      });

      const listings = rawListings.map((item: any) => {
        const condominio = this.parseFloat(this.getValueByKey(item.properties, 'condominio'));
        const iptu = this.parseFloat(this.getValueByKey(item.properties, 'iptu'));
        const valor_aluguel = this.parseFloat(
          String(item?.priceValue || '0')
            .replace(/[^\d,.-]/g, '')
            .replace(',', '.')
        );
        return {
          id: item.id,
          valor_aluguel,
          valor_total: valor_aluguel + condominio + iptu,
          url_apartamento: item.url_apartamento,
          tamanho: this.getValueByKey(item.properties, 'size'),
          quartos: this.getValueByKey(item.properties, 'rooms'),
          banheiros: this.getValueByKey(item.properties, 'bathrooms'),
          garagem: this.getValueByKey(item.properties, 'garage_spaces'),
        };
      });

      return listings;
      //}
    } catch (error) {
      console.error('OlxCrawler scrape error:', error);
      return [];
    } finally {
      console.log('Closing browser...');
      await browser?.close();
    }
  }
}

const olxCrawler = new OlxCrawler();
export default olxCrawler;
