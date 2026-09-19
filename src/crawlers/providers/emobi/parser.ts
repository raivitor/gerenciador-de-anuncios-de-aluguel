import { load } from 'cheerio';

import type { Apartamento } from '@/crawlers/core/types';
import { resolveListingUrl, type ListingReference } from '@/crawlers/shared/listings';
import {
  normalizeText,
  parseArea,
  parseBrazilianNumber,
  parsePrice,
  roundMoney,
} from '@/crawlers/shared/numbers';

export interface EmobiCard extends ListingReference {
  suites: number;
  fields: Omit<Apartamento, 'id' | 'corretora' | 'banheiros'>;
}

export function parseSearch(html: string, pageUrl: string): EmobiCard[] {
  const $ = load(html);
  return $('.imovel-box-single').toArray().map(element => {
    const card = $(element);
    const href = card.find('.titulo-anuncio a, a[href*="/imovel/"]').first().attr('href');
    const url = resolveListingUrl(href ?? '', pageUrl);
    const code = card.find('button[data-codigo]').attr('data-codigo') ||
      new URL(url).pathname.match(/\/imovel\/(\d+)/)?.[1];
    if (!code?.trim()) throw new Error(`Emobi: código ausente em ${url}`);

    const address = card.find('h3[itemprop="streetAddress"]').text().trim();
    const bairro = address.split(/-\s*Natal/i)[0].split(',').pop()?.trim() ?? '';
    const rentText = card.find('.thumb-price').first().text() ||
      card.find('.item-price-rent').first().text();
    const rent = parsePrice(rentText) ?? 0;
    const totalText = card.find('.valor-total-grid-imovel b, #valor-total-grid-imovel b')
      .first().text();
    const publishedTotal = parsePrice(totalText);
    const charges = card.find('.div-cond-iptu').text();
    const cond = parsePrice(charges.match(/Condom[íi]nio\s*(R\$\s*[\d.,]+)/i)?.[1] ?? '') ?? 0;
    const iptu = parsePrice(charges.match(/IPTU\s*(R\$\s*[\d.,]+)/i)?.[1] ?? '') ?? 0;

    let tamanho = 0;
    let quartos = 0;
    let garagem = 0;
    let suites = 0;
    card.find('.property-amenities.amenities-main > div').each((_, div) => {
      const label = normalizeText($(div).find('small').text());
      const value = $(div).find('span').text();
      if (label.includes('privat')) tamanho = parseArea(value) ?? 0;
      else if (label.includes('quarto')) quartos = parseBrazilianNumber(value) ?? 0;
      else if (label.includes('vaga')) garagem = parseBrazilianNumber(value) ?? 0;
      else if (label.includes('sui')) suites = parseBrazilianNumber(value) ?? 0;
    });

    return {
      code,
      url,
      suites,
      fields: {
        url_apartamento: url,
        bairro,
        valor_aluguel: rent,
        valor_total: publishedTotal || roundMoney(rent + cond + iptu),
        tamanho,
        quartos,
        garagem,
      },
    };
  });
}

export function parseBathrooms(html: string): number | undefined {
  const $ = load(html);
  const match = $('.property-amenities').text().match(/(\d+)\s*Banheiro/i);
  return match ? Number(match[1]) : undefined;
}
