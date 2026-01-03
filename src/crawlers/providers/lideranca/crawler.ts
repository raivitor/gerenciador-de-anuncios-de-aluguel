import type { Page, LaunchOptions } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export class LiderancaCrawler extends PuppeteerCrawler {
  baseURL = 'https://liderancaimobiliaria.com.br';

  constructor() {
    super('lideranca');
  }

  protected getLaunchOptions(): LaunchOptions {
    const options = super.getLaunchOptions();
    return {
      ...options,
      args: [...(options.args || []), '--ignore-certificate-errors'],
    };
  }

  private buildBaseUrl(pageNumber: number): string {
    const url = new URL('/busca', this.baseURL);
    url.searchParams.set('finalidade', 'Aluguel');
    url.searchParams.set('cidade', 'Florianópolis');
    //url.searchParams.set('dormitorios', '2');
    url.searchParams.set('vagas', '1');
    url.searchParams.set('max', this.maxValue.toFixed(2));
    url.searchParams.set('page', pageNumber.toString());
    url.searchParams.set('areaPrivativaMin', this.minSize.toFixed(2));

    return url.toString();
  }

  protected async navigateToListingsPage(page: Page, pageNumber: number): Promise<void> {
    const url = this.buildBaseUrl(pageNumber);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForSelector('div.mb-10 > div > a', { timeout: 60_000 }).catch(() => null);
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    let currentPage = 1;
    let totalItems = 0;
    const listaAgregadaApto = [];
    while (true) {
      await this.navigateToListingsPage(page, currentPage);

      const { rawListaApto, totalBusca } = await page.evaluate(() => {
        const getTotalItens = (doc: Document): number => {
          const spanNode = doc.querySelector<HTMLElement>('span.text-base.font-normal');
          if (!spanNode) return 0;
          const match = spanNode.innerText.match(/de\s+(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };

        const cards = document.querySelectorAll('div.mb-10 > div > a');
        const rawListaApto = Array.from(cards).map(card => {
          const href = card.getAttribute('href') || '';
          return {
            url_apartamento: `https://liderancaimobiliaria.com.br${href}`,
          };
        });

        return { rawListaApto, totalBusca: getTotalItens(document) };
      });
      listaAgregadaApto.push(...rawListaApto);
      if (!rawListaApto.length) break;
      if (totalBusca > 0) totalItems = totalBusca;
      if (listaAgregadaApto.length >= totalItems) break;
      currentPage += 1;
    }

    const listaApartamento: Apartamento[] = [];
    for (const card of listaAgregadaApto) {
      try {
        await page.goto(card.url_apartamento, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page
          .waitForSelector('section.flex.flex-col.gap-8', { timeout: 30_000 })
          .catch(() => null);

        const {
          valor_aluguel,
          condominio,
          iptu,
          tamanho,
          quartos,
          banheiros,
          garagem,
          id,
          bairro,
        } = await page.evaluate(() => {
          const id =
            document
              .querySelector('.bg-white.text-brand.py-1.px-3.text-xs.font-medium.rounded-full')
              ?.textContent?.split(' ')[1]
              .trim() || '';
          const bairro =
            document.querySelector('h3.text-sm.font-medium')?.textContent?.split(',')[0]?.trim() ||
            '';
          const boxValores = document.querySelectorAll('div.flex.flex-col.items-start.pb-6')[0];
          let valor_aluguel = '',
            condominio = '',
            iptu = '';
          let tamanho = 0,
            quartos = 0,
            banheiros = 0,
            garagem = 0;

          if (boxValores) {
            // pega todos os spans que batem e usa sempre o último (p.ex. quando existe '/ mês' em um span filho)
            const aluguelSpans = boxValores.querySelectorAll(
              'span.flex-shrink-0.text-2xl.font-bold.pb-4'
            );
            valor_aluguel = aluguelSpans[aluguelSpans.length - 1]?.textContent || '';

            const rows = boxValores.querySelectorAll('.py-3');
            rows.forEach(row => {
              const label =
                row.querySelector('.flex-1 span')?.textContent?.trim().toLowerCase() || '';
              const amountText = row.querySelectorAll('span')?.[1]?.textContent || '';

              if (label.includes('condom')) {
                condominio = amountText;
              } else if (label.includes('iptu')) {
                iptu = amountText;
              }
            });
          }

          const headers = Array.from(document.querySelectorAll('h4'));
          const charHeader = headers.find(h =>
            (h.textContent || '').toLowerCase().includes('caracter')
          );
          const container = charHeader ? charHeader.parentElement : null;
          const list = container ? container.querySelector('ul') : null;
          if (list) {
            const items = Array.from(list.children);
            items.forEach(item => {
              const text = (item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

              const areaMatch = text.match(/(\d+)\s*(?:m2|m²)/i);
              if (areaMatch && (text.includes('privat') || text.includes('área'))) {
                tamanho = parseInt(areaMatch[1], 10) || tamanho;
              }

              if (text.includes('dormit')) {
                const n = text.match(/(\d+)/);
                if (n) quartos = parseInt(n[1], 10) || quartos;
              }

              if (text.includes('banheiro')) {
                const n = text.match(/(\d+)/);
                if (n) banheiros = parseInt(n[1], 10) || banheiros;
              }

              if (text.includes('vaga')) {
                const n = text.match(/(\d+)/);
                if (n) garagem = parseInt(n[1], 10) || garagem;
              }
            });
          }

          return {
            valor_aluguel,
            condominio,
            iptu,
            tamanho,
            quartos,
            banheiros,
            garagem,
            id,
            bairro,
          };
        });

        listaApartamento.push({
          id: `${this.name}_${id}`,
          valor_aluguel: this.parseFloat(valor_aluguel),
          valor_total:
            this.parseFloat(valor_aluguel) + this.parseFloat(condominio) + this.parseFloat(iptu),
          url_apartamento: card.url_apartamento,
          bairro,
          tamanho: Number(tamanho),
          quartos: Number(quartos),
          banheiros: Number(banheiros),
          garagem: Number(garagem),
          corretora: this.name,
        });
      } catch (error) {
        console.error(`[LIDERANCA] Erro ao processar imóvel ${card.url_apartamento}:`, error);
      }
    }
    return listaApartamento;
  }
}

const liderancaCrawler = new LiderancaCrawler();

export default liderancaCrawler;
