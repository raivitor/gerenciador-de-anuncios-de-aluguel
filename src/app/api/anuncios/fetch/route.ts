import { NextResponse } from 'next/server';

import creditoReal from '@/corretoras/creditoReal';
import scrapeIbagy, { IbagyListing } from '@/corretoras/ibaggy';

type CrawlerFn = () => Promise<unknown>;

interface CrawlerTask {
  name: string;
  run: CrawlerFn;
}

interface CrawlerResult {
  name: string;
  success: boolean;
  count?: number;
  error?: string;
}

const crawlers: CrawlerTask[] = [
  { name: 'creditoReal', run: creditoReal },
  { name: 'ibagy', run: scrapeIbagy as () => Promise<IbagyListing[]> },
];

export async function POST(): Promise<NextResponse<{ results: CrawlerResult[] }>> {
  const results: CrawlerResult[] = [];

  for (const crawler of crawlers) {
    try {
      const data = await crawler.run();
      results.push({
        name: crawler.name,
        success: true,
        count: Array.isArray(data) ? data.length : undefined,
      });
    } catch (error) {
      console.error(`Crawler ${crawler.name} failed`, error);
      results.push({
        name: crawler.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const hasFailure = results.some(result => !result.success);
  const status = hasFailure ? 500 : 200;

  return NextResponse.json({ results }, { status });
}
