import type { BaseCrawler } from '@/crawlers/core/base-crawler';

import intelectoCrawler from './providers/intelecto';
import habitacionalCrawler from './providers/habitacional';
import emobiCrawler from './providers/emobi';
import remaxCrawler from './providers/remax';
import viverImoveisCrawler from './providers/viver-imoveis';
import imoveisPotiguaresCrawler from './providers/imoveis-potiguares';
import gorettiCrawler from './providers/goretti';
import karllaBrandaoCrawler from './providers/karlla-brandao';

const crawlers: BaseCrawler[] = [
  intelectoCrawler,
  habitacionalCrawler,
  emobiCrawler,
  remaxCrawler,
  viverImoveisCrawler,
  imoveisPotiguaresCrawler,
  gorettiCrawler,
  karllaBrandaoCrawler,
];

export default crawlers;
