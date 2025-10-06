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

const getTextNumber = ($el: Cheerio<any>): number => toNumber($el.text().trim());

export class RegenteCrawler extends BaseCrawler {
  baseURL = 'https://regenteimoveis.com.br/pesquisar-imovel';

  constructor() {
    super('regente');
  }

  protected async scrape(): Promise<Apartamento[]> {
    const url = `${this.baseURL}/?${encodeFilters(filters)}`;
    console.log('Fetching URL:', url);
    const { data: html } = await axios.get<string>(url);
    const $: CheerioAPI = cheerio.load(html);

    const listAlugueis: Apartamento[] = $('div#property')
      .map((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') ?? '';
        const [, idFromHref = ''] = href.split('-cod-');

        return {
          id: `${this.name}_${String(idFromHref)}`,
          valor_aluguel: getTextNumber($el.find('section > div > div > p[type="text.body"]')),
          valor_total: getTextNumber($el.find('section > div > div > label')),
          url_apartamento: `https://www.creditoreal.com.br${href}`,
          corretora: this.name,
        } satisfies Apartamento;
      })
      .get();

    for (const apartamento of listAlugueis) {
      const { data: html } = await axios.get<string>(apartamento.url_apartamento);
      const $: CheerioAPI = cheerio.load(html);

      const bairro = $('ul.sc-ce6dfd33-0 a[href*="/bairro/"]').first().text().trim();

      apartamento.bairro = bairro;

      const infoList = $('ul.sc-8f61197d-0.huQLXI p.sc-8c367b3a-1.jkcvKL')
        .map((_, el) => $(el).text().trim())
        .get();

      infoList.forEach((info: string) => {
        if (info.includes('m²')) apartamento.tamanho = toNumber(info);
        else if (info.includes('quarto')) apartamento.quartos = toNumber(info);
        else if (info.includes('banheiro')) apartamento.banheiros = toNumber(info);
        else if (info.includes('vaga')) apartamento.garagem = toNumber(info);
      });
    }
    console.log(`Found ${listAlugueis.length} listings from ${this.name}`);
    return listAlugueis;
  }
}

const regenteCrawler = new RegenteCrawler();

// Função para executar o crawler diretamente
async function runCrawler() {
  console.log('Iniciando crawler da Regente...');
  try {
    const apartamentos = await regenteCrawler.run();
    console.log(`Encontrados ${apartamentos.length} apartamentos:`);
    console.log(JSON.stringify(apartamentos, null, 2));
  } catch (error) {
    console.error('Erro ao executar crawler:', error);
  }
}

// Se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runCrawler();
}

export default regenteCrawler;
