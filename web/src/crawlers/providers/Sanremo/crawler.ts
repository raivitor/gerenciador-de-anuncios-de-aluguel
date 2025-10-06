import type { Page } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import filtro from './filtro.json';
export class SanRemoCrawler extends PuppeteerCrawler {
  constructor() {
    super('sanremo');
  }

  baseURL = 'https://www.sanremoimoveis.com.br';

  protected escapeUnicode(str: string): string {
    return str.replace(/[\u007F-\uFFFF]/g, c => {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  protected buildPageUrl(): string {
    const url = new URL(this.baseURL + '/aluguel/apartamento/bairro+sc+florianopolis+agronomica');

    const suggestArray = filtro.suggest.map(s => ({
      ...s,
      slug: s.slug.replace(/\s+/g, '+'),
    }));

    // serializa normal
    let suggestParam = JSON.stringify(suggestArray);

    // força unicode (se precisar)
    suggestParam = this.escapeUnicode(suggestParam);

    url.searchParams.set('suggest', suggestParam);
    url.searchParams.set('finalidade', filtro.finalidade);
    url.searchParams.set('valorMaximo', this.maxValue.toString());
    url.searchParams.set('vagas', filtro.vagas);
    url.searchParams.set('areaMinima', this.minSize.toString());
    url.searchParams.set('tipos', filtro.tipos);

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
    //this.scrollToBottom(page);

    const { rawListaApto } = await page.evaluate(() => {
      const baseURL = 'https://www.sanremoimoveis.com.br';
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
          url_apartamento: baseURL + url_apartamento,
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

    const listaApartamento: Apartamento[] = [];
    for (const card of rawListaApto) {
      await page.goto(card.url_apartamento, { waitUntil: 'networkidle2', timeout: 60_000 });
      await page
        .waitForSelector('.BoxFloat_Values_Complementation', { timeout: 30_000 })
        .catch(() => null);

      const { iptu, condominio, bairro } = await page.evaluate(() => {
        const boxValores = document.querySelector('.BoxFloat_Values_Complementation');
        const boxEndereco = document.querySelector(
          'div.DetailProperty_Address_Label h2'
        )?.textContent;
        let iptu = 0,
          condominio = 0,
          bairro = '';

        if (boxValores) {
          const iptuText = boxValores.querySelector('p:nth-child(1) strong')?.textContent || '';
          const condominioText =
            boxValores.querySelector('p:nth-child(2) strong')?.textContent || '';
          iptu = this.parseFloat(iptuText.replace(/[^\d,]/g, ''));
          condominio = this.parseFloat(condominioText.replace(/[^\d,]/g, ''));
        }
        if (boxEndereco) {
          bairro = boxEndereco.split(' - ')[1].split(',')[0].trim();
        }
        return { iptu, condominio, bairro };
      });

      listaApartamento.push({
        id: `${this.name}_${String(card.id)}`,
        valor_aluguel: this.parseFloat(card.valor_aluguel),
        valor_total: this.parseFloat(card.valor_aluguel) + condominio + iptu,
        url_apartamento: card.url_apartamento,
        bairro,
        tamanho: Number(card.tamanho),
        quartos: this.parseFloat(card.quartos),
        banheiros: this.parseFloat(card.banheiros),
        garagem: this.parseFloat(card.garagem),
        corretora: this.name,
      });
    }
    return listaApartamento;
  }
}

const sanRemoCrawler = new SanRemoCrawler();
export default sanRemoCrawler;
