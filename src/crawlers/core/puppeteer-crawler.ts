import puppeteer, { type Browser, type LaunchOptions, type Page } from 'puppeteer';

import { BaseCrawler } from './base-crawler';
import type { Apartamento } from './types';
import { DEFAULT_USER_AGENT } from '@/crawlers/shared/http';

export abstract class PuppeteerCrawler extends BaseCrawler {
  protected getLaunchOptions(): LaunchOptions {
    return {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };
  }

  protected async setPageDefaults(page: Page): Promise<void> {
    await page.setUserAgent(DEFAULT_USER_AGENT);
  }

  protected abstract scrapeWithPage(page: Page): Promise<Apartamento[]>;

  protected async scrape(): Promise<Apartamento[]> {
    let browser: Browser | undefined;

    try {
      browser = await puppeteer.launch(this.getLaunchOptions());
      const page = await browser.newPage();
      await this.setPageDefaults(page);

      return await this.scrapeWithPage(page);
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(`${this.name} scrape failed`);
      console.error(`${this.name} scrape error:`, normalizedError);
      throw normalizedError;
    } finally {
      await browser?.close();
    }
  }
}
