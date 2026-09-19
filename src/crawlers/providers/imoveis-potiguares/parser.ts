import { load } from 'cheerio';

import type { Apartamento } from '@/crawlers/core/types';
import { resolveListingUrl, type ListingReference } from '@/crawlers/shared/listings';
import { parseArea, parseApiNumber, parsePrice } from '@/crawlers/shared/numbers';
import { hasNextApiPage } from '@/crawlers/shared/pagination';

interface ImoveisPotiguaresItem {
  codigo: number;
  valor?: string;
  bairro?: string;
  numeroquartos?: string;
  numerobanhos?: string;
  numerovagas?: string;
  areaprincipal?: string;
  areainterna?: string;
  url_amigavel?: string;
}

export interface ImoveisPotiguaresResponse {
  quantidade?: number;
  lista?: ImoveisPotiguaresItem[];
}

interface Card extends ListingReference {
  fields: Omit<Apartamento, 'id' | 'corretora' | 'valor_total'>;
}

export function parseSearch(data: ImoveisPotiguaresResponse, page: number, pageSize: number) {
  if (!data || !Array.isArray(data.lista)) {
    throw new Error('Imóveis Potiguares: resposta sem lista de imóveis');
  }
  const hasNext = hasNextApiPage('Imóveis Potiguares', {
    total: data.quantidade,
    offset: (page - 1) * pageSize,
    received: data.lista.length,
    pageSize,
  });

  const items: Card[] = data.lista.map(item => {
    if (!item?.codigo) throw new Error('Imóveis Potiguares: imóvel sem código');
    const code = String(item.codigo);
    const url = resolveListingUrl(
      `/imovel/${item.url_amigavel || 'apartamento'}/${code}`,
      'https://www.imoveispotiguares.com.br'
    );
    return {
      code,
      url,
      fields: {
        url_apartamento: url,
        bairro: item.bairro?.trim() || '',
        valor_aluguel: parsePrice(item.valor ?? '') ?? 0,
        tamanho: parseArea(item.areaprincipal || item.areainterna || '') ?? 0,
        quartos: parseApiNumber(item.numeroquartos) ?? 0,
        banheiros: parseApiNumber(item.numerobanhos) ?? 0,
        garagem: parseApiNumber(item.numerovagas) ?? 0,
      },
    };
  });
  return { items, hasNext };
}

export function parseTotal(html: string): number | undefined {
  const $ = load(html);
  let total: number | undefined;
  $('.preco-total').each((_, element) => {
    const text = $(element).text();
    const value = text.includes('R$') ? parsePrice(text) : undefined;
    if (value && value > 0) total = value;
  });
  return total;
}
