import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseCrawler, type Apartamento } from './crawler';

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

  protected async scrape(): Promise<Apartamento[]> {
    let browser: Browser | undefined;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await this.setPageDefaults(page);

      let currentPage = 1;
      let totalItems = 0;
      const listaAgregadaApto: Apartamento[] = [];
      while (true) {
        await this.navigateToListingsPage(page, currentPage);
        const { rawListaApto, totalBusca } = await page.evaluate(() => {
          const totalResultados =
            document
              .querySelector<HTMLElement>('text-neutral-110')
              ?.innerText.split(' ')
              .slice(-2, -1)[0] || '0';
          const json = document.querySelector<HTMLElement>('#__NEXT_DATA__')?.innerText;
          const aptoDados = json ? JSON.parse(json).props.pageProps.ads : [];
          const rawListaApto = aptoDados.map((item: any) => ({
            id: item.listId,
            priceValue: item.priceValue,
            url_apartamento: item.friendlyUrl,
            properties: item.properties,
            bairro: item.locationDetails?.neighbourhood || '',
          }));
          return {
            rawListaApto,
            totalBusca: parseInt(totalResultados.replace(/\D/g, ''), 10) || 0,
          };
        });

        totalItems = totalBusca;
        const listaApto = rawListaApto.map((item: any) => {
          const condominio = this.parseFloat(this.getValueByKey(item.properties, 'condominio'));
          const rawIptu = this.parseFloat(this.getValueByKey(item.properties, 'iptu'));
          const iptu = rawIptu > 500 ? rawIptu / 12 : rawIptu;
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
            bairro: item.bairro,
            tamanho: this.getValueByKey(item.properties, 'size'),
            quartos: this.getValueByKey(item.properties, 'rooms'),
            banheiros: this.getValueByKey(item.properties, 'bathrooms'),
            garagem: this.getValueByKey(item.properties, 'garage_spaces'),
          };
        });
        listaAgregadaApto.push(...listaApto);
        if (listaAgregadaApto.length >= totalItems) break;
        console.log(
          `OLX: Page ${currentPage} scraped, total items so far: ${listaAgregadaApto.length}/${totalItems}`
        );
        currentPage += 1;
      }
      return listaAgregadaApto;
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
