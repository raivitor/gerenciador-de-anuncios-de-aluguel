import * as cheerio from 'cheerio';
import axios from 'axios';
import type { CheerioAPI, Cheerio } from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { buildSeiterURL, filters } from './filters';

const toNumber = (text: string): number => {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

export class SeiterCrawler extends BaseCrawler {
  baseURL = 'https://www.seiterimobiliaria.com/alugar/sc/florianopolis';

  constructor() {
    super('seiter');
  }

  protected async scrape(): Promise<Apartamento[]> {
    const url = buildSeiterURL(this.baseURL, filters);
    const { data: html } = await axios.get<string>(url);
    const $: CheerioAPI = cheerio.load(html);

    const listAlugueis: Apartamento[] = $('div#lista.todos_imoveis a')
      .map((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') ?? '';
        const id = $el.find('div.referencia span').text().trim();
        const detalhes = $el.find('div.detalhes div.detalhe');

        let quartos = 0,
          banheiros = 0,
          garagem = 0,
          tamanho = 0,
          valor_aluguel = 0,
          valor_total = 0;
        detalhes.each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          if (text.includes('dormitório')) {
            quartos = toNumber($el.find('span').first().text());
          } else if (text.includes('suíte')) {
            banheiros = 1 + toNumber($el.find('span').first().text());
          } else if (text.includes('vaga')) {
            garagem = toNumber($el.find('span').first().text());
          } else if (text.includes('útil')) {
            const spans = $el.find('span');
            tamanho = toNumber(
              spans
                .eq(spans.length - 2)
                .text()
                .split('.')[0]
            );
          }
        });

        $el.find('div.area_soma > div').each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();

          if (text.includes('Aluguel')) {
            valor_aluguel = this.parseFloat($el.find('span.texto_valor').text());
          } else if (text.includes('Total')) {
            valor_total = this.parseFloat($el.find('div.texto_valor b').text());
          }
        });

        return {
          id,
          bairro: $el.find('h4.localizacao span').text().split(' - ')[0].trim(),
          quartos,
          banheiros,
          garagem,
          tamanho,
          valor_aluguel,
          valor_total,
          url_apartamento: `https://www.seiterimobiliaria.com${href}`,
          corretora: this.name,
        } satisfies Apartamento;
      })
      .get();

    return listAlugueis;
  }
}

const seiterCrawler = new SeiterCrawler();

export default seiterCrawler;
