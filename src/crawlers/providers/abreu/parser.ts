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

  const items: SearchCard[] = $('.card.card-imo')
    .toArray()
    .map(element => {
      const card = $(element);
      const link =
        card.find('a.carousel-cell').first().attr('href') ||
        card.find('a[href*="/"]').first().attr('href');

      if (!link) throw new Error('Abreu: link de imóvel sem href');
      const normalizedHref = link.startsWith('/') ? link : `/${link}`;
      const url = resolveListingUrl(normalizedHref, pageUrl);

      const code = card.find('.cod-imovel strong').text().trim() || url.match(/\/(\d+)\/?$/)?.[1];
      if (!code) throw new Error(`Abreu: código ausente em ${url}`);

      const locText = card.find('.card-bairro-cidade-texto').text().trim();
      const neighborhood = locText ? locText.split('-')[0]?.trim() : undefined;

      return { code, url, neighborhood };
    });

  if (!items.length && !hasEmptySearchMessage($)) {
    throw new Error(`Abreu: busca sem anúncios em ${pageUrl}`);
  }

  const hasNext = $('ul.pagination li:not(.disabled) a')
    .toArray()
    .some(el =>
      $(el)
        .attr('href')
        ?.includes(`pag=${currentPage + 1}`)
    );

  return { items, hasNext };
}

export function parseDetail(html: string, card: SearchCard): Apartamento | undefined {
  const $ = load(html);

  let rent: number | undefined;
  let condo = 0;
  let iptu = 0;

  $('.valores_imovel')
    .first()
    .find('.row')
    .each((_, row) => {
      const label = normalize($(row).find('.col-7, strong').text());
      const valText = $(row).find('.col-5').text().trim();
      const val = parsePrice(valText);
      if (val !== undefined) {
        if (label.includes('aluguel') || label.includes('loca')) {
          rent = val;
        } else if (label.includes('condom')) {
          condo = val;
        } else if (label.includes('iptu')) {
          iptu = label.includes('anual') ? roundMoney(val / 12) : val;
        }
      }
    });

  if (rent === undefined || rent <= 0) {
    return undefined;
  }

  const quartos = parseBrazilianNumber($('.dorm-ico-imo').text());
  const banheiros =
    parseBrazilianNumber($('.banh-ico-imo').text()) ??
    parseBrazilianNumber($('.suites-ico-imo').text());
  const garagem = parseBrazilianNumber($('.gar-ico-imo').text());
  const area = parseArea(
    $('.a-const-ico-imo, .a-util-ico-imo, .a-priv-ico-imo, .a-total-ico-imo').text()
  );

  const total = roundMoney(rent + condo + iptu);

  return createListing('abreu', card.code, {
    valor_aluguel: rent,
    valor_total: total,
    url_apartamento: card.url,
    bairro: card.neighborhood,
    tamanho: area,
    quartos,
    banheiros,
    garagem,
  });
}
