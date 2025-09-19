import puppeteer, { Browser, Page } from 'puppeteer';
import { BaseCrawler, type Apartamento } from './crawler';

export class OlxCrawler extends BaseCrawler {
  constructor() {
    super('olx', 'olx_anuncio.json');
  }

  baseURL =
    'https://www.olx.com.br/imoveis/aluguel/estado-sc/florianopolis-e-regiao/leste/trindade?pe=4000&gsp=1&gsp=2&ss=70&ret=1020';

  protected buildPageUrl = (pageNumber: number): string => {
    const url = new URL(this.baseURL);
    url.searchParams.set('o', pageNumber.toString());
    return url.toString();
  };

  protected navigateToListingsPage = async (page: Page, pageNumber: number): Promise<void> => {
    const url = this.buildPageUrl(pageNumber);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('h1.olx-text--bold', { timeout: 60_000 }).catch(() => null);
  };

  protected setPageDefaults = async (page: Page): Promise<void> => {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
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

        if (!rawListaApto.length) break;
        if (totalBusca > 0) totalItems = totalBusca;

        const listaApto = rawListaApto.map((apto: any) => {
          const condominio = this.parseFloat(this.getValueByKey(apto.properties, 'condominio'));
          const rawIptu = this.parseFloat(this.getValueByKey(apto.properties, 'iptu'));
          const iptu = rawIptu > 500 ? rawIptu / 12 : rawIptu;
          const valor_aluguel = this.parseFloat(
            String(apto?.priceValue || '0')
              .replace(/[^\d,.-]/g, '')
              .replace(',', '.')
          );
          return {
            id: apto.id,
            valor_aluguel,
            valor_total: valor_aluguel + condominio + iptu,
            url_apartamento: apto.url_apartamento,
            bairro: apto.bairro,
            tamanho: this.getValueByKey(apto.properties, 'size'),
            quartos: this.getValueByKey(apto.properties, 'rooms'),
            banheiros: this.getValueByKey(apto.properties, 'bathrooms'),
            garagem: this.getValueByKey(apto.properties, 'garage_spaces'),
          } satisfies Apartamento;
        });

        listaAgregadaApto.push(...listaApto);
        if (listaAgregadaApto.length >= totalItems) break;
        currentPage += 1;
      }
      return listaAgregadaApto;
    } catch (error) {
      console.error(`${this.name} scrape error:`, error);
      return [];
    } finally {
      await browser?.close();
    }
  }
}

const olxCrawler = new OlxCrawler();
export default olxCrawler;
