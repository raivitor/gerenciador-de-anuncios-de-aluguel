import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import puppeteer, { Browser, Page } from 'puppeteer';

export interface IbagyListing {
  valor_aluguel: number;
  valor_total: number;
  url_apartamento: string;
  observacao: string;
  tag: string;
}

const IBAGY_URL =
  'https://ibagy.com.br/aluguel/apartamento/florianopolis/2-3-dormitorios/com-vaga/?categoriagrupo=Residencial&finalidade=aluguel&tipo_residencial[]=apartamento&cidadebairro[]=florianopolis&dormitorios[]=2&dormitorios[]=3&vagas[]=1&valorvenda=0,1099999&valorlocacao=0,4000&filterpacote=Sim&area=75,509&codigo=&ordenar=maior_area_priv&pagina=1';

const ITEMS_PER_PAGE = 12;
const MAX_PAGES = 50;
const IBAGY_OUTPUT_PATH = join(process.cwd(), 'src/data/ibaggy_anuncio.json');

const cleanMoney = (value: string | null | undefined): string => {
  if (!value) {
    return '0';
  }

  return value
    .replace(/R\$\s*/gi, '')
    .replace(/[^0-9.,]/g, '')
    .replace(/\s+/g, '')
    .trim();
};

const parseMoney = (value: string | null | undefined): number => {
  const cleaned = cleanMoney(value);
  if (!cleaned) {
    return 0;
  }

  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const setPageDefaults = async (page: Page): Promise<void> => {
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
};

const buildPageUrl = (pageNumber: number): string => {
  const url = new URL(IBAGY_URL);
  url.searchParams.set('pagina', pageNumber.toString());
  return url.toString();
};

const navigateToListingsPage = async (page: Page, pageNumber: number): Promise<void> => {
  await page.goto(buildPageUrl(pageNumber), { waitUntil: 'networkidle2', timeout: 90_000 });
  await page.waitForSelector('.imovel-box-single', { timeout: 60_000 }).catch(() => null);
};

interface RawIbagyListing {
  id: number;
  valor_aluguel: string | null | undefined;
  valor_total: string | null | undefined;
  url_apartamento: string | null | undefined;
  observacao?: string;
  tag?: string;
}

interface RawIbagyEvaluateResult {
  listings: RawIbagyListing[];
  totalItems: number;
}

export default async function scrapeIbagy(): Promise<IbagyListing[]> {
  let browser: Browser | undefined;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await setPageDefaults(page);

    const aggregatedListings: IbagyListing[] = [];

    let currentPage = 1;
    let totalItems: number | null = null;

    while (true) {
      await navigateToListingsPage(page, currentPage);

      const { listings: rawListings, totalItems: reportedTotal } = await page.evaluate(
        (): RawIbagyEvaluateResult => {
          const getTotalItens = (doc: Document): number => {
            const totalsNode = doc.querySelector<HTMLElement>('p.result-totals-phrase');
            const digits = totalsNode?.innerText.replace(/\D/g, '');
            return digits ? parseInt(digits, 10) : 0;
          };

          const cards = document.querySelectorAll<HTMLDivElement>('.imovel-box-single');

          const listings = Array.from(cards).map(card => {
            const aluguelRaw =
              card.querySelector<HTMLElement>('.thumb-price')?.textContent ||
              card.querySelector<HTMLElement>('.item-price-rent')?.textContent ||
              '';

            const totalRaw =
              card.querySelector<HTMLElement>('.valor-total-grid-imovel b')?.textContent || '';

            const urlLink =
              card.querySelector<HTMLAnchorElement>('.titulo-anuncio a')?.href ||
              card.querySelector<HTMLAnchorElement>("a[href*='/imovel/']")?.href ||
              '';

            return {
              id: parseInt(urlLink.split('imovel/')[1].split('/')[0], 10) || 0,
              valor_aluguel: aluguelRaw ?? '',
              valor_total: totalRaw || aluguelRaw || '',
              url_apartamento: urlLink ?? '',
              observacao: '',
              tag: '',
            };
          });

          return {
            listings,
            totalItems: getTotalItens(document),
          };
        }
      );

      if (!rawListings.length) {
        break;
      }

      if (totalItems === null && reportedTotal > 0) {
        totalItems = reportedTotal;
      }

      aggregatedListings.push(
        ...rawListings.map((listing: RawIbagyListing) => ({
          id: listing.id,
          valor_aluguel: parseMoney(listing.valor_aluguel),
          valor_total: parseMoney(listing.valor_total ?? listing.valor_aluguel),
          url_apartamento: listing.url_apartamento ?? '',
          observacao: listing.observacao ?? '',
          tag: listing.tag ?? '',
        }))
      );

      if (totalItems === null && rawListings.length < ITEMS_PER_PAGE) {
        break;
      }

      const expectedTotal = totalItems ?? Number.MAX_SAFE_INTEGER;

      if (aggregatedListings.length >= expectedTotal) {
        break;
      }

      currentPage += 1;

      if (totalItems !== null) {
        const maxPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (currentPage > maxPages) {
          break;
        }
      } else if (currentPage > MAX_PAGES) {
        console.warn(
          `Stopped pagination after reaching the safety limit of ${MAX_PAGES} pages without a reported total.`
        );
        break;
      }
    }

    if (totalItems && aggregatedListings.length !== totalItems) {
      console.warn(
        `Ibagy listings count mismatch. Expected ${totalItems}, extracted ${aggregatedListings.length}.`
      );
    }

    await writeFile(IBAGY_OUTPUT_PATH, JSON.stringify(aggregatedListings, null, 2), 'utf-8');

    return aggregatedListings;
  } finally {
    await browser?.close();
  }
}
