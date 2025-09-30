import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Apartamento } from '@/crawlers/core/types';
import crawlers from '@/crawlers/registry';
import type { Tag } from '../types/tag';
class UserAnnotationsRepository {
  private sortList(list: Apartamento[]): Apartamento[] {
    list.sort((a, b) => {
      const totalA = typeof a.valor_total === 'number' ? a.valor_total : Number(a.valor_total) || 0;
      const totalB = typeof b.valor_total === 'number' ? b.valor_total : Number(b.valor_total) || 0;
      return totalA - totalB;
    });
    return list;
  }

  private async getCrawlerList(): Promise<Apartamento[]> {
    const combinedListings: Apartamento[] = [];
    for (const crawler of crawlers) {
      const raw = await readFile(crawler.getOutputFileName(true), 'utf-8');
      const listings = JSON.parse(raw) as Apartamento[];
      combinedListings.push(...listings);
    }
    return combinedListings;
  }

  private async getAnnotation() {
    const dataDir = join(process.cwd(), 'src', 'data');
    const raw = await readFile(join(dataDir, 'anotacoes.json'), 'utf-8');
    return raw;
  }

  private async combineAnnotations(list: Apartamento[]): Promise<Apartamento[]> {
    try {
      const rawAnnotation = await this.getAnnotation();
      const annotations = JSON.parse(rawAnnotation) as Record<
        string,
        { observacao?: string; tag?: Tag; nota?: number }
      >;
      return list.map(item => {
        if (annotations[item.id]) {
          return { ...item, ...annotations[item.id] };
        }
        return item;
      });
    } catch (error) {
      console.error('Failed to read annotations', error);
      return list;
    }
  }
  private applyFilters(
    list: Apartamento[],
    filters: {
      bairro?: string;
      quartos?: string;
      banheiros?: string;
      garagem?: string;
      tamanho?: string;
      tag?: string;
      nota?: string;
    }
  ): Apartamento[] {
    return list.filter(anuncio => {
      const bairroMatch =
        !filters.bairro || anuncio.bairro?.toLowerCase().includes(filters.bairro.toLowerCase());
      const tamanhoMatch = !filters.tamanho || (anuncio.tamanho || 0) >= Number(filters.tamanho);
      const quartosMatch = !filters.quartos || anuncio.quartos === Number(filters.quartos);
      const banheirosMatch = !filters.banheiros || anuncio.banheiros === Number(filters.banheiros);
      const garagemMatch = !filters.garagem || anuncio.garagem === Number(filters.garagem);
      const tagMatch = !filters.tag || anuncio.tag === filters.tag;
      const notaMatch = !filters.nota || anuncio.nota === Number(filters.nota);
      return (
        bairroMatch &&
        tamanhoMatch &&
        quartosMatch &&
        banheirosMatch &&
        garagemMatch &&
        tagMatch &&
        notaMatch
      );
    });
  }

  private paginateResults(
    list: Apartamento[],
    page: number,
    limit: number
  ): { anuncios: Apartamento[]; total: number } {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return {
      anuncios: list.slice(startIndex, endIndex),
      total: list.length,
    };
  }

  public async readAnnotations(options?: {
    page?: number;
    limit?: number;
    filters?: {
      bairro?: string;
      quartos?: string;
      banheiros?: string;
      garagem?: string;
      tamanho?: string;
      tag?: string;
      nota?: string;
    };
    all?: boolean;
  }) {
    try {
      let combinedListings: Apartamento[] = await this.getCrawlerList();
      combinedListings = this.sortList(combinedListings);
      combinedListings = await this.combineAnnotations(combinedListings);
      combinedListings = combinedListings.filter(listing => listing.valor_total > 0);

      // If requesting all data (for filter options), return all
      if (options?.all) {
        return { anuncios: combinedListings, total: combinedListings.length };
      }

      // Apply filters if provided
      if (options?.filters) {
        combinedListings = this.applyFilters(combinedListings, options.filters);
      }

      // Apply pagination if provided
      if (options?.page && options?.limit) {
        return this.paginateResults(combinedListings, options.page, options.limit);
      }

      // Default: return all results without pagination for backward compatibility
      return { anuncios: combinedListings, total: combinedListings.length };
    } catch (error) {
      console.error('Failed to load listings data', error);
      return { anuncios: [], total: 0 };
    }
  }

  public async writeAnnotations({
    id,
    observacao,
    tag,
    nota,
  }: {
    id: string;
    observacao?: string;
    tag?: Tag;
    nota?: number;
  }) {
    const rawAnnotation = await this.getAnnotation();
    const annotations = JSON.parse(rawAnnotation) as Record<
      string,
      { observacao?: string; tag?: Tag; nota?: number }
    >;

    if (!annotations[id]) annotations[id] = {};

    if (observacao !== undefined) annotations[id].observacao = observacao;
    if (tag !== undefined) annotations[id].tag = tag;
    if (nota !== undefined) annotations[id].nota = nota;
    const dataDir = join(process.cwd(), 'src', 'data');
    await writeFile(join(dataDir, 'anotacoes.json'), JSON.stringify(annotations, null, 2), 'utf-8');
  }
}

const repository = new UserAnnotationsRepository();
export default repository;
