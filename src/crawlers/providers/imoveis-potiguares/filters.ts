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

function extractFilters(searchUrl: string) {
  const url = new URL(searchUrl);
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

export function buildPayload(searchUrl: string, page: number): string {
  const filters = extractFilters(searchUrl);
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
