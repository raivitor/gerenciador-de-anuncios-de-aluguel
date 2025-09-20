import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Apartamento } from './types';

export abstract class BaseCrawler {
  constructor(public readonly name: string) {
    this.outputFileName = `${name}_anuncio.json`;
  }

  private readonly outputFileName: string;
  abstract baseURL: string;

  public getOutputFileName(fullFilename = false): string {
    if (fullFilename) {
      const dataDir = join(process.cwd(), 'src', 'data');
      return join(dataDir, this.outputFileName);
    }
    return this.outputFileName;
  }

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
