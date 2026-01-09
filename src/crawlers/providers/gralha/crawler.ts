import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'node:https';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';
import { filters, getGralhaParams } from './filters';

export class GralhaCrawler extends BaseCrawler {
  constructor() {
    super('gralha');
  }

  baseURL = 'https://www.gralhaalugueis.com.br';

  private readonly axiosConfig = {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 15000,
    httpsAgent: new https.Agent({ family: 4 }),
  };

  protected async scrape(): Promise<Apartamento[]> {
    const listAlugueis: Apartamento[] = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
      do {
        const params = getGralhaParams(filters, this.maxValue, this.minSize, currentPage);
        const apiUrl = `${this.baseURL}/api/anuncios/search`;

        const { data } = await axios.get(apiUrl, {
          ...this.axiosConfig,
          params,
        });

        if (!data?.items?.length) break;

        totalPages = Math.ceil(data.total / data.pagesize);

        const pageResults = await Promise.all(
          data.items.map(async (item: any) => {
            const urlApartamento = `${this.baseURL}/imovel/${item.url}/${item.id}`;
            const { iptu, condominio } = await this.fetchDetails(urlApartamento);

            return {
              id: `${this.name}_${item.codigo}`,
              valor_aluguel: item.valorLocacao,
              valor_total: item.valorLocacao + iptu + condominio,
              url_apartamento: urlApartamento,
              bairro: item.bairro,
              tamanho: item.areaConstruida,
              quartos: item.quartos,
              banheiros: item.banheiros,
              garagem: item.vagas,
              corretora: this.name,
            };
          })
        );

        listAlugueis.push(...pageResults);
        currentPage++;
      } while (currentPage <= totalPages);
    } catch (error) {
      console.error(`[Gralha] Erro fatal no crawler:`, error);
    }

    return listAlugueis;
  }

  private async fetchDetails(url: string): Promise<{ iptu: number; condominio: number }> {
    try {
      const { data } = await axios.get(url, this.axiosConfig);
      const $ = cheerio.load(data);

      const boxValores = $('.BoxFloat_Values_Complementation');
      if (!boxValores.length) return { iptu: 0, condominio: 0 };

      const iptuText = boxValores.find('p:nth-child(1) strong').text();
      const condominioText = boxValores.find('p:nth-child(2) strong').text();

      return {
        iptu: this.parseFloat(iptuText),
        condominio: this.parseFloat(condominioText),
      };
    } catch (error) {
      console.error(`[Gralha] Erro ao buscar detalhes (${url})`);
      return { iptu: 0, condominio: 0 };
    }
  }
}

const gralhaCrawler = new GralhaCrawler();
export default gralhaCrawler;
