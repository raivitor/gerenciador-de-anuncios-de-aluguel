import axios from 'axios';

import { BaseCrawler } from '@/crawlers/core/base-crawler';
import type { Apartamento } from '@/crawlers/core/types';

import { encodeFilters, filters } from './filters';

interface RegenteImovel {
  Codigo: string;
  TituloSite: string;
  Categoria: string;
  Bairro: string;
  Cidade: string;
  ValorVenda: string;
  ValorLocacao: string;
  Dormitorios: string;
  Vagas: string;
  AreaTotal: string;
  FotoDestaque: string;
  FotoDestaquePequena: string;
  Finalidade: string;
  DescricaoWeb: string;
  TotalBanheiros: string;
  ValorIptu: string;
  ValorCondominio: string;
  Status: string;
}

interface RegenteApiResponse {
  success: boolean;
  data: Record<
    string,
    RegenteImovel | { total: number; paginas: number; pagina: number; quantidade: number }
  >;
}

const toNumber = (text: string | number): number => {
  if (typeof text === 'number') return text;
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD') // Normaliza caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/--+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
};

export class RegenteCrawler extends BaseCrawler {
  baseURL = 'https://regenteimoveis.com.br/wp-json/gritsoftware/v1/properties-test';

  constructor() {
    super('regente');
  }

  protected async scrape(): Promise<Apartamento[]> {
    const listAlugueis: Apartamento[] = [];
    let paginaAtual = 1;
    let totalPaginas = 1;

    // Loop para buscar todas as páginas
    do {
      const currentFilters = { ...filters, pagina: paginaAtual };
      const url = `${this.baseURL}?${encodeFilters(currentFilters)}`;

      try {
        const response = await axios.get<RegenteApiResponse>(url);
        const { success, data } = response.data;

        if (!success || !data) {
          console.error(`API retornou erro ou dados vazios na página ${paginaAtual}`);
          break;
        }

        // Extrai os metadados que estão no mesmo nível dos apartamentos
        const { total, paginas, pagina, quantidade, ...imoveisData } = data as any;

        if (paginas) {
          totalPaginas = paginas;
          console.log(
            `Total de imóveis: ${total}, Páginas: ${totalPaginas}, Página atual: ${pagina}`
          );
        }

        // Converte os apartamentos para array (agora sem os metadados)
        const apartamentos = Object.values(imoveisData) as RegenteImovel[];

        // Processa os apartamentos da página atual
        for (const apto of apartamentos) {
          const valorAluguel = toNumber(apto.ValorLocacao);
          const valorIptu = toNumber(apto.ValorIptu);
          const valorCondominio = toNumber(apto.ValorCondominio);

          // Gera a URL completa com o código e o slug do título
          const slug = generateSlug(apto.TituloSite);
          const urlApartamento = `https://regenteimoveis.com.br/imovel/${apto.Codigo}/${slug}`;

          const aluguel: Apartamento = {
            id: apto.Codigo,
            valor_aluguel: valorAluguel,
            valor_total: valorAluguel + valorIptu + valorCondominio,
            url_apartamento: urlApartamento,
            bairro: apto.Bairro,
            tamanho: parseFloat(apto.AreaTotal),
            quartos: toNumber(apto.Dormitorios),
            banheiros: toNumber(apto.TotalBanheiros),
            garagem: toNumber(apto.Vagas),
            corretora: this.name,
          };
          listAlugueis.push(aluguel);
        }

        paginaAtual++;

        // Pequeno delay entre requisições para não sobrecarregar a API
        if (paginaAtual <= totalPaginas) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Erro ao buscar página ${paginaAtual}:`, error);
        break;
      }
    } while (paginaAtual <= totalPaginas);

    return listAlugueis;
  }
}

const regenteCrawler = new RegenteCrawler();

export default regenteCrawler;
