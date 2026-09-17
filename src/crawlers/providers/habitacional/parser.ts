import { load } from 'cheerio';

import type { Apartamento } from '@/crawlers/core/types';

export interface SearchListing {
  code: string;
  url: string;
  neighborhood?: string;
}

const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();

export function parseBrazilianNumber(value: string): number | undefined {
  const match = value.replace(/\u00a0/g, ' ').match(/\d[\d.]*(?:,\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function codeFromUrl(url: string): string {
  const code = new URL(url).pathname.match(/-([A-Z]{2,}\d+)\/?$/i)?.[1];
  if (!code) throw new Error(`Habitacional: código ausente em ${url}`);
  return code.toUpperCase();
}

export function parseSearch(html: string, pageUrl: string): { listings: SearchListing[]; pages: number } {
  const $ = load(html);
  const listings = $('a[href^="/imovel/"]')
    .toArray()
    .map(element => {
      const href = $(element).attr('href');
      if (!href) throw new Error('Habitacional: link de imóvel sem href');
      const url = new URL(href, pageUrl);
      if (url.origin !== new URL(pageUrl).origin) throw new Error('Habitacional: link externo inesperado');
      url.search = '';
      url.hash = '';
      const location = $(element)
        .find('span')
        .toArray()
        .map(span => normalize($(span).text()))
        .find(value => /,\s*[^-]+\s*-\s*[A-Z]{2}$/.test(value));
      const neighborhood = location?.match(/^([^,]+),/)?.[1].trim();
      return { code: codeFromUrl(url.toString()), url: url.toString(), neighborhood };
    });

  const uniquePages = $('button')
    .toArray()
    .map(element => Number($(element).text().trim()))
    .filter(page => Number.isInteger(page) && page > 0);
  const pages = uniquePages.length ? Math.max(...uniquePages) : 1;
  const body = normalize($('body').text()).toLowerCase();
  if (!listings.length && !/0\s+im[oó]veis|nenhum im[oó]vel|não encontr/.test(body)) {
    throw new Error(`Habitacional: busca sem anúncios em ${pageUrl}`);
  }
  return { listings, pages };
}

function findCharacteristic($: ReturnType<typeof load>, label: RegExp): number | undefined {
  const text = $('span')
    .toArray()
    .map(element => normalize($(element).text()))
    .find(value => label.test(value));
  return text ? parseBrazilianNumber(text) : undefined;
}

export function parseDetail(html: string, listing: SearchListing): Apartamento | undefined {
  const $ = load(html);
  const body = normalize($('body').text());
  if (/carregando\.\.\.$/i.test(body) || !body.includes(`Cód: ${listing.code}`)) {
    throw new Error(`Habitacional: ficha incompleta de ${listing.code}`);
  }

  const rentLabel = $('section span')
    .toArray()
    .find(element => normalize($(element).text()) === 'Valor aluguel');
  if (!rentLabel) throw new Error(`Habitacional: aluguel ausente em ${listing.code}`);
  const rent = parseBrazilianNumber($(rentLabel).next().text());
  if (rent === undefined || rent <= 0) return undefined;

  const charges = new Map<string, number>();
  const chargeContainer = $(rentLabel).parent().parent();
  chargeContainer.find('div').each((_, element) => {
    const label = normalize($(element).find('div.flex-1 span').first().text());
    const value = normalize($(element).children('span').last().text());
    if (!label || !/^(condomínio|condominio|iptu)$/i.test(label)) return;
    const amount = parseBrazilianNumber(value);
    if (amount !== undefined) charges.set(label.toLowerCase(), amount);
  });

  const area = findCharacteristic($, /^Área Privativa\s+/i);
  const quartos = findCharacteristic($, /^\d+\s+Dormitórios?$/i);
  const banheiros = findCharacteristic($, /^\d+\s+Banheiros?$/i);
  const garagem = findCharacteristic($, /^\d+\s+Vagas?$/i);
  if (area === undefined || quartos === undefined || banheiros === undefined || garagem === undefined) {
    throw new Error(`Habitacional: características ausentes em ${listing.code}`);
  }

  const total = Math.round((rent + [...charges.values()].reduce((sum, amount) => sum + amount, 0)) * 100) / 100;
  if (total <= 0 || total > 3000 || area < 45 || quartos < 2 || garagem < 1) return undefined;
  return {
    id: `habitacional_${listing.code}`,
    valor_aluguel: rent,
    valor_total: total,
    url_apartamento: listing.url,
    bairro: listing.neighborhood,
    tamanho: area,
    quartos,
    banheiros,
    garagem,
    corretora: 'habitacional',
  };
}
