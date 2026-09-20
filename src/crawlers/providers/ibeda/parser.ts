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
  rent?: number;
}

export function parseSearch(
  html: string,
  pageUrl: string,
  currentPage: number
): SearchPage<SearchCard> {
  const $ = load(html);

  // Filtra cards reais ignorando os placeholders de esqueleto (.skeleton-img)
  const items: SearchCard[] = $('.thumbnail_one')
    .filter((_, element) => $(element).find('a.property-card-link').length > 0)
    .toArray()
    .map(element => {
      const card = $(element);
      const link = card.find('a.property-card-link').first();
      const href = link.attr('href');
      if (!href) throw new Error('Ibeda: link de imóvel sem href');
      const url = resolveListingUrl(href, pageUrl);

      const footer = card.find('.property-card-footer a');
      const dataCode = footer.attr('data-code');
      const urlCode = url.match(/-id-(\d+)\/?$/i)?.[1];
      const code = dataCode ?? urlCode;
      if (!code) throw new Error(`Ibeda: código ausente em ${url}`);

      const dataBlock = footer.attr('data-block')?.trim();
      const addressText = card.find('.property_card_address').text().trim();
      const addressNeighborhood = addressText
        ? addressText.split('-')[1]?.split(',')[0]?.trim()
        : undefined;
      const neighborhood = dataBlock || addressNeighborhood;

      const priceText = card.find('.property_pricing').text().trim();
      const rent = parsePrice(priceText) ?? parsePrice(footer.attr('data-property-value') ?? '');

      return { code, url, neighborhood, rent };
    });

  if (!items.length && !hasEmptySearchMessage($)) {
    throw new Error(`Ibeda: busca sem anúncios em ${pageUrl}`);
  }

  const hasNext =
    $('ul.pagination a[rel="next"]').length > 0 ||
    $('ul.pagination a')
      .toArray()
      .some(el => $(el).attr('href')?.includes(`pagina=${currentPage + 1}`));

  return { items, hasNext };
}

export function parseDetail(html: string, card: SearchCard): Apartamento | undefined {
  const $ = load(html);

  let rent: number | undefined;
  let condo = 0;
  let iptu = 0;

  // Ibeda agrupa valores em blocos .transaction_text e .transaction_value.
  // Pode haver opção de "Comprar" e "Alugar" no mesmo imóvel, então isolamos estritamente "alugar".
  $('.transaction_text').each((_, element) => {
    const text = normalize($(element).text());

    if (text === 'alugar') {
      const valueEl = $(element).siblings('.transaction_value');
      const valueText = valueEl.find('h3').text().trim() || valueEl.text().trim();
      const parsed = parsePrice(valueText);
      if (parsed !== undefined) rent = parsed;
    } else if (text.includes('condom')) {
      const priceText =
        $(element).find('.transaction_parcel').text().trim() || $(element).text().trim();
      const parsed = parsePrice(priceText);
      if (parsed !== undefined) condo = parsed;
    } else if (text.includes('iptu')) {
      const priceText =
        $(element).find('.transaction_parcel').text().trim() || $(element).text().trim();
      const parsed = parsePrice(priceText);
      if (parsed !== undefined) {
        iptu = text.includes('anual') ? roundMoney(parsed / 12) : parsed;
      }
    }
  });

  if (rent === undefined && card.rent !== undefined && card.rent > 0) {
    rent = card.rent;
  }

  if (rent === undefined || rent <= 0) {
    return undefined;
  }

  let area: number | undefined;
  let quartos: number | undefined;
  let banheiros: number | undefined;
  let garagem: number | undefined;

  $('.composition_name').each((_, element) => {
    const text = normalize($(element).text());

    if (text.includes('quarto') || text.includes('dormit')) {
      const parsed = parseBrazilianNumber(text);
      if (parsed !== undefined) quartos = parsed;
    } else if (text.includes('banheiro')) {
      const parsed = parseBrazilianNumber(text);
      if (parsed !== undefined) banheiros = parsed;
    } else if (text.includes('vaga') || text.includes('garagem')) {
      const parsed = parseBrazilianNumber(text);
      if (parsed !== undefined) garagem = parsed;
    } else if (text.includes('m2') || text.includes('m²')) {
      const isPrivativaOrUtil = text.includes('util') || text.includes('privativ');
      const parsed = parseArea(text);
      if (parsed !== undefined && (!area || isPrivativaOrUtil)) {
        area = parsed;
      }
    }
  });

  const detailAddress = $('h1 span')
    .toArray()
    .map(el => $(el).text().trim())
    .find(t => t.includes('-'));
  const detailNeighborhood = detailAddress
    ? detailAddress.split('-')[1]?.split(',')[0]?.trim()
    : undefined;
  const neighborhood = card.neighborhood || detailNeighborhood;

  const total = roundMoney(rent + condo + iptu);

  // Nenhum filtro de limite de valor ou metragem é aplicado conforme instrução do usuário
  return createListing('ibeda', card.code, {
    valor_aluguel: rent,
    valor_total: total,
    url_apartamento: card.url,
    bairro: neighborhood,
    tamanho: area,
    quartos,
    banheiros,
    garagem,
  });
}
