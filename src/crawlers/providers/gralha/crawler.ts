import type { Page } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import filtro from './filtro.json';
export class GralhaCrawler extends PuppeteerCrawler {
  constructor() {
    super('gralha');
  }

  baseURL =
    'https://www.gralhaalugueis.com.br/aluguel/apartamento/bairro+sc+florianopolis+agronomica';

  protected escapeUnicode(str: string): string {
    return str.replace(/[\u007F-\uFFFF]/g, c => {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  protected buildPageUrl(): string {
    const url = new URL(this.baseURL);

    const suggestArray = filtro.suggest.map(s => ({
      ...s,
      slug: s.slug.replace(/\s+/g, '+'),
    }));

    // serializa normal
    let suggestParam = JSON.stringify(suggestArray);

    // força unicode (se precisar)
    suggestParam = this.escapeUnicode(suggestParam);

    url.searchParams.set('suggest', suggestParam);
    url.searchParams.set('finalidade', 'aluguel');
    url.searchParams.set('valorMaximo', '4000');
    url.searchParams.set('vagas', '1, 2, 3, 4');
    url.searchParams.set('areaMinima', '70');
    url.searchParams.set('tipos', 'apartamento');

    return url.toString();
  }

  protected async navigateToListingsPage(page: Page): Promise<void> {
    const url = this.buildPageUrl();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page
      .waitForSelector('div#List_Products_ListResult', { timeout: 60_000 })
      .catch(() => null);
  }

  protected getValueByKey(item: any[] = [], key: string): string {
    const found = item.find((el: any) => el.name === key);
    return found ? found.value : '';
  }

  protected scrollToBottom = async (page: Page): Promise<void> => {
    await page.evaluate(async () => {
      await new Promise<void>(resolve => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    });
  };

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    await this.navigateToListingsPage(page);
    this.scrollToBottom(page);

    const { rawListaApto, totalBusca } = await page.evaluate(() => {
      const totalResultados =
        document
          .querySelector<HTMLElement>('div.ListResult_InfoBar_CountMsg > h1')
          ?.innerText.split(' ')[0] || '0';

      const cards = document.querySelectorAll('article.ListResult_Wrapper_Card');
      const rawListaApto = Array.from(cards).map(card => {
        const id = card.querySelector('.Tag_Content_Label')?.textContent?.trim() || '';

        const valor_aluguel =
          card.querySelector<HTMLElement>('.Offer_Price_ValueSpotlight')?.textContent || '0';

        const url_apartamento =
          card
            .querySelector<HTMLElement>('a.Tag.Tag_Primary.__is-ripplelink')
            ?.getAttribute('href') || '';

        const lis = card.querySelectorAll<HTMLElement>('div.Card_Info_Properties_List > ul > li');
        const tamanho =
          lis[0]?.querySelector<HTMLElement>('span')?.textContent?.replace('m²', '').trim() || '0';
        const quartos = lis[1]?.querySelector<HTMLElement>('span')?.textContent || '0';
        const banheiros = lis[2]?.querySelector<HTMLElement>('span')?.textContent || '0';
        const garagem = lis[3]?.querySelector<HTMLElement>('span')?.textContent || '0';

        return {
          id,
          valor_aluguel: valor_aluguel,
          url_apartamento: `https://www.gralhaalugueis.com.br${url_apartamento}`,
          tamanho: tamanho,
          quartos: quartos,
          banheiros: banheiros,
          garagem: garagem,
        };
      });

      return {
        rawListaApto,
        totalBusca: parseInt(totalResultados.replace(/\D/g, ''), 10) || 0,
      };
    });

    const listaApartamento = rawListaApto.map(card => ({
      id: card.id,
      valor_aluguel: this.parseFloat(card.valor_aluguel),
      valor_total: 0,
      url_apartamento: card.url_apartamento,
      bairro: '',
      tamanho: Number(card.tamanho),
      quartos: this.parseFloat(card.quartos),
      banheiros: this.parseFloat(card.banheiros),
      garagem: this.parseFloat(card.garagem),
    }));
    console.log('listaApartamento', listaApartamento.length);
    return listaApartamento;
  }
}

const gralhaCrawler = new GralhaCrawler();
export default gralhaCrawler;
