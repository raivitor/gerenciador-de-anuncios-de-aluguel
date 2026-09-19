import { load } from 'cheerio';

import type { Apartamento } from '@/crawlers/core/types';
import { createHttpClient } from './http';
import { createListing, resolveListingUrl, type ListingReference } from './listings';
import {
  normalizeText,
  parseArea,
  parseBrazilianNumber,
  parsePrice,
  roundMoney,
} from './numbers';
import { collectPages, pageUrl } from './pagination';
import { hasEmptySearchMessage } from './search';

interface Card extends ListingReference {
  fields: Omit<Apartamento, 'id' | 'corretora' | 'valor_total'>;
}

function parseSearch(html: string, url: string) {
  const $ = load(html);
  const items: Card[] = $('a.card-with-buttons').toArray().map(element => {
    const card = $(element);
    const code = card.find('.card-with-buttons__code').text().trim();
    if (!code) throw new Error(`Código de imóvel ausente em ${url}`);
    const link = resolveListingUrl(card.attr('href') ?? '', url);
    const rental = card.find('.card-with-buttons__value-container').toArray().find(container =>
      /aluguel|loca/.test(normalizeText($(container).find('.card-with-buttons__value-title').text()))
    );
    const price = rental
      ? $(rental).find('.card-with-buttons__value').first().text()
      : card.find('.card-with-buttons__value').first().text();
    const fields: Card['fields'] = {
      url_apartamento: link,
      bairro: card.find('.card-with-buttons__heading').text().split('-')[0].trim(),
      valor_aluguel: parsePrice(price) ?? 0,
      tamanho: 0,
      quartos: 0,
      banheiros: 0,
      garagem: 0,
    };
    card.find('ul li').each((_, li) => {
      const text = normalizeText($(li).text());
      if (/m²|m2/.test(text)) fields.tamanho = parseArea(text) ?? 0;
      else if (text.includes('quarto')) fields.quartos = parseBrazilianNumber(text) ?? 0;
      else if (text.includes('banheiro')) fields.banheiros = parseBrazilianNumber(text) ?? 0;
      else if (text.includes('vaga')) fields.garagem = parseBrazilianNumber(text) ?? 0;
    });
    return { code, url: link, fields };
  });

  if (!items.length && !hasEmptySearchMessage($)) {
    throw new Error(`Busca vazia não confirmada em ${url}`);
  }
  const hasNext = $('.pagination-table .btn-next, a.btn-next, .pagination .btn-next')
    .toArray().some(element => {
      const button = $(element);
      return !button.is('[disabled], [aria-disabled="true"], .disabled') &&
        !button.parent().is('.disabled, [aria-disabled="true"]');
    });
  return { items, hasNext };
}

function parseTotal(html: string, rent: number): number {
  const $ = load(html);
  const published = parsePrice($('.total-rent').first().text());
  if (published && published > 0) return published;
  let taxes = 0;
  $('.taxes .tax').each((_, element) => {
    const text = $(element).text();
    if (!/m²|m2/i.test(text)) taxes += parsePrice(text) ?? 0;
  });
  return roundMoney(rent + taxes);
}

// Viver Imóveis e Goretti publicam o mesmo formato de cards e detalhes.
export async function scrapeCardWithButtons(
  provider: string,
  searchUrl: string
): Promise<Apartamento[]> {
  const http = createHttpClient();
  const cards = await collectPages(
    provider,
    async page => {
      const url = page === 1 ? searchUrl : pageUrl(searchUrl, 'pagina', page);
      return parseSearch((await http.get<string>(url)).data, url);
    },
    card => card.code
  );

  const listings: Apartamento[] = [];
  for (const card of cards) {
    let total = card.fields.valor_aluguel;
    try {
      total = parseTotal((await http.get<string>(card.url)).data, total);
    } catch (error) {
      console.warn(`[${provider}] Falha ao obter detalhes de ${card.url}:`, error);
    }
    listings.push(createListing(provider, card.code, { ...card.fields, valor_total: total }));
  }
  return listings;
}
