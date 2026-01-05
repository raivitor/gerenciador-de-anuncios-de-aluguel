import type { BaseCrawler } from '@/crawlers/core/base-crawler';

import creditoRealCrawler from '@/crawlers/providers/credito-real';
import daltonCrawler from '@/crawlers/providers/dalton';
import ibagyCrawler from '@/crawlers/providers/ibagy';
import olxCrawler from '@/crawlers/providers/olx';
import gralhaCrawler from '@/crawlers/providers/gralha';
import sanRemoCrawler from '@/crawlers/providers/Sanremo';
import f1Crawler from './providers/f1';
import dudaCrawler from './providers/duda';
import realizarCrawler from './providers/realizar';
import regenteCrawler from './providers/regente';
import quadraCrawler from './providers/quadra';
import floripaImobCrawler from './providers/floripa-imob';
import liderancaCrawler from './providers/lideranca';
import seiterCrawler from './providers/seiter';
import itacorubiCrawler from './providers/itacorubi';

export const crawlers: BaseCrawler[] = [
  olxCrawler, //ok
  creditoRealCrawler, //ok
  ibagyCrawler, //ok
  dudaCrawler, //ok
  liderancaCrawler, //ok
  regenteCrawler, //ok
  sanRemoCrawler, //ok
  realizarCrawler, //ok
  daltonCrawler, //ok
  gralhaCrawler, //ok
  f1Crawler,
  quadraCrawler, //ok
  floripaImobCrawler, //ok
  seiterCrawler, //ok
  // itacorubiCrawler, //off
];

export default crawlers;
