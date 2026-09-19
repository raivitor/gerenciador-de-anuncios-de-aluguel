export interface SearchPage<T> {
  items: T[];
  hasNext: boolean;
}

export function pageUrl(searchUrl: string, parameter: string, page: number): string {
  const url = new URL(searchUrl);
  url.searchParams.set(parameter, String(page));
  return url.toString();
}

export function hasNextApiPage(
  provider: string,
  { total, offset, received, pageSize }: {
    total: number | undefined;
    offset: number;
    received: number;
    pageSize: number;
  }
): boolean {
  if (received > pageSize) {
    throw new Error(`${provider}: página maior que o tamanho solicitado`);
  }
  if (total === undefined) return received === pageSize;
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`${provider}: contagem inválida`);
  }
  if (offset + received > total) {
    throw new Error(`${provider}: página incompatível com a contagem da busca`);
  }
  const hasNext = offset + received < total;
  // O próximo offset avança uma página inteira. Uma resposta parcial deixaria imóveis para trás.
  if (hasNext && received < pageSize) {
    throw new Error(`${provider}: página incompleta antes do fim da busca`);
  }
  return hasNext;
}

export async function collectPages<T>(
  provider: string,
  readPage: (page: number) => Promise<SearchPage<T>>,
  key: (item: T) => string
): Promise<T[]> {
  const items = new Map<string, T>();
  const fingerprints = new Set<string>();
  for (let page = 1; ; page += 1) {
    const result = await readPage(page);
    if (!result.items.length && result.hasNext) {
      throw new Error(`${provider}: página vazia com continuação`);
    }
    if (result.items.length) {
      const fingerprint = JSON.stringify([...new Set(result.items.map(key))].sort());
      if (fingerprints.has(fingerprint)) throw new Error(`${provider}: página repetida`);
      fingerprints.add(fingerprint);
      for (const item of result.items) items.set(key(item), item);
    }
    if (!result.hasNext) return [...items.values()];
  }
}
