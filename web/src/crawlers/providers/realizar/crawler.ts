import type { Page } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';

interface RawListing {
  id: string;
  url: string;
  rent: string;
  total?: string | null;
  bairro?: string | null;
  size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage?: number | null;
}

export class RealizarCrawler extends PuppeteerCrawler {
  baseURL: string;
  private readonly origin = 'https://realizarimoveisfloripa.com.br';

  constructor() {
    super('realizar');
    this.baseURL = this.buildBaseUrl();
  }

  private buildBaseUrl(): string {
    const url = new URL('/busca', this.origin);
    url.searchParams.set('finalidade', 'Aluguel');
    url.searchParams.set('cidade', 'Florianópolis');
    url.searchParams.set('vagas', '1');
    url.searchParams.set('max', this.maxValue.toFixed(2));
    url.searchParams.set('areaPrivativaMin', this.minSize.toFixed(2));
    url.searchParams.set(
      'bairro',
      [
        'Trindade',
        'agronômica',
        'Agronomica',
        'Agronômica',
        'Carvoeira',
        'Córrego Grande',
        'Corrego Grande',
        'Itacorubi',
        'JOAO PAULO',
        'João Paulo',
        'Joao Paulo',
        'joão paulo',
        'joao paulo',
        'Joao paulo',
        'Monte Verde',
        'pantanal',
        'Pantanal',
        'Santa Mônica',
        'Santa Monica',
      ].join(',')
    );

    return url.toString();
  }

  protected async navigateToListingsPage(page: Page): Promise<void> {
    await page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('.swiper-wrapper', { timeout: 60_000 });
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    await this.navigateToListingsPage(page);

    const { rawListaApto } = await page.evaluate(() => {
      const totalResultados =
        document
          .querySelector<HTMLElement>('span.text-base.font-normal')
          ?.innerText.split(' de ')[1] || '0';

      const cards = document.querySelectorAll('div.mb-10 > div > a');
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
          url_apartamento: `https://realizarimoveisfloripa.com.br${url_apartamento}`,
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
        const boxInformacoes = document.querySelectorAll('div.DetailProperty_About_Text p');
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
        if (boxInformacoes) {
          bairro = boxInformacoes[2]?.querySelector<HTMLElement>('b')?.textContent || '0';
        }
        return { iptu, condominio, bairro };
      });

      // listaApartamento.push({
      //   id: `${this.name}_${String(card.id)}`,
      //   valor_aluguel: this.parseFloat(card.valor_aluguel),
      //   valor_total: this.parseFloat(card.valor_aluguel) + condominio + iptu,
      //   url_apartamento: card.url_apartamento,
      //   bairro,
      //   tamanho: Number(card.tamanho),
      //   quartos: this.parseFloat(card.quartos),
      //   banheiros: this.parseFloat(card.banheiros),
      //   garagem: this.parseFloat(card.garagem),
      // });
    }
    return listaApartamento;
  }
}

const realizarCrawler = new RealizarCrawler();

export default realizarCrawler;
