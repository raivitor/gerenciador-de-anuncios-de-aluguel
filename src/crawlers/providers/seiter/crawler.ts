import axios from 'axios';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { buildSeiterURL, filters } from './filters';

interface SeiterRuntimeConfig {
  domain: string;
  sessionId: string;
  urlRoot: string;
}

interface SeiterSearchResponse {
  html?: string;
}

const SEITER_DEFAULT_CITY_ID = '8452';
const SEITER_DEFAULT_PROPERTY_TYPE_ID = '5';
const SEITER_SEARCH_MODE = 'ModoListaDetalhada';

const extractBetween = (source: string, startMarker: string, endMarker: string): string => {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Missing marker: ${startMarker}`);
  }

  const contentStart = start + startMarker.length;
  const end = source.indexOf(endMarker, contentStart);
  if (end === -1) {
    throw new Error(`Missing marker: ${endMarker}`);
  }

  return source.slice(contentStart, end);
};

const parseCardNumber = (text: string): number => {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

const extractReference = (text: string): string | undefined => {
  const match = text.match(/\(([A-Z]{2}\d+)\)/i);
  return match?.[1]?.toUpperCase();
};

const getFirstText = ($root: CheerioAPI, selector: string): string =>
  $root(selector).first().text().trim();

export class SeiterCrawler extends BaseCrawler {
  baseURL = 'https://seiterimobiliaria.com.br';

  constructor() {
    super('seiter');
  }

  private extractRuntimeConfig(html: string): SeiterRuntimeConfig {
    const singleQuote = String.fromCharCode(39);
    const urlRoot = extractBetween(html, `var $url = ${singleQuote}`, `${singleQuote};`);
    const configJson = extractBetween(html, 'var $CONFIG = ', '</script>').trim().replace(/;$/, '');
    const config = JSON.parse(configJson) as { DOMAIN: string; SESSION_ID: string };

    if (!config.DOMAIN || !config.SESSION_ID) {
      throw new Error('Missing Seiter runtime config');
    }

    return {
      domain: config.DOMAIN,
      sessionId: config.SESSION_ID,
      urlRoot,
    };
  }

  private appendPayloadEntries(
    entries: Array<[string, string]>,
    prefix: string,
    value: string | number | boolean | null | undefined | Record<string, unknown> | string[]
  ): void {
    if (value === null || value === undefined) {
      entries.push([prefix, '']);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.appendPayloadEntries(entries, `${prefix}[]`, item);
      }
      return;
    }

    if (typeof value === 'object') {
      for (const [key, nestedValue] of Object.entries(value)) {
        this.appendPayloadEntries(entries, `${prefix}[${key}]`, nestedValue as never);
      }
      return;
    }

    entries.push([prefix, String(value)]);
  }

  private buildSearchPayload(config: SeiterRuntimeConfig): URLSearchParams {
    const formData = {
      searchExtra: '[]',
      finalidade: 'rent',
      tipo: { [SEITER_DEFAULT_PROPERTY_TYPE_ID]: SEITER_DEFAULT_PROPERTY_TYPE_ID },
      cidade: [SEITER_DEFAULT_CITY_ID],
      dormitorio: String(filters.bedrooms),
      medida: {
        MIN: String(this.minSize),
        MAX: '',
      },
      valor: {
        MIN: '',
        MAX: String(this.maxValue),
      },
    };

    const payload = {
      SESSION_ID: config.sessionId,
      DOMAIN: config.domain,
      url: config.urlRoot,
      SHOW_SEARCH: true,
      FORM_DATA: formData,
      MODO: SEITER_SEARCH_MODE,
      clear: false,
      searchMap: 0,
      GRID_ONLY: 0,
      LIMIT: 0,
    };

    const entries: Array<[string, string]> = [];
    for (const [key, value] of Object.entries(payload)) {
      this.appendPayloadEntries(entries, key, value as never);
    }

    return new URLSearchParams(entries);
  }

  private parseListingCard($card: cheerio.Cheerio<any>): Apartamento {
    const $ = cheerio.load($card.html() ?? '');
    const reference = extractReference(getFirstText($, '.ImovelId .reference'));
    const buildingId = getFirstText($, '.ImovelId .buildingId');
    const visibleId = getFirstText($, '.ImovelId .id');
    const id = reference || `${this.name}_${buildingId || visibleId}`;

    const rawHref =
      $('a.Image').first().attr('href') ||
      $('a.Title').first().attr('href') ||
      $('a').first().attr('href') ||
      '';
    const href = rawHref.startsWith('http') ? rawHref : `${this.baseURL}${rawHref}`;

    const valorAluguel = this.parseFloat(
      getFirstText($, 'h5.ImovelValor .value') || getFirstText($, 'h5.ImovelValor .Valor')
    );
    const valorIptu = this.parseFloat(
      getFirstText($, 'h5.buildingTaxValue .value') || getFirstText($, 'h5.buildingTaxValue .Valor')
    );
    const valorCondominio = this.parseFloat(
      getFirstText($, 'h5.buildingCondominiumValue .value') ||
        getFirstText($, 'h5.buildingCondominiumValue .Valor')
    );
    const valorPacote = this.parseFloat(
      getFirstText($, 'h5.totalPack .value') || getFirstText($, 'h5.totalPack .Valor')
    );

    const summaryMap = new Map<string, string>();
    $('.ResumoItem').each((_, el) => {
      const $item = $(el);
      const summaryClass = ($item.attr('class') ?? '')
        .split(/\s+/)
        .find(className => className && className !== 'ResumoItem');

      if (!summaryClass) return;

      summaryMap.set(summaryClass, $item.find('.val').text().trim());
    });

    return {
      id,
      bairro: getFirstText($, '.Endereco .Bairro') || getFirstText($, '.Endereco'),
      quartos: parseCardNumber(summaryMap.get('BEDROOM') ?? ''),
      banheiros: parseCardNumber(summaryMap.get('BATHROOM') ?? ''),
      garagem: parseCardNumber(summaryMap.get('GARAGE') ?? ''),
      tamanho: parseCardNumber(summaryMap.get('AREA_USEFUL') ?? summaryMap.get('AREA_TOTAL') ?? ''),
      valor_aluguel: valorAluguel,
      valor_total: valorPacote || valorAluguel + valorIptu + valorCondominio,
      url_apartamento: href,
      corretora: this.name,
    } satisfies Apartamento;
  }

  protected async scrape(): Promise<Apartamento[]> {
    const url = buildSeiterURL(this.baseURL, {
      ...filters,
      maxValue: this.maxValue,
      minSize: this.minSize,
    });
    const { data: searchPageHtml } = await axios.get<string>(url);
    const runtimeConfig = this.extractRuntimeConfig(searchPageHtml);
    const payload = this.buildSearchPayload(runtimeConfig);

    const { data } = await axios.post<SeiterSearchResponse>(
      `${this.baseURL}/busca`,
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      }
    );

    if (!data.html) {
      throw new Error('Seiter search did not return listing html');
    }

    const $: CheerioAPI = cheerio.load(data.html);
    if (!$('.buildingSearchPage').length) {
      throw new Error('Seiter search response missing buildingSearchPage');
    }

    const listAlugueis = $('.LI_Imovel')
      .map((_, el) => this.parseListingCard($(el)))
      .get()
      .filter(apartamento => (apartamento.garagem ?? 0) >= filters.parking);

    return listAlugueis;
  }
}

const seiterCrawler = new SeiterCrawler();

export default seiterCrawler;
