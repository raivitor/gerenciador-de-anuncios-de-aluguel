import type { CheerioAPI } from 'cheerio';
import { normalizeText } from './numbers';

export function hasEmptySearchMessage($: CheerioAPI): boolean {
  const body = $('body').clone();
  body.find('script, style').remove();
  const text = normalizeText(body.text());
  // Não confundir "10 imóveis" ou "Não encontrou o imóvel?" com uma busca vazia.
  return (
    /(?:^|[^\d.,])0\s+(?:imoveis|resultados)\b/.test(text) ||
    /\bnenhum (?:imovel|resultado) (?:foi )?encontrado\b/.test(text) ||
    /\bnao encontramos (?:imoveis|resultados)\b/.test(text) ||
    /\bnao (?:foi encontrado (?:imovel|resultado)|foram encontrados (?:imoveis|resultados))\b/.test(text)
  );
}
