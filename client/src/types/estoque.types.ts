import type { IPecasEstoque } from "./backend";

export type { IPecasEstoque };

export interface IEstoqueUpdatePayload {
  nome: string;
  fabricante: string;
  descricao: string;
  unidade_medida: string;
  valor_custo: number;
  valor_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  modelo?: string;
  id_categoria?: number | null;
}

export interface IItemEntrada {
  tempId: number;
  /** ID real do ItemEntrada no banco (presente apenas no modo edição) */
  id_item_entrada?: number;
  id_pecas_estoque?: number | null;
  new_part_data?: {
    nome: string;
    descricao: string;
    fabricante: string;
    localizacao?: string;
    unidade_medida: string;
    estoque_minimo: number;
    modelo?: string;
    id_categoria?: number | null;
    condicao?: string;
    _update_master?: boolean;
  } | null;

  displayName: string;
  quantidade: number;
  valor_custo: number;
  margem_lucro: number;
  valor_venda: number;
  ref_cod?: string;
  condicao?: string;
  aplicacao?: string;
  obs?: string;
  /** Marcado como true no modo edição quando o usuário quer remover o item */
  _delete?: boolean;
  /** Marcado como true quando a linha do item foi editada com sucesso */
  _edited?: boolean;
  /** Marcado como true enquanto a linha está sendo editada */
  _editing?: boolean;
  /** Temporário: Armazena o modelo selecionado antes do envio */
  modelo?: string;
  /** Temporário: Armazena a categoria selecionada antes do envio */
  id_categoria?: number | null;
}

export interface IEntradaEstoquePayload {
  id_fornecedor: number;
  nota_fiscal: string;
  data_compra: Date;
  obs: string;
  itens: IItemEntrada[];
  nf_numero?: string | null;
}
