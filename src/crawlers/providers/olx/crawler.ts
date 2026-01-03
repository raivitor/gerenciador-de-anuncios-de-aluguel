import type { Page, LaunchOptions } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { encodeFilters, filters } from './filter';

export class OlxCrawler extends PuppeteerCrawler {
  constructor() {
    super('olx');
  }

  protected getLaunchOptions(): LaunchOptions {
    const options = super.getLaunchOptions();
    return {
      ...options,
      args: [...(options.args || []), '--ignore-certificate-errors'],
    };
  }

  baseURL =
    'https://www.olx.com.br/imoveis/aluguel/apartamentos/estado-sc/florianopolis-e-regiao/leste';

  protected buildPageUrl(pageNumber: number): string {
    return `${this.baseURL}?${encodeFilters(filters)}&o=${pageNumber}`;
  }

  protected async navigateToListingsPage(page: Page, pageNumber: number): Promise<void> {
    const url = this.buildPageUrl(pageNumber);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 });
    await page.waitForSelector('h1.olx-text--bold', { timeout: 60_000 }).catch(() => null);
  }

  protected getValueByKey(item: any[] = [], key: string): string {
    const found = item.find((el: any) => el.name === key);
    return found ? found.value : '';
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    let currentPage = 1;
    let totalItems = 0;
    const listaAgregadaApto: Apartamento[] = [];

    while (true) {
      await this.navigateToListingsPage(page, currentPage);

      const { rawListaApto, totalBusca } = await page.evaluate(() => {
        const totalElement = document.querySelector('.text-neutral-110');
        const totalText = totalElement?.textContent || '';
        // Extrai o número que vem depois de "de" (ex: "1 - 50 de 209 resultados")
        const match = totalText.match(/de\s+(\d+)/i);
        const totalResultados = match ? match[1] : '0';

        const json = document.querySelector<HTMLElement>('#__NEXT_DATA__')?.innerText;
        const aptoDados = json ? JSON.parse(json).props.pageProps.ads : [];
        const rawListaApto = aptoDados.map((item: any) => ({
          id: String(item.listId),
          priceValue: item.priceValue,
          url_apartamento: item.friendlyUrl,
          properties: item.properties,
          bairro: item.locationDetails?.neighbourhood || '',
        }));
        return {
          rawListaApto,
          totalBusca: parseInt(totalResultados.replace(/\D/g, ''), 10) || 0,
        };
      });

      if (!rawListaApto.length) break;
      if (totalBusca > 0 && totalItems === 0) {
        totalItems = totalBusca;
      }

      const listaApto = rawListaApto.map((apto: any) => {
        const condominio = this.parseFloat(this.getValueByKey(apto.properties, 'condominio'));
        const rawIptu = this.parseFloat(this.getValueByKey(apto.properties, 'iptu'));
        const iptu = rawIptu > 500 ? rawIptu / 12 : rawIptu;
        const valor_aluguel = this.parseFloat(
          String(apto?.priceValue || '0')
            .replace(/[^\d,.-]/g, '')
            .replace(',', '.')
        );
        return {
          id: `${this.name}_${String(apto.id)}`,
          valor_aluguel,
          valor_total: valor_aluguel + condominio + iptu,
          url_apartamento: apto.url_apartamento,
          bairro: apto.bairro,
          tamanho: this.parseFloat(this.getValueByKey(apto.properties, 'size')),
          quartos: Number(this.getValueByKey(apto.properties, 'rooms')),
          banheiros: Number(this.getValueByKey(apto.properties, 'bathrooms')),
          garagem: Number(this.getValueByKey(apto.properties, 'garage_spaces')),
          corretora: this.name,
        } satisfies Apartamento;
      });

      listaAgregadaApto.push(...listaApto);
      if (listaAgregadaApto.length >= totalItems) break;
      currentPage += 1;
    }

    return listaAgregadaApto;
  }
}

const olxCrawler = new OlxCrawler();
export default olxCrawler;
