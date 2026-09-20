import type { Page } from 'puppeteer';
import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { createHttpClient } from '@/crawlers/shared/http';
import { createListing, uniqueBy } from '@/crawlers/shared/listings';
import { parseBrazilianNumber } from '@/crawlers/shared/numbers';
import { parseBathrooms, parseSearch } from './parser';

const SEARCH_URL =
  'https://emobiimobiliaria.com.br/aluguel/apartamento/natal/2-3-dormitorios/1-banheiro/com-vaga/';

class EmobiCrawler extends PuppeteerCrawler {
  baseURL: string;
  private readonly http = createHttpClient({ timeout: 10_000 });

  constructor(baseURL = SEARCH_URL) {
    super('emobi');
    this.baseURL = baseURL;
  }

  private async fetchBanheiros(url: string, fallback: number): Promise<number> {
    try {
      return parseBathrooms((await this.http.get<string>(url)).data) ?? fallback;
    } catch (error) {
      console.warn(`[Emobi] Falha ao obter detalhes de banheiros para ${url}:`, error);
      return fallback;
    }
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    const response = await page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 90_000 });
    if (!response?.ok()) throw new Error(`Emobi: HTTP ${response?.status()}`);
    await page.waitForSelector('.imovel-box-single', { timeout: 30_000 }).catch(() => null);

    const countText = await page.evaluate(
      () => document.querySelector('p.result-totals-phrase')?.textContent ?? ''
    );
    const totalExpected = parseBrazilianNumber(countText);
    if (totalExpected === undefined || !Number.isInteger(totalExpected) || totalExpected < 0) {
      throw new Error('Emobi: contagem da busca ausente ou inválida');
    }

    // Rolagem dinâmica no contêiner com overflow para carregar todos os cards
    let lastCount = 0;
    let sameCountRounds = 0;

    while (sameCountRounds < 3) {
      const currentCount = await page.evaluate(
        () => document.querySelectorAll('.imovel-box-single').length
      );

      if (currentCount >= totalExpected) {
        break;
      }

      if (currentCount === lastCount) {
        sameCountRounds++;
      } else {
        sameCountRounds = 0;
        lastCount = currentCount;
      }

      await page.evaluate(() => {
        const container = document.querySelector('.clb-search-result-property');
        if (container) {
          container.scrollTop = container.scrollHeight;
          container.dispatchEvent(new Event('scroll'));
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const rawCards = parseSearch(await page.content(), page.url());
    const cards = uniqueBy(rawCards, card => card.code);
    if (cards.length !== totalExpected) {
      throw new Error(
        `Emobi: contagem divergente de imóveis únicos (${cards.length}/${totalExpected})`
      );
    }
    const listings: Apartamento[] = [];
    for (const card of cards) {
      const fallback = card.suites ? card.suites + 1 : 1;
      const banheiros = await this.fetchBanheiros(card.url, fallback);
      listings.push(createListing(this.name, card.code, { ...card.fields, banheiros }));
    }
    return listings;
  }
}

const emobiCrawler = new EmobiCrawler();

export default emobiCrawler;
