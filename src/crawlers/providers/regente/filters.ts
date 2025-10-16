import { DEFAULT_MAX_VALUE, DEFAULT_MIN_SIZE } from '@/crawlers/core/base-crawler';

export interface RegenteFilters {
  quartos?: number;
  vagas?: number;
  finalidade: string;
  codigo: string;
  tipo_imovel: string;
  preco_min: string;
  preco_max: number;
  area_min: number;
  area_max: string;
  pagina: number;
  quantidade: number;
  cidade: string;
}

/**
 * Filtros para busca de imóveis na API da Regente
 * Ajuste os valores abaixo para customizar a busca
 */
export const filters: RegenteFilters = {
  quartos: 3, // Número de quartos (opcional)
  vagas: 1, // Número de vagas de garagem (opcional)
  finalidade: 'Aluguel', // Aluguel ou Venda
  codigo: '', // Código específico do imóvel (deixe vazio para buscar todos)
  tipo_imovel: '', // Ex: 'Apartamento', 'Casa' (deixe vazio para todos os tipos)
  preco_min: '', // Preço mínimo (deixe vazio para sem limite inferior)
  preco_max: DEFAULT_MAX_VALUE, // Preço máximo
  area_min: DEFAULT_MIN_SIZE, // Área mínima em m²
  area_max: '', // Área máxima (deixe vazio para sem limite superior)
  pagina: 1, // Página inicial da busca
  quantidade: 25, // Quantidade de resultados por página
  cidade: 'Florianópolis', // Cidade para busca
};

export const encodeFilters = (regenteFilters: RegenteFilters): string => {
  const params = new URLSearchParams();

  //if (regenteFilters.quartos) params.append('quartos', regenteFilters.quartos.toString());
  if (regenteFilters.vagas) params.append('vagas', regenteFilters.vagas.toString());
  params.append('finalidade', regenteFilters.finalidade);
  params.append('codigo', regenteFilters.codigo);
  params.append('tipo_imovel', regenteFilters.tipo_imovel);
  params.append('preco_min', regenteFilters.preco_min);
  params.append('preco_max', regenteFilters.preco_max.toString());
  params.append('area_min', regenteFilters.area_min.toString());
  params.append('area_max', regenteFilters.area_max);
  params.append('pagina', regenteFilters.pagina.toString());
  params.append('quantidade', regenteFilters.quantidade.toString());
  params.append('cidade', regenteFilters.cidade);

  return params.toString();
};
