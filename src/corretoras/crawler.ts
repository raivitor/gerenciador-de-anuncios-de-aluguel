import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Tag } from '../app/types/tag';

export interface Apartamento {
  id: string;
  valor_aluguel: number;
  valor_total: number;
  url_apartamento: string;
  bairro?: string;
  tamanho?: string;
  quartos?: string;
  banheiros?: string;
  garagem?: string;
  observacao?: string;
  tag?: Tag;
}

export abstract class BaseCrawler {
  constructor(public readonly name: string, private readonly outputFileName: string) {}
  abstract baseURL: string;
  protected get outputPath(): string {
    return join(process.cwd(), 'src', 'data', this.outputFileName);
  }

  protected async save(listings: Apartamento[]): Promise<void> {
    await writeFile(this.outputPath, JSON.stringify(listings, null, 2), 'utf-8');
  }

  protected abstract scrape(): Promise<Apartamento[]>;

  public async run(): Promise<Apartamento[]> {
    const listings = await this.scrape();
    await this.save(listings);
    return listings;
  }
}
