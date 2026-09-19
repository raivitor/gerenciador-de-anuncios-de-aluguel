import { BaseCrawler } from '@/crawlers/core/base-crawler';
import { scrapeCardWithButtons } from '@/crawlers/shared/card-with-buttons';

export const SEARCH_URL =
  'https://www.viverimoveisrn.com.br/imoveis/para-alugar/apartamento/natal?quartos=2+&vagas=1+&area=45+&preco-de-locacao=0~3000&ordenar=recentes';

export class ViverImoveisCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('viver-imoveis');
    this.baseURL = baseURL;
  }

  protected async scrape() {
    return scrapeCardWithButtons(this.name, this.baseURL);
  }
}

const viverImoveisCrawler = new ViverImoveisCrawler();

export default viverImoveisCrawler;
