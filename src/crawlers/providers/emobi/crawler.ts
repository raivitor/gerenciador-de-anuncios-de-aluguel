import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Page } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export const SEARCH_URL =
  'https://emobiimobiliaria.com.br/aluguel/apartamento/natal/2-3-dormitorios/1-banheiro/com-vaga/';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

interface RawCardData {
  code: string;
  url: string;
  bairro: string;
  valorAluguelText: string;
  valorTotalText: string;
  condominioText?: string;
  iptuText?: string;
  tamanho: number;
  quartos: number;
  garagem: number;
  suites: number;
}

export class EmobiCrawler extends PuppeteerCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('emobi');
    this.baseURL = baseURL;
  }

  private async fetchBanheiros(url: string, fallback: number): Promise<number> {
    try {
      const response = await axios.get<string>(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10_000,
      });

      const $ = cheerio.load(response.data);
      const amenitiesText = $('.property-amenities').text();
      const match = amenitiesText.match(/(\d+)\s*Banheiro/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    } catch (error) {
      console.warn(`[Emobi] Falha ao obter detalhes de banheiros para ${url}:`, error);
    }
    return fallback;
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    await page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('.imovel-box-single', { timeout: 30_000 }).catch(() => null);

    const totalExpected = await page.evaluate(() => {
      const text = document.querySelector('p.result-totals-phrase')?.textContent || '';
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    // Rolagem dinâmica no contêiner com overflow para carregar todos os cards
    let lastCount = 0;
    let sameCountRounds = 0;

    while (sameCountRounds < 3) {
      const currentCount = await page.evaluate(
        () => document.querySelectorAll('.imovel-box-single').length
      );

      if (currentCount === 0 && totalExpected === 0) {
        break;
      }

      if (totalExpected > 0 && currentCount >= totalExpected) {
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

    const rawCards: RawCardData[] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLDivElement>('.imovel-box-single'));

      return cards.map(card => {
        const codeBtn = card.querySelector('button[data-codigo]');
        let code = codeBtn?.getAttribute('data-codigo') || '';
        const linkEl = card.querySelector<HTMLAnchorElement>(
          '.titulo-anuncio a, a[href*="/imovel/"]'
        );
        const url = linkEl?.href || '';
        if (!code && url) {
          const match = url.match(/\/imovel\/(\d+)/);
          if (match) code = match[1];
        }

        const streetAddress =
          card.querySelector<HTMLElement>('h3[itemprop="streetAddress"]')?.innerText?.trim() || '';

        // Formato típico: "Rua ..., Bairro - Natal/Rn" ou "Bairro - Natal/Rn"
        let bairro = '';
        const beforeCity = streetAddress.split(/-\s*Natal/i)[0] || '';
        const parts = beforeCity.split(',');
        bairro = parts[parts.length - 1]?.trim() || '';

        const aluguelEl =
          card.querySelector('.thumb-price') || card.querySelector('.item-price-rent');
        const valorAluguelText = aluguelEl?.textContent?.trim() || '';

        const totalEl = card.querySelector(
          '.valor-total-grid-imovel b, #valor-total-grid-imovel b'
        );
        const valorTotalText = totalEl?.textContent?.trim() || '';

        let condominioText = '';
        let iptuText = '';
        const condIptuContainer = card.querySelector('.div-cond-iptu');
        if (condIptuContainer) {
          const text = condIptuContainer.textContent || '';
          const condMatch = text.match(/Condom[íi]nio\s*(R\$\s*[\d.,]+)/i);
          if (condMatch) condominioText = condMatch[1];
          const iptuMatch = text.match(/IPTU\s*(R\$\s*[\d.,]+)/i);
          if (iptuMatch) iptuText = iptuMatch[1];
        }

        let tamanho = 0;
        let quartos = 0;
        let garagem = 0;
        let suites = 0;

        const amenityDivs = Array.from(
          card.querySelectorAll<HTMLDivElement>('.property-amenities.amenities-main > div')
        );

        for (const div of amenityDivs) {
          const label = div.querySelector('small')?.textContent?.trim().toLowerCase() || '';
          const valText = div.querySelector('span')?.textContent?.trim() || '';
          const num = parseInt(valText.replace(/[^\d]/g, ''), 10) || 0;

          if (label.includes('privat')) {
            tamanho = num;
          } else if (label.includes('quarto')) {
            quartos = num;
          } else if (label.includes('vaga')) {
            garagem = num;
          } else if (label.includes('suí') || label.includes('sui')) {
            suites = num;
          }
        }

        return {
          code,
          url,
          bairro,
          valorAluguelText,
          valorTotalText,
          condominioText,
          iptuText,
          tamanho,
          quartos,
          garagem,
          suites,
        };
      });
    });

    // Deduplicação por código do imóvel para evitar duplicidade de requisições ou registros
    const uniqueCards = Array.from(new Map(rawCards.map(c => [c.code, c])).values());

    // Enriquecer dados dos apartamentos e obter quantidade exata de banheiros
    const listings: Apartamento[] = await Promise.all(
      uniqueCards.map(async card => {
        const valorAluguel = this.parseFloat(card.valorAluguelText);
        let valorTotal = card.valorTotalText ? this.parseFloat(card.valorTotalText) : 0;

        if (!valorTotal) {
          const cond = card.condominioText ? this.parseFloat(card.condominioText) : 0;
          const iptu = card.iptuText ? this.parseFloat(card.iptuText) : 0;
          valorTotal = valorAluguel + cond + iptu;
        }

        const fallbackBanheiros = card.suites ? card.suites + 1 : 1;
        const banheiros = card.url
          ? await this.fetchBanheiros(card.url, fallbackBanheiros)
          : fallbackBanheiros;

        return {
          id: `${this.name}_${card.code}`,
          valor_aluguel: valorAluguel,
          valor_total: valorTotal,
          url_apartamento: card.url,
          bairro: card.bairro,
          tamanho: card.tamanho,
          quartos: card.quartos,
          banheiros,
          garagem: card.garagem,
          corretora: this.name,
        };
      })
    );

    return listings;
  }
}

const emobiCrawler = new EmobiCrawler();

export default emobiCrawler;
