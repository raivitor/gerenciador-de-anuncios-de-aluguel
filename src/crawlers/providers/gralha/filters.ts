export interface GralhaFilters {
  finalidade: string;
  tipos: string;
  vagas: string;
  quartos: string;
}

export const filters: GralhaFilters = {
  finalidade: 'aluguel',
  tipos: 'apartamento',
  vagas: '1, 2',
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
    cidadeId: 34,
    cidade: 'Florian\u00f3polis',
    estadoSigla: 'SC',
    empreendimento: null,
    condominio: null,
    agrupamentoId: null,
    agrupamento: null,
  },
];

export function getGralhaParams(
  customFilters: GralhaFilters,
  maxValue: number,
  minSize: number,
  page = 1
) {
  return {
    suggest: JSON.stringify(SUGGEST_FLORIANOPOLIS),
    finalidade: customFilters.finalidade,
    valorMaximo: maxValue.toString(),
    quartos: customFilters.quartos,
    vagas: customFilters.vagas,
    areaMinima: minSize.toString(),
    tipos: customFilters.tipos,
    page: page.toString(),
  };
}
