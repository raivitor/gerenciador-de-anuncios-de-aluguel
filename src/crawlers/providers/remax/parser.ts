import { hasNextApiPage } from '@/crawlers/shared/pagination';
import { createListing, resolveListingUrl } from '@/crawlers/shared/listings';
import { parseApiNumber, roundMoney } from '@/crawlers/shared/numbers';

type ApiNumber = string | number | null;
interface RemaxContent {
  MLSID?: string;
  ListingId?: string | number;
  ShortLinks?: { LanguageCode?: string; ShortLink?: string }[];
  ListingPrice?: ApiNumber;
  TransactionCost?: ApiNumber;
  AdditionalFees?: { FeeAmount?: ApiNumber; Amount?: ApiNumber }[];
  LocalZone?: string;
  GeoDatas?: { LocalZone?: string }[];
  City?: string;
  TotalArea?: ApiNumber;
  BuiltArea?: ApiNumber;
  LivingArea?: ApiNumber;
  NumberOfBedrooms?: ApiNumber;
  NumberOfBathrooms?: ApiNumber;
  ParkingSpaces?: ApiNumber;
  GarageSpaces?: ApiNumber;
}

export interface RemaxResponse {
  '@odata.count'?: number;
  value?: { content?: RemaxContent }[];
}

export function parseSearch(data: RemaxResponse, offset: number, pageSize: number) {
  if (!data || !Array.isArray(data.value)) throw new Error('Remax: resposta sem lista de imóveis');
  const hasNext = hasNextApiPage('Remax', {
    total: data['@odata.count'],
    offset,
    received: data.value.length,
    pageSize,
  });

  const items = data.value.map(item => {
    const c = item?.content;
    if (!c) throw new Error('Remax: imóvel sem conteúdo');
    const code = c.MLSID || c.ListingId;
    if (!code) throw new Error('Remax: imóvel sem código');
    const link = c.ShortLinks?.find(s => s.LanguageCode === 'pt-BR')?.ShortLink ||
      c.ShortLinks?.[0]?.ShortLink;
    const url = resolveListingUrl(link || `/pt-br/imoveis/${code}`, 'https://www.remax.com.br/');
    const rent = parseApiNumber(c.ListingPrice) ?? 0;
    const additional = (c.AdditionalFees ?? []).reduce(
      (sum, fee) => sum + (parseApiNumber(fee.FeeAmount ?? fee.Amount) ?? 0),
      0
    );
    const total = parseApiNumber(c.TransactionCost) || roundMoney(rent + additional);
    return createListing('remax', String(code), {
      valor_aluguel: rent,
      valor_total: total,
      url_apartamento: url,
      bairro: c.LocalZone || c.GeoDatas?.[0]?.LocalZone || c.City,
      tamanho:
        parseApiNumber(c.TotalArea) ||
        parseApiNumber(c.BuiltArea) ||
        parseApiNumber(c.LivingArea) ||
        0,
      quartos: parseApiNumber(c.NumberOfBedrooms) ?? 0,
      banheiros: parseApiNumber(c.NumberOfBathrooms) ?? 0,
      garagem: parseApiNumber(c.ParkingSpaces) || parseApiNumber(c.GarageSpaces) || 0,
    });
  });
  return { items, hasNext };
}
