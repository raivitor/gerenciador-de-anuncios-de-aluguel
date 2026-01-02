import * as cheerio from 'cheerio';
import axios from 'axios';
import type { CheerioAPI } from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { encodeFilters, filters } from './filters';

export class CreditoRealCrawler extends BaseCrawler {
  baseURL = 'https://www.creditoreal.com.br/alugueis/florianopolis-sc/apartamento-residencial';

  constructor() {
    super('creditoReal');
  }

  protected async scrape(): Promise<Apartamento[]> {
    let page = 1;
    let totalApartamentos = 0;
    const listAlugueis: Apartamento[] = [];

    while (true) {
      const url = `${this.baseURL}?${encodeFilters(filters)}&orderBy=2&page=${page}`;
      const { data: html } = await axios.get<string>(url);
      const $: CheerioAPI = cheerio.load(html);

      if (page === 1) {
        const totalText = $('h1.sc-8c367b3a-6.dowwpi').text().trim();
        totalApartamentos = this.toNumber(totalText);
        console.log(`creditoReal Total apartments found: ${totalApartamentos}`);
      }

      const pageItems: Apartamento[] = $('#teste .bRuoBA a')
        .map((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') ?? '';
          const [, idFromHref = ''] = href.split('-cod-');

          return {
            id: `${this.name}_${String(idFromHref)}`,
            valor_aluguel: this.getTextNumber(
              $el.find('section > div > div > p[type="text.body"]')
            ),
            valor_total: this.getTextNumber($el.find('section > div > div > label')),
            url_apartamento: href.startsWith('http')
              ? href
              : `https://www.creditoreal.com.br${href}`,
            corretora: this.name,
          } satisfies Apartamento;
        })
        .get();

      listAlugueis.push(...pageItems);

      if (listAlugueis.length >= totalApartamentos || pageItems.length === 0) {
        break;
      }
      page++;
    }

    for (const apartamento of listAlugueis) {
      const { data: html } = await axios.get<string>(apartamento.url_apartamento);
      const $: CheerioAPI = cheerio.load(html);

      const bairro = $('ul.sc-ce6dfd33-0 a[href*="/bairro/"]').first().text().trim();

      apartamento.bairro = bairro;

      const infoList = $('ul.sc-8f61197d-0.huQLXI p.sc-8c367b3a-1.jkcvKL')
        .map((_, el) => $(el).text().trim())
        .get();

      infoList.forEach((info: string) => {
        if (info.includes('m²')) apartamento.tamanho = this.toNumber(info);
        else if (info.includes('quarto')) apartamento.quartos = this.toNumber(info);
        else if (info.includes('banheiro')) apartamento.banheiros = this.toNumber(info);
        else if (info.includes('vaga')) apartamento.garagem = this.toNumber(info);
      });
    }

    return listAlugueis;
  }
}

const creditoRealCrawler = new CreditoRealCrawler();

export default creditoRealCrawler;
