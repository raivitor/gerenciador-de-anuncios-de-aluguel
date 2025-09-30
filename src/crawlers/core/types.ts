import type { Tag } from '@/app/types/tag';

export interface Apartamento {
  id: string;
  valor_aluguel: number;
  valor_total: number;
  url_apartamento: string;
  bairro?: string;
  tamanho?: number;
  quartos?: number;
  banheiros?: number;
  garagem?: number;
  observacao?: string;
  tag?: Tag;
  nota?: number;
}
