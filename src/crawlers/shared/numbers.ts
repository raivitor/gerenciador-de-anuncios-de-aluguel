export const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

export const normalizeText = (text: string): string =>
  normalizeWhitespace(text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).toLowerCase();

// HTML brasileiro usa ponto para milhares e vírgula para decimais.
export function parseBrazilianNumber(text: string): number | undefined {
  const match = text.match(/[+-]?\d[\d.,]*/);
  if (!match) return undefined;
  // Valida o token inteiro para não converter "1.23" em 1 ou "45.1234" em 45123.
  if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(match[0])) return undefined;
  const value = Number(match[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

export function parsePrice(text: string): number | undefined {
  // Isola o preço de rótulos que podem conter outros números, como IPTU/2026.
  const currency = text.match(/([+-]?)\s*R\$\s*([+-]?[\d.,]+)/i);
  const amount = currency ? `${currency[1]}${currency[2]}` : text.trim();
  // Sem R$, aceita apenas um valor numérico; anos e códigos em rótulos não são preços.
  if (!currency && !/^[+-]?\d[\d.,]*(?:\s*\/\s*(?:m[eê]s|ano))?$/i.test(amount)) {
    return undefined;
  }
  const value = parseBrazilianNumber(amount);
  return value === undefined ? undefined : roundMoney(value);
}

export function parseArea(text: string): number | undefined {
  const match = text.match(/([+-]?\d[\d.,]*)\s*m(?:²|2)?\b/i);
  const value = match?.[1] ?? text.trim();
  if (!/^[+-]?\d[\d.,]*$/.test(value)) return undefined;
  // Áreas também aparecem com ponto decimal nos cards.
  if (/^[+-]?\d+\.\d{1,2}$/.test(value)) return Number(value);
  return parseBrazilianNumber(value);
}

export function parseApiNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;
