export interface SanremoFilters {
  finalidade: string;
  tipos: string;
  vagas: string;
  quartos: string;
}

export const filters: SanremoFilters = {
  finalidade: 'aluguel',
  tipos: 'apartamento',
  vagas: '1',
  quartos: '2, 3',
};

const SUGGEST_FLORIANOPOLIS = [
  {
    tipoId: 0,
    tipo: 'Cidades',
    titulo: 'Florian\u00f3polis - SC',
    slug: 'cidade+sc+florianopolis',
    bairroId: 0,
    bairro: null,
    cidadeId: 35,
    cidade: 'Florian\u00f3polis',
    estadoSigla: 'SC',
    empreendimento: null,
    condominio: null,
    agrupamentoId: null,
    agrupamento: null,
  },
];

export function encodeFilters(
  customFilters: SanremoFilters,
  maxValue: number,
  minSize: number,
  page = 1
): string {
  const params = new URLSearchParams({
    suggest: JSON.stringify(SUGGEST_FLORIANOPOLIS),
    ordem: 'Menor Valor',
    finalidade: customFilters.finalidade,
    tipos: customFilters.tipos,
    valorMaximo: maxValue.toString(),
    quartos: customFilters.quartos,
    vagas: customFilters.vagas,
    areaMinima: minSize.toString(),
    page: page.toString(),
  });

  return params.toString();
}
