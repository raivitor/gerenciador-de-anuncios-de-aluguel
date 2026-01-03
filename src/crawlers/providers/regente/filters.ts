import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface RegenteFilters {
  quartos: number[];
  vagas: number[];
  finalidade: string;
  tipo_imovel: string;
  preco_max: number;
  area_min: number;
  pagina: number;
  quantidade: number;
  cidade: string;
}

/**
 * Filtros para busca de imóveis na API da Regente
 * Ajuste os valores abaixo para customizar a busca
 */
export const filters: RegenteFilters = {
  quartos: [2, 3], // Número de quartos (opcional)
  vagas: [1, 2], // Número de vagas de garagem (opcional)
  finalidade: 'Aluguel', // Aluguel ou Venda
  tipo_imovel: 'Apartamento', // Ex: 'Apartamento', 'Casa' (deixe vazio para todos os tipos)
  preco_max: DEFAULT_MAX_VALUE, // Preço máximo
  area_min: DEFAULT_MIN_SIZE, // Área mínima em m²
  pagina: 1, // Página inicial da busca
  quantidade: 25, // Quantidade de resultados por página
  cidade: 'Florianópolis', // Cidade para busca
};

export const encodeFilters = (regenteFilters: RegenteFilters): string => {
  const params = new URLSearchParams();

  //params.append('quartos', regenteFilters.quartos.join(','));
  params.append('vagas', regenteFilters.vagas.join(','));
  params.append('finalidade', regenteFilters.finalidade);
  params.append('tipo_imovel', regenteFilters.tipo_imovel);
  params.append('preco_max', regenteFilters.preco_max.toString());
  params.append('area_min', regenteFilters.area_min.toString());
  params.append('pagina', regenteFilters.pagina.toString());
  params.append('quantidade', regenteFilters.quantidade.toString());
  params.append('cidade', regenteFilters.cidade);

  return params.toString();
};
