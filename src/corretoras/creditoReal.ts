import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as cheerio from 'cheerio';
import axios from 'axios';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { Tag } from '../app/types/tag';

interface CreditoReal {
  id: string;
  valor_aluguel: number;
  url_apartamento: string;
  valor_total: number;
  observacao: string;
  tag: Tag | '';
}

interface Filtros {
  valueType: boolean;
  imovelTypes: string[];
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
  cityState: 'Florianópolis_SC',
  finalValue: 4000,
  areaInitialValue: 75,
  parking: 1,
};

const toNumber = (text: string): number => {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

const getTextNumber = ($el: Cheerio<any>): number => toNumber($el.text().trim());

const encodeFilters = (f: Filtros): string => encodeURIComponent(JSON.stringify(f));
const CREDITO_REAL_OUTPUT_PATH = join(process.cwd(), 'src/data/credito_real_anuncio.json');

const index = async (): Promise<CreditoReal[]> => {
  const baseURL = 'https://www.creditoreal.com.br/alugueis/residencial?filters=';
  const url = `${baseURL}${encodeFilters(filtros)}&orderBy=2`;
  console.log(url);
  const { data: html } = await axios.get<string>(url);
  const $: CheerioAPI = cheerio.load(html);

  const listAlugueis: CreditoReal[] = $('#teste .bRuoBA a')
    .map((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') ?? '';
      const [, idFromHref = ''] = href.split('-cod-');
      const aluguel: CreditoReal = {
        id: idFromHref,
        valor_aluguel: getTextNumber($el.find('section > div > div > p[type="text.body"]')),
        valor_total: getTextNumber($el.find('section > div > div > label')),
        url_apartamento: `https://www.creditoreal.com.br${href}`,
        observacao: '',
        tag: '',
      };

      return aluguel;
    })
    .get();
  await writeFile(CREDITO_REAL_OUTPUT_PATH, JSON.stringify(listAlugueis, null, 2), 'utf-8');
  return listAlugueis;
};

export default index;
