import axios from 'axios';
import * as cheerio from 'cheerio';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

export const SEARCH_URL =
  'https://www.imoveispotiguares.com.br/aluguel/apartamento/natal/todos-os-bairros/todos-os-condominios/todas-as-opcoes/2-quartos+1-vagas?valor_max=3.000,00&area_min=45&pagina=1';

const API_URL = 'https://www.imoveispotiguares.com.br/retornar-imoveis-disponiveis';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

interface ImoveisPotiguaresItem {
  codigo: number;
  titulo?: string;
  codigoauxiliar?: string;
  finalidade?: string;
  valor?: string;
  valorcondominio?: string;
  bairro?: string;
  cidade?: string;
  numeroquartos?: string;
  numerobanhos?: string;
  numerovagas?: string;
  areaprincipal?: string;
  areainterna?: string;
  url_amigavel?: string;
}

interface ImoveisPotiguaresApiResponse {
  quantidade?: number;
  lista?: ImoveisPotiguaresItem[];
}

interface RawCardData {
  code: string;
  bairro: string;
  valorAluguel: number;
  tamanho: number;
  quartos: number;
  banheiros: number;
  garagem: number;
  urlApartamento: string;
}

const CITY_MAP: Record<string, { codigo: number; nome: string; estado: string; estadoUrl: string }> = {
  natal: { codigo: 1, nome: 'Natal', estado: 'RN', estadoUrl: 'rn' },
  parnamirim: { codigo: 2, nome: 'Parnamirim', estado: 'RN', estadoUrl: 'rn' },
  'sao-miguel-do-gostoso': { codigo: 4, nome: 'São Miguel do Gostoso', estado: 'RN', estadoUrl: 'rn' },
  'tibau-do-sul': { codigo: 5, nome: 'Tibau do Sul', estado: 'RN', estadoUrl: 'rn' },
  'nisia-floresta': { codigo: 7, nome: 'Nísia Floresta', estado: 'RN', estadoUrl: 'rn' },
  macaiba: { codigo: 10, nome: 'Macaíba', estado: 'RN', estadoUrl: 'rn' },
  mossoro: { codigo: 12, nome: 'Mossoró', estado: 'RN', estadoUrl: 'rn' },
  touros: { codigo: 15, nome: 'Touros', estado: 'RN', estadoUrl: 'rn' },
  bananeiras: { codigo: 18, nome: 'Bananeiras', estado: 'PB', estadoUrl: 'pb' },
  'sao-jose-de-mipibu': { codigo: 19, nome: 'São José de Mipibu', estado: 'RN', estadoUrl: 'rn' },
  'serra-de-sao-bento': { codigo: 20, nome: 'Serra de São Bento', estado: 'RN', estadoUrl: 'rn' },
};

const TYPE_MAP: Record<string, { codigo: number; nome: string }> = {
  apartamento: { codigo: 2, nome: 'Apartamento' },
  casa: { codigo: 1, nome: 'Casa' },
  cobertura: { codigo: 18, nome: 'Cobertura' },
  flat: { codigo: 12, nome: 'Flat' },
  kitnet: { codigo: 10, nome: 'Kitnet' },
  'area-privativa': { codigo: 17, nome: 'Área privativa' },
  chacara: { codigo: 16, nome: 'Chácara' },
  galpao: { codigo: 11, nome: 'Galpão' },
  loja: { codigo: 5, nome: 'Loja' },
  predio: { codigo: 6, nome: 'Prédio' },
  sala: { codigo: 7, nome: 'Sala' },
  terreno: { codigo: 8, nome: 'Terreno' },
};

export class ImoveisPotiguaresCrawler extends BaseCrawler {
  baseURL: string;

  constructor(baseURL = SEARCH_URL) {
    super('imoveis-potiguares');
    this.baseURL = baseURL;
  }

  private parsePrice(value: string | undefined): number {
    if (!value) return 0;
    const match = value.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i);
    const target = match ? match[1] : value;
    const cleaned = target.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const val = Number.parseFloat(cleaned);
    return Number.isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  private parseArea(value: string | undefined): number {
    if (!value) return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const val = Number.parseFloat(cleaned);
    return Number.isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  private extractFilters() {
    const url = new URL(this.baseURL);
    const pathParts = url.pathname.split('/').filter(Boolean);

    const finalidade = pathParts[0] || 'aluguel';
    const tipoUrl = pathParts[1] || 'apartamento';
    const cidadeNomeUrl = pathParts[2] || 'natal';
    const bairroUrl = pathParts[3] || 'todos-os-bairros';
    const condominioUrl = pathParts[4] || 'todos-os-condominios';
    const opcaoImovelUrl = pathParts[5] || 'todas-as-opcoes';

    const featureParams = (pathParts[6] || '').split('+');
    let quartos = '2-quartos';
    let vagas = '1-vagas';

    for (const feature of featureParams) {
      if (feature.includes('quarto')) {
        quartos = feature;
      } else if (feature.includes('vaga')) {
        vagas = feature;
      }
    }

    const valorMax = url.searchParams.get('valor_max') || '3.000,00';
    const valorMin = url.searchParams.get('valor_min') || '0';
    const areaMin = url.searchParams.get('area_min') || '45';
    const areaMax = url.searchParams.get('area_max') || '0';

    return {
      finalidade,
      tipoUrl,
      cidadeNomeUrl,
      bairroUrl,
      condominioUrl,
      opcaoImovelUrl,
      quartos,
      vagas,
      valorMax,
      valorMin,
      areaMin,
      areaMax,
    };
  }

  protected buildPayload(page: number): string {
    const filters = this.extractFilters();
    const city = CITY_MAP[filters.cidadeNomeUrl] || {
      codigo: 1,
      nome: 'Natal',
      estado: 'RN',
      estadoUrl: 'rn',
    };
    const type = TYPE_MAP[filters.tipoUrl] || { codigo: 2, nome: 'Apartamento' };

    const params = new URLSearchParams({
      finalidade: filters.finalidade,
      codigounidade: '',
      codigocondominio: '0',
      codigoproprietario: '0',
      codigocaptador: '0',
      codigosimovei: '0',
      'tipos[0][codigo]': String(type.codigo),
      'tipos[0][nome]': type.nome,
      'tipos[0][url_amigavel]': filters.tipoUrl,
      codigocidade: String(city.codigo),
      codigoregiao: '0',
      'bairros[0][cidade]': '',
      'bairros[0][codigo]': '',
      'bairros[0][estado]': '',
      'bairros[0][estadoUrl]': '',
      'bairros[0][nome]': 'Todos',
      'bairros[0][nomeUrl]': filters.bairroUrl,
      'bairros[0][regiao]': '',
      endereco: '',
      edificio: '',
      numeroquartos: filters.quartos,
      numerovagas: filters.vagas,
      numerobanhos: '0',
      numerosuite: '0',
      numerovaranda: '0',
      numeroelevador: '0',
      valorde: filters.valorMin,
      valorate: filters.valorMax,
      areade: filters.areaMin,
      areaate: filters.areaMax,
      areaexternade: '0',
      areaexternaate: '0',
      extras: '',
      destaque: '0',
      'opcaoimovel[codigo]': '0',
      'opcaoimovel[nome]': '',
      'opcaoimovel[nomeUrl]': filters.opcaoImovelUrl,
      codigoOpcaoimovel: '0',
      numeropagina: String(page),
      numeroregistros: '20',
      ordenacao: 'dataatualizacaodesc',
      'cidades[codigo]': String(city.codigo),
      'cidades[nome]': city.nome,
      'cidades[estado]': city.estado,
      'cidades[nomeUrl]': filters.cidadeNomeUrl,
      'cidades[estadoUrl]': city.estadoUrl,
      'condominio[codigo]': '0',
      'condominio[nome]': '',
      'condominio[nomeUrl]': filters.condominioUrl,
    });

    return params.toString();
  }

  private async fetchTotalValue(url: string, rentValue: number): Promise<number> {
    try {
      const response = await axios.get<string>(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: 15_000,
      });
      const $ = cheerio.load(response.data);

      let total = 0;
      $('.preco-total').each((_, el) => {
        const text = $(el).text();
        if (text.includes('R$')) {
          const parsed = this.parsePrice(text);
          if (parsed > 0) {
            total = parsed;
          }
        }
      });

      if (total > 0) {
        return total;
      }
    } catch (error) {
      console.warn(`[ImoveisPotiguares] Falha ao obter detalhes de ${url}:`, error);
    }
    return rentValue;
  }

  protected async scrape(): Promise<Apartamento[]> {
    const rawCards: RawCardData[] = [];
    let currentPage = 1;

    while (true) {
      const postData = this.buildPayload(currentPage);

      const response = await axios.post<ImoveisPotiguaresApiResponse>(API_URL, postData, {
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: this.baseURL,
        },
        timeout: 30_000,
      });

      const items = response.data?.lista || [];
      if (items.length === 0) break;

      for (const item of items) {
        const code = String(item.codigo);
        const bairro = item.bairro?.trim() || '';
        const valorAluguel = this.parsePrice(item.valor);
        const tamanho = this.parseArea(item.areaprincipal || item.areainterna);
        const quartos = Number.parseInt(item.numeroquartos || '0', 10) || 0;
        const banheiros = Number.parseInt(item.numerobanhos || '0', 10) || 0;
        const garagem = Number.parseInt(item.numerovagas || '0', 10) || 0;

        const slug = item.url_amigavel || 'apartamento';
        const urlApartamento = `https://www.imoveispotiguares.com.br/imovel/${slug}/${code}`;

        rawCards.push({
          code,
          bairro,
          valorAluguel,
          tamanho,
          quartos,
          banheiros,
          garagem,
          urlApartamento,
        });
      }

      const totalDisponivel = response.data?.quantidade ?? 0;
      if (currentPage * 20 >= totalDisponivel) {
        break;
      }

      currentPage++;
    }

    // Deduplicação por código
    const uniqueCards = Array.from(new Map(rawCards.map(c => [c.code, c])).values());

    // Enriquecimento com valor total (incluindo encargos/IPTU/condomínio)
    const listings: Apartamento[] = await Promise.all(
      uniqueCards.map(async card => {
        const valorTotal = await this.fetchTotalValue(card.urlApartamento, card.valorAluguel);

        return {
          id: `${this.name}_${card.code}`,
          valor_aluguel: card.valorAluguel,
          valor_total: valorTotal,
          url_apartamento: card.urlApartamento,
          bairro: card.bairro,
          tamanho: card.tamanho,
          quartos: card.quartos,
          banheiros: card.banheiros,
          garagem: card.garagem,
          corretora: this.name,
        };
      })
    );

    return listings;
  }
}

const imoveisPotiguaresCrawler = new ImoveisPotiguaresCrawler();

export default imoveisPotiguaresCrawler;
