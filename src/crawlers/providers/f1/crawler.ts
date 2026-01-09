import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'node:https';
import type { CheerioAPI } from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { encodeFilters, filters } from './filter';

const getIconBoxNumber = (label: string, $: CheerioAPI): number => {
  const valueText = $('.elementor-widget-icon-box')
    .filter((_, el) => {
      const t = $(el).find('.elementor-icon-box-title').text().trim().toLowerCase();
      return t === label.toLowerCase();
    })
    .first()
    .find('.elementor-icon-box-description')
    .text()
    .trim();

  const cleaned = valueText.replace(',', '.').replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
};

export class F1Crawler extends BaseCrawler {
  baseURL = 'https://f1ciaimobiliaria.com.br/imoveis-para-alugar/';

  private readonly axiosConfig = {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 30000,
    httpsAgent: new https.Agent({ family: 4 }),
  };

  constructor() {
    super('f1');
  }

  protected async scrape(): Promise<Apartamento[]> {
    const url = `${this.baseURL}?${encodeFilters(filters)}`;
    const { data: html } = await axios.get<string>(url, this.axiosConfig);
    const $: CheerioAPI = cheerio.load(html);

    const listUrl = $('div.jet-engine-listing-overlay-wrap')
      .map((_, el) => {
        const $el = $(el);
        const href = $el.attr('data-url') ?? '';

        return href;
      })
      .get();

    const listAlugueis: Apartamento[] = [];

    for (const url of listUrl) {
      const { data: html } = await axios.get<string>(url, this.axiosConfig);
      const $: CheerioAPI = cheerio.load(html);
      const texto = $('h1.elementor-heading-title.elementor-size-default').text().trim();
      const id = texto.split('–').pop()?.trim() || '';
      const bairro = texto.split('no bairro')[1].split(',')[0].trim();

      const valor_aluguel = $('.elementor-element-7a5a988 .jet-listing-dynamic-field__content')
        .first()
        .text()
        .trim();

      const valor_total = $('.elementor-element-8c13aac .jet-listing-dynamic-field__content')
        .first()
        .text()
        .trim();

      listAlugueis.push({
        id: `${this.name}_${id}`,
        valor_aluguel: this.parseFloat(valor_aluguel),
        valor_total: this.parseFloat(valor_total),
        url_apartamento: url,
        bairro: bairro,
        tamanho: getIconBoxNumber('Área Total', $),
        quartos: getIconBoxNumber('Quartos', $),
        banheiros: getIconBoxNumber('Banheiros', $),
        garagem: getIconBoxNumber('Garagens', $),
        corretora: this.name,
      });
    }

    return listAlugueis;
  }
}

const f1Crawler = new F1Crawler();

export default f1Crawler;
