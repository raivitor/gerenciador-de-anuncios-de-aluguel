import { load } from 'cheerio';

import type { Apartamento } from '@/crawlers/core/types';
import {
  createListing,
  resolveListingUrl,
  type ListingReference,
} from '@/crawlers/shared/listings';
import {
  normalizeText as normalize,
  parseArea,
  parseBrazilianNumber,
  parsePrice,
  roundMoney,
} from '@/crawlers/shared/numbers';
import type { SearchPage } from '@/crawlers/shared/pagination';
import { hasEmptySearchMessage } from '@/crawlers/shared/search';

export interface SearchCard extends ListingReference {
  neighborhood?: string;
}

export function parseSearch(
  html: string,
  pageUrl: string,
  currentPage: number
): SearchPage<SearchCard> {
  const $ = load(html);
  const items: SearchCard[] = $('a.link_resultado')
    .toArray()
    .map(element => {
      const card = $(element);
      const href = card.attr('href');
      if (!href) throw new Error('Karlla Brandão: link de imóvel sem href');
      const url = resolveListingUrl(href, pageUrl);

      const refMatch = card
        .find('.flag_ref')
        .first()
        .text()
        .match(/Ref(?:er[eê]ncia)?[:.\s]*([A-Za-z0-9_-]+)/i);
      const urlCode = url.match(/\/(\d+)\/?$/)?.[1];
      const code = refMatch ? refMatch[1] : urlCode;
      if (!code) throw new Error(`Karlla Brandão: código ausente em ${url}`);

      const locText = card.find('.final_card span').text().trim();
      const neighborhood = locText ? locText.split('-')[0].trim() : undefined;

      return { code, url, neighborhood };
    });

  if (!items.length && !hasEmptySearchMessage($)) {
    throw new Error(`Karlla Brandão: busca sem anúncios em ${pageUrl}`);
  }

  const hasNext = $('.pagination a')
    .toArray()
    .some(el => {
      const href = $(el).attr('href') ?? '';
      return href.includes(`pagina-${currentPage + 1}/`);
    });

  return { items, hasNext };
}

function meetsLimits(
  listing: Omit<Apartamento, 'id' | 'corretora'>,
  minSize: number,
  maxValue: number
): boolean {
  return (
    Number.isFinite(listing.valor_total) &&
    listing.valor_total > 0 &&
    listing.valor_total <= maxValue &&
    Number.isFinite(listing.tamanho) &&
    (listing.tamanho ?? 0) >= minSize &&
    (listing.quartos ?? 0) >= 2 &&
    (listing.garagem ?? 0) >= 1
  );
}

export function parseDetail(
  html: string,
  card: SearchCard,
  minSize = 45,
  maxValue = 3000
): Apartamento | undefined {
  const $ = load(html);
  const pageType = $('h1').first().text().trim();
  if (pageType && !/apartamento|flat|duplex/i.test(pageType)) {
    return undefined;
  }

  let rent: number | undefined;
  let condo = 0;
  let iptu = 0;

  $('.alinha_valores .valor, .valor-imovel .valor').each((_, el) => {
    const label = normalize($(el).find('h3, small').first().text());
    const valText = $(el).find('h4, span').last().text().trim();
    if (!valText) return;

    if (/loca/.test(label)) {
      const parsed = parsePrice(valText);
      if (parsed !== undefined) rent = parsed;
    } else if (/condom/.test(label)) {
      const parsed = parsePrice(valText);
      if (parsed !== undefined) condo = parsed;
    } else if (/iptu/.test(label)) {
      const parsed = parsePrice(valText);
      if (parsed !== undefined) {
        iptu = /anual/.test(label) ? roundMoney(parsed / 12) : parsed;
      }
    }
  });

  if (rent === undefined || rent <= 0) {
    return undefined;
  }

  let area: number | undefined;
  let quartos: number | undefined;
  let banheiros: number | undefined;
  let garagem: number | undefined;

  $('.detalhes .detalhe').each((_, el) => {
    const text = normalize($(el).text());
    if (/m2|m²/.test(text)) {
      const isUtil = /util|privativ/.test(text);
      const parsedArea = parseArea(text);
      if (parsedArea !== undefined && (!area || isUtil)) {
        area = parsedArea;
      }
    } else if (/dormit|quarto/.test(text)) {
      const parsed = parseBrazilianNumber(text);
      if (parsed !== undefined) quartos = parsed;
    } else if (/banheiro/.test(text)) {
      const parsed = parseBrazilianNumber(text);
      if (parsed !== undefined) banheiros = parsed;
    } else if (/vaga|garag/.test(text)) {
      const parsed = parseBrazilianNumber(text);
      if (parsed !== undefined) garagem = parsed;
    }
  });

  const address = $('h2').first().text().trim();
  const detailNeighborhood = address ? address.split('-')[0].trim() : undefined;
  const neighborhood = detailNeighborhood || card.neighborhood;

  const total = roundMoney(rent + condo + iptu);

  const fields: Omit<Apartamento, 'id' | 'corretora'> = {
    valor_aluguel: rent,
    valor_total: total,
    url_apartamento: card.url,
    bairro: neighborhood,
    tamanho: area,
    quartos,
    banheiros,
    garagem,
  };

  if (!meetsLimits(fields, minSize, maxValue)) {
    return undefined;
  }

  return createListing('karlla-brandao', card.code, fields);
}
