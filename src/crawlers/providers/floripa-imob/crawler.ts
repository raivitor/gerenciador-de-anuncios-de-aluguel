import type { Page } from 'puppeteer';

import { PuppeteerCrawler } from '@/crawlers/core/puppeteer-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export class FloripaImobCrawler extends PuppeteerCrawler {
  baseURL: string;
  private readonly origin = 'https://floripaimobiliariasc.com.br';

  constructor() {
    super('floripa-imob');
    this.baseURL = this.buildBaseUrl();
  }

  private buildBaseUrl(): string {
    const url = new URL('/busca', this.origin);
    url.searchParams.set('finalidade', 'Aluguel');
    //url.searchParams.set('cidade', 'Florianópolis');
    url.searchParams.set('dormitorios', '3');
    url.searchParams.set('vagas', '1');
    url.searchParams.set('max', this.maxValue.toFixed(2));
    //url.searchParams.set('areaPrivativaMin', this.minSize.toFixed(2));

    return url.toString();
  }

  protected async navigateToListingsPage(page: Page): Promise<void> {
    console.log(`Navigating to listings page: ${this.baseURL}`);
    await page.goto(this.baseURL, { waitUntil: 'networkidle2', timeout: 90_000 });
    await page.waitForSelector('.swiper-wrapper', { timeout: 60_000 });
  }

  protected async scrapeWithPage(page: Page): Promise<Apartamento[]> {
    await this.navigateToListingsPage(page);

    const { rawListaApto } = await page.evaluate(() => {
      const cards = document.querySelectorAll('div.flex.mt-8 > div > a');
      const rawListaApto = Array.from(cards).map(card => {
        const href = card.getAttribute('href') || '';
        return {
          url_apartamento: `https://floripaimobiliariasc.com.br${href}`,
        };
      });

      return { rawListaApto };
    });

    const listaApartamento: Apartamento[] = [];
    for (const card of rawListaApto) {
      await page.goto(card.url_apartamento, { waitUntil: 'networkidle2', timeout: 60_000 });
      await page.waitForSelector('section.flex.flex-col.gap-8', { timeout: 30_000 });

      const { valor_aluguel, condominio, iptu, tamanho, quartos, banheiros, garagem, id, bairro } =
        await page.evaluate(() => {
          const id =
            document
              .querySelector('.bg-white.text-brand.py-1.px-3.text-xs.font-medium.rounded-full')
              ?.textContent?.split(' ')[1]
              .trim() || '';
          const bairro =
            document.querySelector('h3.text-sm.font-normal')?.textContent?.split(',')[0]?.trim() ||
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
        id,
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
    }
    return listaApartamento;
  }
}

const floripaImobCrawler = new FloripaImobCrawler();

export default floripaImobCrawler;
