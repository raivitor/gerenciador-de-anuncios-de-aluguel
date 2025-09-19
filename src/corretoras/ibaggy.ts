import puppeteer, { Browser, Page } from 'puppeteer';

import { BaseCrawler, type Apartamento } from './crawler';

interface RawIbagyListing {
  id: string;
  valor_aluguel: string;
  valor_total: string;
  url_apartamento: string;
  observacao: string;
}

interface RawIbagyEvaluateResult {
  listings: RawIbagyListing[];
  totalItems: number;
}

export class IbagyCrawler extends BaseCrawler {
  constructor() {
    super('ibagy', 'ibaggy_anuncio.json');
  }
  ITEMS_PER_PAGE = 12;
  MAX_PAGES = 50;
  baseURL =
    'https://ibagy.com.br/aluguel/apartamento/florianopolis/trindade/com-vaga/?categoriagrupo=Residencial&finalidade=aluguel&tipo_residencial%5B%5D=apartamento&cidadebairro%5B%5D=florianopolis%2C%20agronomica&cidadebairro%5B%5D=florianopolis%2C%20carvoeira&cidadebairro%5B%5D=florianopolis%2C%20corrego-grande&cidadebairro%5B%5D=florianopolis%2C%20itacorubi&cidadebairro%5B%5D=florianopolis%2C%20joao-paulo&cidadebairro%5B%5D=florianopolis%2C%20monte-verde&cidadebairro%5B%5D=florianopolis%2C%20pantanal&cidadebairro%5B%5D=florianopolis%2C%20santa-monica&cidadebairro%5B%5D=florianopolis%2C%20trindade&vagas%5B%5D=1&valorvenda=0%2C1099999&valorlocacao=0%2C4000&filterpacote=Sim&area=70%2C509&codigo=&ordenar=maior_area_priv&pagina=1';

  protected buildPageUrl = (pageNumber: number): string => {
    const url = new URL(this.baseURL);
    url.searchParams.set('pagina', pageNumber.toString());
    return url.toString();
  };

  protected navigateToListingsPage = async (page: Page, pageNumber: number): Promise<void> => {
    await page.goto(this.buildPageUrl(pageNumber), { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('.imovel-box-single', { timeout: 60_000 }).catch(() => null);
  };

  protected setPageDefaults = async (page: Page): Promise<void> => {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
  };

  protected cleanMoney = (value: string | null | undefined): string => {
    if (!value) {
      return '0';
    }

    return value
      .replace(/R\$\s*/gi, '')
      .replace(/[^0-9.,]/g, '')
      .replace(/\s+/g, '')
      .trim();
  };

  protected parseMoney = (value: string | null | undefined): number => {
    const cleaned = this.cleanMoney(value);
    if (!cleaned) {
      return 0;
    }

    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
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

      const aggregatedListings: Apartamento[] = [];

      let currentPage = 1;
      let totalItems: number | null = null;

      while (true) {
        await this.navigateToListingsPage(page, currentPage);

        const { listings: rawListings, totalItems: reportedTotal } = await page.evaluate(
          (): RawIbagyEvaluateResult => {
            const getTotalItens = (doc: Document): number => {
              const totalsNode = doc.querySelector<HTMLElement>('p.result-totals-phrase');
              const digits = totalsNode?.innerText.replace(/\D/g, '');
              return digits ? parseInt(digits, 10) : 0;
            };

            const cards = document.querySelectorAll<HTMLDivElement>('.imovel-box-single');

            const listings = Array.from(cards).map(card => {
              const aluguelRaw =
                card.querySelector<HTMLElement>('.thumb-price')?.textContent ||
                card.querySelector<HTMLElement>('.item-price-rent')?.textContent ||
                '';

              const totalRaw =
                card.querySelector<HTMLElement>('.valor-total-grid-imovel b')?.textContent || '';

              const urlLink =
                card.querySelector<HTMLAnchorElement>('.titulo-anuncio a')?.href ||
                card.querySelector<HTMLAnchorElement>("a[href*='/imovel/']")?.href ||
                '';

              return {
                id: urlLink.split('imovel/')[1]?.split('/')?.[0] ?? '',
                valor_aluguel: aluguelRaw || '0',
                valor_total: totalRaw || aluguelRaw || '0',
                url_apartamento: urlLink || '',
                observacao: '',
              };
            });

            return {
              listings,
              totalItems: getTotalItens(document),
            };
          }
        );

        if (!rawListings.length) {
          break;
        }

        if (totalItems === null && reportedTotal > 0) {
          totalItems = reportedTotal;
        }

        aggregatedListings.push(
          ...rawListings.map(listing => {
            const valor_aluguel = this.parseMoney(listing.valor_aluguel);
            const valor_total = this.parseMoney(listing.valor_total || listing.valor_aluguel);

            return {
              id: listing.id,
              valor_aluguel,
              valor_total,
              url_apartamento: listing.url_apartamento,
              observacao: listing.observacao,
            } satisfies Apartamento;
          })
        );

        if (totalItems === null && rawListings.length < this.ITEMS_PER_PAGE) {
          break;
        }

        const expectedTotal = totalItems ?? Number.MAX_SAFE_INTEGER;

        if (aggregatedListings.length >= expectedTotal) {
          break;
        }

        currentPage += 1;

        if (totalItems !== null) {
          const maxPages = Math.ceil(totalItems / this.ITEMS_PER_PAGE);
          if (currentPage > maxPages) {
            break;
          }
        } else if (currentPage > this.MAX_PAGES) {
          console.warn(
            `Stopped pagination after reaching the safety limit of ${this.MAX_PAGES} pages without a reported total.`
          );
          break;
        }
      }

      if (totalItems && aggregatedListings.length !== totalItems) {
        console.warn(
          `Ibagy listings count mismatch. Expected ${totalItems}, extracted ${aggregatedListings.length}.`
        );
      }

      return aggregatedListings;
    } finally {
      await browser?.close();
    }
  }
}

const ibagyCrawler = new IbagyCrawler();

export default ibagyCrawler;
