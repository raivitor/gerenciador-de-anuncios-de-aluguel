import axios from 'axios';
import * as cheerio from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export const SEARCH_URL =
  'https://www.gorettimobiliaria.com/imoveis/para-alugar/apartamento/natal?quartos=2+&vagas=1+&area=45+&preco-de-locacao=0~3000';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

interface RawCardData {
  code: string;
  bairro: string;
  valorAluguel: number;
  tamanho: number;
  quartos: number;
  banheiros: number;
  garagem: number;
  urlApartamento: string;
}

export class GorettiCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('goretti');
    this.baseURL = baseURL;
  }

  private readonly axiosConfig = {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 30_000,
  };

  protected buildPageUrl(pageNumber: number): string {
    if (pageNumber <= 1) return this.baseURL;
    const url = new URL(this.baseURL);
    url.searchParams.set('pagina', String(pageNumber));
    return url.toString();
  }

  private parseArea(text: string): number {
    const match = text.match(/([\d]+(?:[.,]\d+)?)\s*m/i);
    if (!match) return 0;
    const val = parseFloat(match[1].replace(',', '.'));
    return Number.isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  private parsePrice(value: string | undefined): number {
    if (!value) return 0;
    const match = value.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i);
    const target = match ? match[1] : value;
    const cleaned = target.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const val = Number.parseFloat(cleaned);
    return Number.isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  private async fetchTotalValue(url: string, rentValue: number): Promise<number> {
    try {
      const response = await axios.get<string>(url, this.axiosConfig);
      const $ = cheerio.load(response.data);

      const totalRentText = $('.total-rent').text().trim();
      const totalRentParsed = this.parsePrice(totalRentText);
      if (totalRentParsed > 0) {
        return totalRentParsed;
      }

      let taxes = 0;
      $('.taxes .tax').each((_, tax) => {
        const text = $(tax).text().trim();
        // Evita somar indicadores como "Valor do m²"
        if (!text.toLowerCase().includes('m²')) {
          taxes += this.parsePrice(text);
        }
      });

      if (taxes > 0) {
        return Math.round((rentValue + taxes) * 100) / 100;
      }
    } catch (error) {
      console.warn(`[Goretti] Falha ao obter detalhes de ${url}:`, error);
    }
    return rentValue;
  }

  protected async scrape(): Promise<Apartamento[]> {
    const rawCards: RawCardData[] = [];
    let currentPage = 1;

    while (true) {
      const pageUrl = this.buildPageUrl(currentPage);
      const response = await axios.get<string>(pageUrl, this.axiosConfig);
      const $ = cheerio.load(response.data);

      const cardElements = $('a.card-with-buttons').toArray();
      if (cardElements.length === 0) break;

      for (const el of cardElements) {
        const $el = $(el);
        const code = $el.find('.card-with-buttons__code').text().trim();
        if (!code) continue;

        const heading = $el.find('.card-with-buttons__heading').text().trim();
        const bairro = heading.split('-')[0]?.trim() || '';

        let valorAluguel = 0;
        $el.find('.card-with-buttons__value-container').each((_, vc) => {
          const title = $(vc).find('.card-with-buttons__value-title').text().trim().toLowerCase();
          if (title.includes('aluguel') || title.includes('loca')) {
            valorAluguel = this.parsePrice($(vc).find('.card-with-buttons__value').text());
          }
        });

        if (!valorAluguel) {
          valorAluguel = this.parsePrice($el.find('.card-with-buttons__value').text());
        }

        let tamanho = 0;
        let quartos = 0;
        let banheiros = 0;
        let garagem = 0;

        $el.find('ul li').each((_, li) => {
          const text = $(li).text().trim().toLowerCase();
          if (text.includes('m²')) {
            tamanho = this.parseArea(text);
          } else if (text.includes('quarto')) {
            quartos = this.toNumber(text);
          } else if (text.includes('banheiro')) {
            banheiros = this.toNumber(text);
          } else if (text.includes('vaga')) {
            garagem = this.toNumber(text);
          }
        });

        const href = $el.attr('href') || '';
        const urlApartamento = href.startsWith('http')
          ? href
          : `https://www.gorettimobiliaria.com${href}`;

        rawCards.push({
          code,
          bairro,
          valorAluguel,
          tamanho,
          quartos,
          banheiros,
          garagem,
          urlApartamento,
        });
      }

      const hasNextPage =
        $('.pagination-table .btn-next, a.btn-next, .pagination .btn-next').length > 0;
      if (!hasNextPage) break;

      currentPage++;
    }

    // Deduplicação por código
    const uniqueCards = Array.from(new Map(rawCards.map(c => [c.code, c])).values());

    // Enriquecimento com valor total (pacote de locação/encargos)
    const listings: Apartamento[] = await Promise.all(
      uniqueCards.map(async card => {
        const valorTotal = await this.fetchTotalValue(card.urlApartamento, card.valorAluguel);

        return {
          id: `${this.name}_${card.code}`,
          valor_aluguel: card.valorAluguel,
          valor_total: valorTotal,
          url_apartamento: card.urlApartamento,
          bairro: card.bairro,
          tamanho: card.tamanho,
          quartos: card.quartos,
          banheiros: card.banheiros,
          garagem: card.garagem,
          corretora: this.name,
        };
      })
    );

    return listings;
  }
}

const gorettiCrawler = new GorettiCrawler();

export default gorettiCrawler;
