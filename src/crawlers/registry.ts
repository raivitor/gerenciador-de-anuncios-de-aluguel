import type { BaseCrawler } from '@/crawlers/core/base-crawler';

import creditoRealCrawler from '@/crawlers/providers/credito-real';
import daltonCrawler from '@/crawlers/providers/dalton';
import ibagyCrawler from '@/crawlers/providers/ibagy';
import olxCrawler from '@/crawlers/providers/olx';
import gralhaCrawler from '@/crawlers/providers/gralha';
import sanRemoCrawler from '@/crawlers/providers/Sanremo';
import f1Crawler from './providers/f1';

export const crawlers: BaseCrawler[] = [
  creditoRealCrawler,
  ibagyCrawler,
  olxCrawler,
  gralhaCrawler,
  daltonCrawler,
  sanRemoCrawler,
  f1Crawler,
];

export { creditoRealCrawler };
export { ibagyCrawler };
export { olxCrawler };
export { daltonCrawler };
export { gralhaCrawler };
export { sanRemoCrawler };
export { f1Crawler };

export default crawlers;
