import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load } from 'cheerio';
import {
  IntelectoCrawler,
  SEARCH_URL,
  searchPageUrl,
} from '../../src/crawlers/providers/intelecto/crawler.ts';
import {
  listingCode,
  parseBrazilianNumber,
  parseSearch,
  parseDetail,
  meetsLimits,
} from '../../src/crawlers/providers/intelecto/parser.ts';

const searchHtml = await readFile(new URL('./search.html', import.meta.url), 'utf8');
const detailHtml = await readFile(new URL('./detail.html', import.meta.url), 'utf8');
const chargesHtml = await readFile(new URL('./charges.html', import.meta.url), 'utf8');
const search = parseSearch(searchHtml, SEARCH_URL);
const card = search.cards.find(card => card.code === 'L9400880');
const listing = parseDetail(detailHtml, card);

function detailWith({
  rent = '3.000',
  total,
  charges = [],
  description = '',
  area = '89 m²',
} = {}) {
  const $ = load(detailHtml);
  $('[class*="property-values_priceValue"]').text(rent);
  $('[class*="property-description_text"]').text(description);
  if (total !== undefined)
    $('[class*="property-values_contractColumn"]').append(
      `<span class="property-values_additionalValue__test">${total}</span>`
    );
  for (const [label, value] of charges)
    $('[class*="property-values_wrapper"]').append(
      `<div class="property-values_additionalItem__test"><span class="property-values_additionalLabel__test">${label}</span><span class="property-values_additionalPrice__test">${value}</span></div>`
    );
  $('[class*="property-characteristics-icons_property__"]').each((_, element) => {
    if ($(element).find('[class*="_itemTitle__"]').text() === 'Área útil') {
      if (area === null) $(element).remove();
      else $(element).find('[class*="_text__"]').text(area);
    }
  });
  return $.html();
}

test('valores brasileiros e códigos alfanuméricos', () => {
  assert.equal(parseBrazilianNumber('R$ 1.234.567,89/mês'), 1234567.89);
  assert.equal(parseBrazilianNumber('50,5 m²'), 50.5);
  assert.equal(parseBrazilianNumber('Sob consulta'), undefined);
  for (const code of ['L9400880', 'LA935865', '9400963']) {
    assert.equal(listingCode(`https://example.com/imovel/apartamento/${code}`), code);
  }
  assert.throws(() => listingCode('https://example.com/imovel/apartamento/'));
});

test('preserva todos os parâmetros da busca durante paginação', () => {
  const original = new URL(SEARCH_URL);
  original.searchParams.append('endereco', '[{"cidade":"Natal"}]');
  const next = new URL(searchPageUrl(original.toString(), 2));
  for (const [key, value] of original.searchParams) assert.equal(next.searchParams.get(key), value);
  assert.equal(next.searchParams.get('pagina'), '2');
  assert.equal(JSON.parse(next.searchParams.get('quartos')), '2,3');
  assert.equal(JSON.parse(next.searchParams.get('garagens')), '1,2');
});

test('cards reais, última página e características estruturadas', () => {
  assert.equal(search.cards.length, 9);
  assert.equal(search.hasNext, false);
  assert.equal(listing.id, 'intelecto_L9400880');
  assert.equal(listing.bairro, 'Barro Vermelho');
  assert.equal(listing.tamanho, 89); // Área total é 80; preferir a útil.
  assert.equal(listing.quartos, 3);
  assert.equal(listing.banheiros, 2);
  assert.equal(listing.garagem, 1); // A descrição diverge dos campos estruturados.
  assert.equal(listing.valor_total, 3000);
  assert.equal(listing.corretora, 'intelecto');
});

test('total publicado tem prioridade sobre a soma de encargos', () => {
  const result = parseDetail(
    detailWith({
      total: 'R$ 3.600,00',
      charges: [
        ['Condomínio', 'R$ 900'],
        ['IPTU', 'R$ 100'],
      ],
    }),
    card
  );
  assert.equal(result.valor_total, 3600);
  const realCard = search.cards.find(card => card.code === 'L9400967');
  assert.equal(parseDetail(chargesHtml, realCard).valor_total, 1900);
});

test('soma encargos publicados sem duplicar e respeita inclusões e isenções', () => {
  const charges = [
    ['Condomínio', 'R$ 450,50'],
    ['IPTU', 'R$ 100,25'],
    ['Seguro incêndio', 'R$ 49,25'],
    ['Condomínio', 'R$ 450,50'],
  ];
  assert.equal(parseDetail(detailWith({ charges }), card).valor_total, 3600);
  assert.equal(
    parseDetail(detailWith({ charges, description: 'Taxas inclusas!!!' }), card).valor_total,
    3000
  );
  assert.equal(
    parseDetail(detailWith({ charges, description: 'Taxas não inclusas.' }), card).valor_total,
    3600
  );
  assert.equal(
    parseDetail(
      detailWith({
        charges: [
          ['Condomínio', 'R$ 450 (incluso)'],
          ['IPTU', 'Isento'],
          ['Seguro', 'R$ 50'],
        ],
      }),
      card
    ).valor_total,
    3050
  );
  assert.equal(
    parseDetail(
      detailWith({
        charges: [
          ['Condomínio', 'R$ 450'],
          ['IPTU', 'R$ 100'],
        ],
        description: 'Condomínio incluso e IPTU de R$ 100,00.',
      }),
      card
    ).valor_total,
    3100
  );
});

test('limites são inclusivos e imóveis sem dados suficientes são excluídos', () => {
  const boundary = parseDetail(detailWith({ rent: '3.600,00', area: '50 m²' }), card);
  assert.equal(meetsLimits(boundary, 50, 3600), true);
  for (const changed of [
    { valor_total: 3600.01 },
    { tamanho: 49.99 },
    { quartos: 1 },
    { garagem: 3 },
    { valor_total: NaN },
  ]) {
    assert.equal(meetsLimits({ ...boundary, ...changed }, 50, 3600), false);
  }
  assert.equal(parseDetail(detailWith({ rent: 'Sob consulta' }), card), undefined);
  assert.equal(parseDetail(detailWith({ area: 'Não informado' }), card), undefined);
  assert.equal(
    parseDetail(detailWith({ charges: [['Condomínio', 'Sob consulta']] }), card),
    undefined
  );
  assert.equal(parseDetail(detailWith({ total: 'Sob consulta' }), card), undefined);
  assert.equal(parseDetail(detailWith({ area: null }), { ...card, area: 60 }).tamanho, 60);
  assert.equal(parseDetail(detailWith({ area: null }), { ...card, area: undefined }), undefined);
});

test('busca vazia confirmada difere de carregamento incompleto', () => {
  assert.deepEqual(
    parseSearch(
      '<span class="list-search-header_numberOfResults__x">0 resultados</span><p>Nenhum imóvel encontrado</p>',
      SEARCH_URL
    ),
    { cards: [], total: 0, hasNext: false }
  );
  for (const html of [
    '<p>Buscando resultados...</p>',
    '<span class="list-search-header_numberOfResults__x">0 resultados</span>',
    '<p>Erro de carregamento</p>',
  ])
    assert.throws(() => parseSearch(html, SEARCH_URL));
  assert.throws(() => parseDetail('<h1>Erro</h1>', card));
  assert.throws(() => parseDetail(detailHtml, { ...card, code: 'L123' }));
});

class FixtureCrawler extends IntelectoCrawler {
  constructor(pages) {
    super();
    this.pages = pages;
    this.visited = [];
    this.details = [];
  }
  async readSearchPage(_page, number) {
    this.visited.push(number);
    const result = this.pages[number - 1];
    if (result instanceof Error) throw result;
    return result;
  }
  async readDetail(_page, card) {
    this.details.push(card.code);
    return { ...listing, id: `intelecto_${card.code}` };
  }
  async scrape() {
    return this.scrapeWithPage({});
  }
}

test('percorre páginas e deduplica anúncios antes de visitar detalhes', async () => {
  const a = { ...card, code: 'L1' },
    b = { ...card, code: 'L2' };
  const crawler = new FixtureCrawler([
    { cards: [a, a], total: 3, hasNext: true },
    { cards: [a, b], total: 3, hasNext: false },
  ]);
  assert.equal((await crawler.scrape()).length, 2);
  assert.deepEqual(crawler.visited, [1, 2]);
  assert.deepEqual(crawler.details, ['L1', 'L2']);
});

test('páginas repetidas interrompem a coleta sem loop', async () => {
  const result = { cards: [card], total: 40, hasNext: true };
  const crawler = new FixtureCrawler([result, result]);
  await assert.rejects(() => crawler.scrape(), /página repetida/);
  assert.deepEqual(crawler.visited, [1, 2]);
});

test('busca vazia encerra sem detalhes', async () => {
  const crawler = new FixtureCrawler([{ cards: [], total: 0, hasNext: false }]);
  assert.deepEqual(await crawler.scrape(), []);
  assert.deepEqual(crawler.details, []);
});

test('falhas de navegação/extração preservam o arquivo anterior', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'intelecto-test-'));
  try {
    for (const failure of ['busca', 'detalhe']) {
      const crawler = new FixtureCrawler(
        failure === 'busca'
          ? [new Error('falha de carregamento')]
          : [{ cards: [card], total: 1, hasNext: false }]
      );
      if (failure === 'detalhe')
        crawler.readDetail = async () => {
          throw new Error('falha de extração');
        };
      const path = join(dir, 'intelecto_anuncio.json');
      Object.defineProperty(crawler, 'outputPath', { get: () => path });
      await writeFile(path, '[{"id":"anterior"}]');
      await assert.rejects(() => crawler.run(), /falha/);
      assert.equal(await readFile(path, 'utf8'), '[{"id":"anterior"}]');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('erros HTTP e redirecionamentos são propagados', async () => {
  const crawler = new IntelectoCrawler();
  await assert.rejects(
    () =>
      crawler.navigate({ goto: async () => ({ ok: () => false, status: () => 503 }) }, SEARCH_URL),
    /HTTP 503/
  );
  await assert.rejects(
    () =>
      crawler.navigate(
        {
          goto: async () => ({ ok: () => true }),
          url: () => 'https://www.intelectoimobiliaria.com/',
        },
        SEARCH_URL
      ),
    /redirecionamento/
  );
});

test('navegador espera cards após rolagem e detalhes carregados em blocos', async () => {
  const { createServer } = await import('node:http');
  const { default: puppeteer } = await import('puppeteer');
  const $ = load(searchHtml);
  const lastCard = $('a[href*="/imovel/"]:has(article)').last().parent().remove();
  const delayedCard = $.html(lastCard);
  const lazySearch =
    $.html() +
    `<style>body{min-height:4000px}</style><script>
    window.addEventListener('scroll', () => {
      setTimeout(() => document.querySelector('[class*="building-card-pages_list"]').insertAdjacentHTML('beforeend', ${JSON.stringify(delayedCard)}), 100);
    }, {once: true});
  </script>`;
  const delayedDetail = `<section class="HeadTextSection">
    <div class="property-values_wrapper__test">Preço carregado</div>
    <div class="component-skeleton_skeleton__test"></div>
    </section><section class="DescriptionSection"></section><script>
    setTimeout(() => { document.body.innerHTML = ${JSON.stringify(detailHtml)} + '<section class="DescriptionSection"></section>'; }, 200);
    </script>`;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url.startsWith('/fail')) {
      res.writeHead(503);
      res.end('Indisponível');
    } else res.end(req.url.startsWith('/imovel/') ? delayedDetail : lazySearch);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const crawler = new IntelectoCrawler(`${origin}/alugar?quartos=%222%2C3%22`);
    const result = await crawler.readSearchPage(page, 1);
    assert.equal(result.cards.length, 9);
    const localCard = { ...card, url: `${origin}${new URL(card.url).pathname}` };
    assert.equal((await crawler.readDetail(page, localCard)).id, listing.id);
    await assert.rejects(() => crawler.navigate(page, `${origin}/fail`), /HTTP 503/);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
