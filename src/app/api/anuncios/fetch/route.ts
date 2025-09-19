import { NextResponse } from 'next/server';

import creditoRealCrawler from '@/corretoras/creditoReal';
import ibagyCrawler from '@/corretoras/ibagy';
import olxCrawler from '@/corretoras/olx';
import daltonCrawler from '@/corretoras/dalton';
import type { BaseCrawler } from '@/corretoras/crawler';

interface CrawlerResult {
  name: string;
  success: boolean;
  count?: number;
  error?: string;
}

const crawlers: BaseCrawler[] = [creditoRealCrawler, ibagyCrawler, olxCrawler, daltonCrawler];

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
