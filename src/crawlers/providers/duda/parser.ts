import * as cheerio from 'cheerio';
import type { Cheerio } from 'cheerio';

export interface DudaListingCard {
  id: string;
  valor_aluguel: number;
  condominio: number;
  iptu: number;
  url_apartamento: string;
  bairro?: string;
  tamanho?: number;
  quartos?: number;
  banheiros?: number;
  garagem?: number;
}

export interface DudaLoadMoreResponse {
  content?: string;
}

export const DUDA_SITE_ORIGIN = 'https://www.dudaimoveis.com.br';

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const parseNumberFromText = (value: string): number => {
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
};

const parseMoneyFromText = (value: string): number => {
  const match = value.match(/R\$\s*[\d.]+,\d{2}/i);
  if (!match) return 0;

  const normalized = match[0].replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number.parseFloat(normalized) || 0;
};

const parseLocation = (value: string): string =>
  normalizeText(value.split(/\s-\s/)[0] ?? '');

const parseListingId = (url: string, fallbackText: string): string => {
  const urlId = url.match(/\/imovel\/(\d+)(?:\/|$)/)?.[1];
  if (urlId) return urlId;

  return fallbackText.match(/C[oó]d\.\s*(\d+)/i)?.[1] ?? '';
};

const parseListingCard = ($card: Cheerio<any>, origin: string): DudaListingCard | null => {
  const $content = $card.find('.imovel-content').first();
  if (!$content.length) return null;

  const rawHref =
    $content.find('a.ver-mais').first().attr('href') ??
    $card.find("a[href*='/imovel/']").first().attr('href') ??
    '';

  if (!rawHref) return null;

  const url_apartamento = new URL(rawHref, origin).toString();
  const codeText = normalizeText($content.find('p').first().text());
  const id = parseListingId(url_apartamento, codeText);

  if (!id) return null;

  const titleNode = $content.find('h2').first();
  const locationText = normalizeText(titleNode.nextAll('p').first().text());
  const metricTexts = $content
    .find('.icon p')
    .map(index => normalizeText($content.find('.icon p').eq(index).text()))
    .get();
  const paragraphTexts = $content
    .find('p')
    .map(index => normalizeText($content.find('p').eq(index).text()))
    .get();

  const tamanhoText = metricTexts.find(text => /m²/i.test(text)) ?? '';
  const quartosText = metricTexts.find(text => /quartos?/i.test(text)) ?? '';
  const garagemText = metricTexts.find(text => /vagas?/i.test(text)) ?? '';
  const banheirosText = metricTexts.find(text => /\b(bwc|banheiros?)\b/i.test(text)) ?? '';
  const condominioText = paragraphTexts.find(text => /^Condom[ií]nio:/i.test(text)) ?? '';
  const iptuText = paragraphTexts.find(text => /^IPTU:/i.test(text)) ?? '';

  return {
    id,
    valor_aluguel: parseMoneyFromText($content.find('p.title-h10').first().text()),
    condominio: parseMoneyFromText(condominioText),
    iptu: parseMoneyFromText(iptuText),
    url_apartamento,
    bairro: parseLocation(locationText),
    tamanho: parseNumberFromText(tamanhoText),
    quartos: parseNumberFromText(quartosText),
    banheiros: parseNumberFromText(banheirosText),
    garagem: parseNumberFromText(garagemText),
  };
};

const parseListingCollection = ($cards: Cheerio<any>, origin: string): DudaListingCard[] =>
  $cards
    .map(index => parseListingCard($cards.eq(index), origin))
    .get()
    .filter((card): card is DudaListingCard => card !== null);

export const parseSearchPageHtml = (
  html: string,
  origin = DUDA_SITE_ORIGIN
): DudaListingCard[] => {
  const $ = cheerio.load(html);
  return parseListingCollection($('.lista-imoveis li.imovel'), origin);
};

export const parseLoadMoreResponse = (
  payload: string | DudaLoadMoreResponse,
  origin = DUDA_SITE_ORIGIN
): DudaListingCard[] => {
  const response = (() => {
    if (typeof payload !== 'string') return payload;

    try {
      return JSON.parse(payload) as DudaLoadMoreResponse;
    } catch {
      return {} satisfies DudaLoadMoreResponse;
    }
  })();
  const content = response.content?.trim() ?? '';

  if (!content.startsWith('<li')) {
    return [];
  }

  const $ = cheerio.load(`<ul class="lista-imoveis">${content}</ul>`);
  return parseListingCollection($('.lista-imoveis li.imovel'), origin);
};
