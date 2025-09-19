import type { BaseCrawler } from '@/crawlers/core/base-crawler';

import creditoRealCrawler from '@/crawlers/providers/credito-real';
import daltonCrawler from '@/crawlers/providers/dalton';
import ibagyCrawler from '@/crawlers/providers/ibagy';
import olxCrawler from '@/crawlers/providers/olx';

export const crawlers: BaseCrawler[] = [
  creditoRealCrawler,
  ibagyCrawler,
  olxCrawler,
  daltonCrawler,
];

export { creditoRealCrawler };
export { ibagyCrawler };
export { olxCrawler };
export { daltonCrawler };

export default crawlers;
