import { BaseCrawler } from '@/crawlers/core/base-crawler';
import { scrapeCardWithButtons } from '@/crawlers/shared/card-with-buttons';

const SEARCH_URL =
  'https://www.gorettimobiliaria.com/imoveis/para-alugar/apartamento/natal?quartos=2+&vagas=1+&area=45+&preco-de-locacao=0~3000';

class GorettiCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('goretti');
    this.baseURL = baseURL;
  }

  protected async scrape() {
    return scrapeCardWithButtons(this.name, this.baseURL);
  }
}

const gorettiCrawler = new GorettiCrawler();

export default gorettiCrawler;
