export interface RealizarFilters {
  finalidade: string;
  cidade: string;
  vagas: string;
  dormitorios: string;
  areaTotalMin: string;
}

export const filters: RealizarFilters = {
  finalidade: 'Aluguel',
  cidade: 'Florianópolis',
  vagas: '1',
  dormitorios: '2',
  areaTotalMin: '60',
};

export function encodeFilters(
  customFilters: RealizarFilters,
  maxValue: number,
  minSize: number,
  page = 1
): string {
  const params = new URLSearchParams();
  params.set('finalidade', customFilters.finalidade);
  params.set('cidade', customFilters.cidade);
  params.set('vagas', customFilters.vagas);
  params.set('max', maxValue.toFixed(2));
  params.set('areaPrivativaMin', minSize.toFixed(2));
  params.set('areaTotalMin', parseFloat(customFilters.areaTotalMin).toFixed(2));
  params.set('dormitorios', customFilters.dormitorios);
  params.set('page', page.toString());

  return params.toString();
}
