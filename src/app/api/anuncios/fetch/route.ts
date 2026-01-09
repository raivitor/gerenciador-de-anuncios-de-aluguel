import { NextResponse } from 'next/server';

import crawlers from '@/crawlers/registry';

interface CrawlerResult {
  name: string;
  success: boolean;
  count?: number;
  error?: string;
  durationMs?: number;
}

export async function POST(): Promise<NextResponse<{ results: CrawlerResult[] }>> {
  const results: CrawlerResult[] = [];
  for (const crawler of crawlers) {
    const start = Date.now();
    try {
      console.log('Iniciando', crawler.name);
      const data = await crawler.run();
      const end = Date.now();
      results.push({
        name: crawler.name,
        success: true,
        count: Array.isArray(data) ? data.length : undefined,
        durationMs: end - start,
      });
    } catch (error) {
      const end = Date.now();
      console.error(`Crawler ${crawler.name} failed`, error);
      results.push({
        name: crawler.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: end - start,
      });
    }
  }

  const hasFailure = results.some(result => !result.success);
  const status = hasFailure ? 500 : 200;
  console.log('Crawler results:', results);
  return NextResponse.json({ results }, { status });
}
