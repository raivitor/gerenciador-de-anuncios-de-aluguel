import puppeteer, { type Browser, type LaunchOptions, type Page } from 'puppeteer';

import { BaseCrawler } from './base-crawler';
import type { Apartamento } from './types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

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
      console.error(`${this.name} scrape error:`, error);
      return [];
    } finally {
      await browser?.close();
    }
  }
}
