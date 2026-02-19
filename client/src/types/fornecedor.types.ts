import type { IFornecedor } from "./backend";

export type { IFornecedor };

export interface IFornecedorPayload {
  tipo_pessoa: "FISICA" | "JURIDICA";
  nome: string;
  nome_fantasia?: string;
  documento?: string; // CPF or CNPJ
  inscricao_estadual?: string;
  inscricao_municipal?: string;

  // Contact
  contato?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;

  // Address
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  // Finance
  banco?: string;
  agencia?: string;
  conta?: string;
  chave_pix?: string;
  condicoes_pagamento?: string;
  categoria_produto?: string;

  // Extra
  obs?: string;
}
