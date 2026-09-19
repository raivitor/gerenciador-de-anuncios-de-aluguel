import type { Apartamento } from '@/crawlers/core/types';

export interface ListingReference {
  code: string;
  url: string;
}

export function resolveListingUrl(href: string, base: string): string {
  if (!href.trim()) throw new Error(`Link de imóvel ausente em ${base}`);
  const url = new URL(href, base);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Link de imóvel inválido: ${href}`);
  }
  return url.toString();
}

export function createListing(
  provider: string,
  code: string,
  fields: Omit<Apartamento, 'id' | 'corretora'>
): Apartamento {
  if (!code.trim()) throw new Error(`${provider}: código de imóvel ausente`);
  resolveListingUrl(fields.url_apartamento, fields.url_apartamento);
  return { id: `${provider}_${code}`, ...fields, corretora: provider };
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...new Map(items.map(item => [key(item), item])).values()];
}
