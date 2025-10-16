import * as cheerio from 'cheerio';
import axios from 'axios';
import type { CheerioAPI, Cheerio } from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { encodeFilters, filters } from './filters';

const toNumber = (text: string): number => {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

// Extrai valor monetário brasileiro (ex: R$ 3.128,18 -> 3128.18)
const toMoney = (text: string): number => {
  const clean = text
    .replace(/[^\d,\.]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = parseFloat(clean);
  return Number.isNaN(n) ? 0 : n;
};

const getTextNumber = ($el: Cheerio<any>): number => toNumber($el.text().trim());

export class QuadraCrawler extends BaseCrawler {
  baseURL = 'https://www.quadraimobiliaria.com.br/imoveis/para-alugar/apartamento/florianopolis';

  constructor() {
    super('quadra');
  }

  protected async scrape(): Promise<Apartamento[]> {
    const bairros = filters.neighborhoods.map(b => b.toLowerCase().replace(/\s+/g, '-')).join('+');
    const url = `${this.baseURL}/${bairros}?vagas=${filters.parking}+&area=${filters.areaInitialValue}+&preco-de-locacao=0~${filters.finalValue}`;
    console.log('URL Quadra:', url);
    const { data: html } = await axios.get<string>(url);
    const $: CheerioAPI = cheerio.load(html);

    const listAlugueis: Apartamento[] = $('div.digital-result.digital-result__grid a')
      .map((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') ?? '';

        let tamanho = 0;
        let quartos = 0;
        let banheiros = 0;
        let garagem = 0;
        $el.find('ul > li').each((i, li) => {
          const text = $(li).text();
          if (text.includes('m²')) tamanho = toNumber(text);
          if (text.includes('Quartos')) quartos = toNumber(text);
          if (text.includes('Banheiro')) banheiros = toNumber(text);
          if (text.includes('Vaga')) garagem = toNumber(text);
        });

        return {
          id: $el.find('.card-with-buttons__code').text().trim(),
          valor_aluguel: this.parseFloat($el.find('p.card-with-buttons__value').text()),
          valor_total: 0,
          url_apartamento: `https://www.quadraimobiliaria.com.br${href}`,
          bairro: $el.find('.card-with-buttons__heading').text().split('-')[0]?.trim() ?? '',
          tamanho,
          quartos,
          banheiros,
          garagem,
          corretora: this.name,
        };
      })
      .get();

    for (const apartamento of listAlugueis) {
      const { data: html } = await axios.get<string>(apartamento.url_apartamento);
      const $: CheerioAPI = cheerio.load(html);

      let valor_total = 0;
      $('li.knl_panels-list').each((_, el) => {
        const text = $(el).text();
        if (text.includes('Pacote de locação')) {
          valor_total = toMoney(text.split('Pacote de locação')[1] || '0');
        }
      });
      apartamento.valor_total = valor_total;
    }

    return listAlugueis;
  }
}

const quadraCrawler = new QuadraCrawler();

export default quadraCrawler;
