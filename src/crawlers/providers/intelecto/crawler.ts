import type { Page } from 'puppeteer';
import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { collectPages, pageUrl } from '@/crawlers/shared/pagination';
import {
  CARD_SELECTOR,
  COUNT_SELECTOR,
  DETAIL_SELECTOR,
  meetsLimits,
  parseDetail,
  parseSearch,
  type ListingCard,
} from './parser';

// O site espera strings JSON nos parâmetros, inclusive nas listas separadas por vírgulas.
export const SEARCH_URL =
  'https://www.intelectoimobiliaria.com/alugar/apartamento/com-2-quartos?' +
  new URLSearchParams({
    transacao: JSON.stringify('alugar'),
    tipos: JSON.stringify('apartamento'),
    quartos: JSON.stringify('2,3'),
    garagens: JSON.stringify('1,2'),
  });

export function searchPageUrl(searchUrl: string, pageNumber: number): string {
  return pageUrl(searchUrl, 'pagina', pageNumber);
}

export class IntelectoCrawler extends PuppeteerCrawler {
  baseURL = 'https://www.intelectoimobiliaria.com';
  private readonly searchUrl: string;

  constructor(searchUrl = SEARCH_URL) {
    super('intelecto');
    this.searchUrl = searchUrl;
  }

  protected async navigate(page: Page, url: string): Promise<void> {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    if (!response?.ok()) throw new Error(`Intelecto: HTTP ${response?.status()} em ${url}`);
    if (new URL(page.url()).pathname !== new URL(url).pathname) {
      throw new Error(`Intelecto: redirecionamento inesperado em ${url}`);
    }
  }

  protected async readSearchPage(page: Page, pageNumber: number) {
    const url = searchPageUrl(this.searchUrl, pageNumber);
    await this.navigate(page, url);
    await page.waitForFunction(
      (countSelector, cardSelector) => {
        const text = document.querySelector(countSelector)?.textContent ?? '';
        return (
          /\d[\d.]*\s+resultados?/i.test(text) &&
          (document.querySelector(cardSelector) ||
            /nenhum|não encontr|0 imóveis/i.test(document.body.innerText))
        );
      },
      { timeout: 30_000 },
      COUNT_SELECTOR,
      CARD_SELECTOR
    );

    let result = parseSearch(await page.content(), url);
    // São 32 anúncios por página, renderizados em blocos de 8 ao rolar.
    const expected = Math.min(32, result.total - (pageNumber - 1) * 32);
    while (result.cards.length < expected) {
      const previousCount = result.cards.length;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(
        (selector, count) => document.querySelectorAll(selector).length > count,
        { timeout: 30_000 },
        CARD_SELECTOR,
        previousCount
      );
      result = parseSearch(await page.content(), url);
    }
    return result;
  }

  protected async readDetail(page: Page, card: ListingCard): Promise<Apartamento | undefined> {
    await this.navigate(page, card.url);
    await page.waitForSelector(`${DETAIL_SELECTOR} [class*="property-values_wrapper"]`, {
      timeout: 30_000,
    });
    // Preço, cabeçalho, características e descrição chegam em blocos independentes.
    await page.waitForFunction(
      selector => {
        const head = document.querySelector(selector);
        const description = document.querySelector('.DescriptionSection');
        return (
          head?.querySelector('h1') &&
          description &&
          !head.querySelector('[class*="component-skeleton_"]') &&
          !description.querySelector('[class*="component-skeleton_"]')
        );
      },
      { timeout: 30_000 },
      DETAIL_SELECTOR
    );
    return parseDetail(await page.content(), card);
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    const cards = await collectPages(
      this.name,
      async pageNumber => {
        const result = await this.readSearchPage(page, pageNumber);
        if (!result.total && pageNumber !== 1) {
          throw new Error('Intelecto: busca esvaziou durante a paginação');
        }
        return { items: result.cards, hasNext: result.hasNext };
      },
      card => card.code
    );

    const listings: Apartamento[] = [];
    for (const card of cards) {
      if (card.type.toLowerCase() !== 'apartamento') continue;
      const listing = await this.readDetail(page, card);
      if (listing && meetsLimits(listing, this.minSize, this.maxValue)) listings.push(listing);
    }
    return listings;
  }
}

const intelectoCrawler = new IntelectoCrawler();

export default intelectoCrawler;
