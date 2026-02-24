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
}

export interface IItemEntrada {
  tempId: number;
  id_pecas_estoque?: number | null;
  new_part_data?: {
    nome: string;
    descricao: string;
    fabricante: string;
    unidade_medida: string;
    estoque_minimo: number;
  } | null;

  displayName: string;
  quantidade: number;
  valor_custo: number;
  margem_lucro: number;
  valor_venda: number;
  ref_cod?: string;
  obs?: string;
}

export interface IEntradaEstoquePayload {
  id_fornecedor: number;
  nota_fiscal: string;
  data_compra: Date;
  obs: string;
  itens: IItemEntrada[];
  financeiro?: {
    descricao: string;
    valor: number;
    dt_vencimento: string;
    dt_pagamento: string | null;
    status: "PAGO" | "PENDENTE";
  };
}
