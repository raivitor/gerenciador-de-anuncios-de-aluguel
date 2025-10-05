import type { Page } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export class DudaCrawler extends PuppeteerCrawler {
  constructor() {
    super('duda');
  }

  baseURL = `https://dudaimoveis.com.br/aluguel/apartamento/florianopolis/monte-verde/com-vaga/?categoriagrupo=Residencial&finalidade=aluguel&tipo_residencial%5B%5D=apartamento&cidadebairro%5B%5D=florianopolis%2C%20trindade&cidadebairro%5B%5D=florianopolis%2C%20joao-paulo&cidadebairro%5B%5D=florianopolis%2C%20itacorubi&cidadebairro%5B%5D=florianopolis%2C%20carvoeira&cidadebairro%5B%5D=florianopolis%2C%20corrego-grande&cidadebairro%5B%5D=florianopolis%2C%20pantanal&cidadebairro%5B%5D=florianopolis%2C%20agronomica&cidadebairro%5B%5D=florianopolis%2C%20monte-verde&vagas%5B%5D=1&valorvenda=0%2C1099999&valorlocacao=0%2C${this.maxValue}&area=${this.minSize}%2C509&codigo=&ordenar=exclusivosDesc&pagina=1`;
  protected buildPageUrl(pageNumber: number): string {
    const url = new URL(this.baseURL);
    url.searchParams.set('pagina', pageNumber.toString());
    return url.toString();
  }

  protected async navigateToListingsPage(page: Page, pageNumber: number): Promise<void> {
    const url = this.buildPageUrl(pageNumber);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('.imovel-box-single', { timeout: 60_000 }).catch(() => null);
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    let currentPage = 1;
    let totalItems = 0;
    const listaAgregadaApto: Apartamento[] = [];

    while (true) {
      await this.navigateToListingsPage(page, currentPage);

      const { rawListaApto, totalBusca } = await page.evaluate(() => {
        const getTotalItens = (doc: Document): number => {
          const totalsNode = doc.querySelector<HTMLElement>('p.result-totals-phrase');
          const digits = totalsNode?.innerText.replace(/\D/g, '');
          return digits ? parseInt(digits, 10) : 0;
        };

        const normalizeKey = (key: string) =>
          key
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')
            .replace('.', '')
            .toLowerCase();

        const cards = document.querySelectorAll<HTMLDivElement>('.imovel-box-single');

        const rawListaApto = Array.from(cards).map(card => {
          const aluguelRaw =
            card.querySelector<HTMLElement>('.thumb-price')?.textContent ||
            card.querySelector<HTMLElement>('.item-price-rent')?.textContent ||
            '';
          const condominioRaw =
            card.querySelector<HTMLElement>('.item-price-condominio')?.textContent || '';
          const iptuRaw = card.querySelector<HTMLElement>('.item-price-iptu')?.textContent || '';

          const urlLink =
            card.querySelector<HTMLAnchorElement>('.titulo-anuncio a')?.href ||
            card.querySelector<HTMLAnchorElement>("a[href*='/imovel/']")?.href ||
            '';

          const endereco =
            card.querySelector<HTMLElement>('h3[itemprop="streetAddress"]')?.innerText.trim() || '';
          const bairro = endereco.split('-')[0].trim() || '';

          const container = card.querySelector('.property-amenities.amenities-main');
          const divs = container?.querySelectorAll(':scope > div') || [];

          const properties = Array.from(divs).reduce((acc, div) => {
            const rawKey = div.querySelector('small')?.innerText.trim() || '';
            const key = normalizeKey(rawKey);

            let value = div.querySelector('span')?.innerText.trim() || '';
            value = value.replace(/[^\d]/g, '');
            acc[key] = Number(value);

            return acc;
          }, {} as Record<string, number>);

          return {
            id: urlLink.split('imovel/')[1]?.split('/')?.[0] ?? '',
            valor_aluguel: aluguelRaw || '0',
            condominio: condominioRaw || '0',
            iptuRaw: this.parseFloat(iptuRaw) > 500 ? (this.parseFloat(iptuRaw) / 12) : this.parseFloat(iptuRaw) || 0,
            url_apartamento: urlLink || '',
            bairro: bairro,
            tamanho: properties.privat,
            quartos: properties.quartos,
            banheiros: properties.suite ? properties.suite + 1 : 1,
            garagem: properties.vaga,
          };
        });

        return {
          rawListaApto,
          totalBusca: getTotalItens(document),
        };
      });

      if (!rawListaApto.length) break;
      if (totalBusca > 0) totalItems = totalBusca;

      const listaApto = rawListaApto.map(apto => {
        const valor_aluguel = this.parseFloat(apto.valor_aluguel);
        const valor_total =
          this.parseFloat(apto.condominio) + apto.iptuRaw + valor_aluguel;

        return {
          id: `${this.name}_${String(apto.id)}`,
          valor_aluguel,
          valor_total,
          url_apartamento: apto.url_apartamento,
          bairro: apto.bairro,
          tamanho: apto.tamanho,
          quartos: apto.quartos,
          banheiros: apto.banheiros,
          garagem: apto.garagem,
        } satisfies Apartamento;
      });

      listaAgregadaApto.push(...listaApto);
      if (listaAgregadaApto.length >= totalItems) break;
      currentPage += 1;
    }

    return listaAgregadaApto;
  }
}

const dudaCrawler = new DudaCrawler();

export default dudaCrawler;
