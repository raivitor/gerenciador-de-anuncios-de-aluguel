import { load } from 'cheerio';
import type { Apartamento } from '@/crawlers/core/types';

export const CARD_SELECTOR = 'a[href*="/imovel/"]:has(article)';
export const COUNT_SELECTOR = '[class*="list-search-header_numberOfResults"]';
export const DETAIL_SELECTOR = '.HeadTextSection';

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export function parseBrazilianNumber(text: string): number | undefined {
  const match = text.match(/\d+(?:\.\d{3})*(?:,\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

export interface ListingCard {
  code: string;
  url: string;
  type: string;
  area?: number;
  neighborhood?: string;
}

export function listingCode(url: string): string {
  const code = new URL(url).pathname.match(/\/imovel\/[^/]+\/([a-z0-9]+)\/?$/i)?.[1];
  if (!code || !/\d/.test(code)) throw new Error(`Intelecto: código inválido em ${url}`);
  return code;
}

export function parseSearch(html: string, url: string) {
  const $ = load(html);
  if ($('[class*="component-error_"]').length) {
    throw new Error(`Intelecto: erro ao carregar busca ${url}`);
  }
  const countText = $(COUNT_SELECTOR).first().text();
  const total = /\d[\d.]*\s+resultados?/i.test(countText)
    ? parseBrazilianNumber(countText)
    : undefined;
  if (total === undefined) throw new Error('Intelecto: contagem da busca ausente');

  const cards: ListingCard[] = $(CARD_SELECTOR)
    .toArray()
    .map(element => {
      const card = $(element);
      const href = new URL(card.attr('href')!, url);
      if (href.origin !== new URL(url).origin)
        throw new Error('Intelecto: link externo inesperado');
      href.search = '';
      href.hash = '';
      const areaText = card
        .find('[class*="_characteristics_"] span')
        .toArray()
        .map(item => $(item).text())
        .find(text => /m²|m2/.test(text));
      const type = card.find('[class*="_type_"]').text().trim();
      if (!type) throw new Error('Intelecto: tipo do card ausente');
      return {
        code: listingCode(href.toString()),
        url: href.toString(),
        type,
        area: parseBrazilianNumber(areaText ?? ''),
        neighborhood: card.find('[class*="_neighborhood_"]').text().trim() || undefined,
      };
    });

  if (total === 0) {
    if (cards.length || !/nenhum|nao encontr|0 imoveis/.test(normalize($('body').text()))) {
      throw new Error('Intelecto: busca vazia não confirmada');
    }
    return { cards, total, hasNext: false };
  }
  const next = $('a[rel="next"]').first();
  if (!cards.length || !next.length) throw new Error('Intelecto: busca incompleta');
  return { cards, total, hasNext: next.attr('aria-disabled') !== 'true' };
}

function included(text: string): boolean {
  const normalized = normalize(text);
  return (
    !/nao\s+(?:est[a-z]+\s+)?inclus|nao\s+incluid/.test(normalized) &&
    /\binclus[oa]s?\b|\bincluid[oa]s?\b|\bisent[oa]s?\b/.test(normalized)
  );
}

export function parseDetail(html: string, card: ListingCard): Apartamento | undefined {
  const $ = load(html);
  const head = $(DETAIL_SELECTOR).first();
  const values = head.find('[class*="property-values_wrapper"]').first();
  if (
    !head.find('h1').length ||
    !values.length ||
    head.find('[class*="component-error_"]').length ||
    $('.DescriptionSection [class*="component-error_"]').length
  ) {
    throw new Error(`Intelecto: detalhes incompletos de ${card.code}`);
  }
  const code = head
    .find('[class*="_code_"]')
    .text()
    .match(/c[oó]digo\s+([a-z0-9]+)/i)?.[1];
  if (code !== card.code) throw new Error(`Intelecto: código divergente de ${card.code}`);

  const rentColumn = values
    .find('[class*="property-values_contractColumn"]')
    .toArray()
    .find(element =>
      /^(alugar|aluguel|locacao)$/.test(
        normalize($(element).find('[class*="property-values_title"]').text())
      )
    );
  if (!rentColumn) throw new Error(`Intelecto: contrato de aluguel ausente em ${card.code}`);
  const rent = parseBrazilianNumber(
    $(rentColumn).find('[class*="property-values_priceValue"]').text()
  );
  const totalElement = $(rentColumn).find('[class*="property-values_additionalValue_"]');
  const publishedTotal = parseBrazilianNumber(totalElement.text());
  if (totalElement.length && publishedTotal === undefined) return undefined;
  if (!rent || rent <= 0) return undefined;

  const description = normalize($('[class*="property-description_text"]').text());
  const allIncluded = description
    .split(/[.!?;\n]/)
    .some(
      sentence =>
        /(?:taxas|encargos)\s+(?:(?:ja|estao|todos|todas)\s+)*inclus[oa]s/.test(sentence) &&
        included(sentence)
    );
  const charges = new Map<string, number>();
  if (publishedTotal === undefined && !allIncluded) {
    for (const element of values.find('[class*="property-values_additionalItem"]').toArray()) {
      const label = normalize($(element).find('[class*="property-values_additionalLabel"]').text());
      const amountText = $(element).find('[class*="property-values_additionalPrice"]').text();
      if (!label) throw new Error(`Intelecto: encargo sem identificação em ${card.code}`);
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const includedInDescription = new RegExp(
        `${escapedLabel}\\s+(?:(?:ja|esta|estao)\\s+)*(?:inclus[oa]s?|incluid[oa]s?|isent[oa]s?)\\b`
      ).test(description);
      if (included(amountText) || includedInDescription) continue;
      const amount = parseBrazilianNumber(amountText);
      if (amount === undefined) return undefined;
      const previous = charges.get(label);
      if (previous !== undefined && previous !== amount) {
        throw new Error(`Intelecto: encargo conflitante em ${card.code}`);
      }
      charges.set(label, amount);
    }
  }

  const characteristics = new Map<string, number | undefined>();
  head.find('[class*="property-characteristics-icons_property__"]').each((_, element) => {
    const label = normalize($(element).find('[class*="_itemTitle__"]').text());
    characteristics.set(label, parseBrazilianNumber($(element).find('[class*="_text__"]').text()));
  });
  const area = characteristics.has('area util') ? characteristics.get('area util') : card.area;
  const address = head.find('[class*="_address_"]').first().text().replace(/\s+/g, ' ').trim();
  const addressParts = address.split(/\s+-\s+/);
  const neighborhood =
    addressParts.length >= 3
      ? addressParts[addressParts.length - 3].split(',').pop()?.trim()
      : undefined;
  const total =
    publishedTotal ??
    Math.round((rent + [...charges.values()].reduce((a, b) => a + b, 0)) * 100) / 100;
  if (!area || total <= 0) return undefined;
  return {
    id: `intelecto_${code}`,
    valor_aluguel: rent,
    valor_total: total,
    url_apartamento: card.url,
    bairro: neighborhood || card.neighborhood,
    tamanho: area,
    quartos: characteristics.get('quartos') ?? characteristics.get('quarto'),
    banheiros: characteristics.get('banheiros') ?? characteristics.get('banheiro'),
    garagem: characteristics.get('vagas') ?? characteristics.get('vaga'),
    corretora: 'intelecto',
  };
}

export function meetsLimits(listing: Apartamento, minSize: number, maxValue: number): boolean {
  return (
    Number.isFinite(listing.valor_total) &&
    listing.valor_total > 0 &&
    listing.valor_total <= maxValue &&
    Number.isFinite(listing.tamanho) &&
    listing.tamanho! >= minSize &&
    [2, 3].includes(listing.quartos ?? 0) &&
    [1, 2].includes(listing.garagem ?? 0)
  );
}
