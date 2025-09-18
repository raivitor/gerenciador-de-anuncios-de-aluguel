import * as cheerio from 'cheerio';
import axios from 'axios';
import type { CheerioAPI, Cheerio } from 'cheerio';

import { BaseCrawler, type RentalListing } from './crawler';

interface Filtros {
  valueType: boolean;
  imovelTypes: string[];
  neighborhoods: string[];
  cityState: string;
  finalValue: number;
  areaInitialValue: number;
  parking: number;
}

const filtros: Filtros = {
  valueType: true,
  imovelTypes: [
    'Apartamento Garden',
    'Cobertura',
    'Casa em Condomínio',
    'Casa Geminada',
    'Casa Sobrado',
    'Apartamento',
  ],
  neighborhoods: [
    'Agronômica',
    'Carvoeira',
    'Córrego Grande',
    'Itacorubi',
    'João Paulo',
    'Monte Verde',
    'Pantanal',
    'Santa Mônica',
    'Trindade',
    'Parque São Jorge',
  ],
  cityState: 'Florianópolis_SC',
  finalValue: 4000,
  areaInitialValue: 70,
  parking: 1,
};

const toNumber = (text: string): number => {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

const getTextNumber = ($el: Cheerio<any>): number => toNumber($el.text().trim());

const encodeFilters = (f: Filtros): string => encodeURIComponent(JSON.stringify(f));

export class CreditoRealCrawler extends BaseCrawler {
  constructor() {
    super('creditoReal', 'credito_real_anuncio.json');
  }

  protected async scrape(): Promise<RentalListing[]> {
    const baseURL = 'https://www.creditoreal.com.br/alugueis/residencial?filters=';
    const url = `${baseURL}${encodeFilters(filtros)}&orderBy=2`;

    const { data: html } = await axios.get<string>(url);
    const $: CheerioAPI = cheerio.load(html);

    const listAlugueis: RentalListing[] = $('#teste .bRuoBA a')
      .map((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') ?? '';
        const [, idFromHref = ''] = href.split('-cod-');

        return {
          id: idFromHref,
          valor_aluguel: getTextNumber($el.find('section > div > div > p[type="text.body"]')),
          valor_total: getTextNumber($el.find('section > div > div > label')),
          url_apartamento: `https://www.creditoreal.com.br${href}`,
          observacao: '',
        };
      })
      .get();

    return listAlugueis;
  }
}

const creditoRealCrawler = new CreditoRealCrawler();

export default creditoRealCrawler;
