import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Tag } from '../app/types/tag';

export interface RentalListing {
  id: string;
  valor_aluguel: number;
  valor_total: number;
  url_apartamento: string;
  observacao: string;
  tag?: Tag;
}

export abstract class BaseCrawler {
  constructor(public readonly name: string, private readonly outputFileName: string) {}

  protected get outputPath(): string {
    return join(process.cwd(), 'src', 'data', this.outputFileName);
  }

  protected async save(listings: RentalListing[]): Promise<void> {
    await writeFile(this.outputPath, JSON.stringify(listings, null, 2), 'utf-8');
  }

  protected abstract scrape(): Promise<RentalListing[]>;

  public async run(): Promise<RentalListing[]> {
    const listings = await this.scrape();
    await this.save(listings);
    return listings;
  }
}
