import type { ICliente, IVeiculo } from "../types/backend";

// Re-export common types
export type { ICliente, IVeiculo };

export interface IClientePayload {
  // Pessoa fields
  nome?: string;
  genero?: string | null;
  dt_nascimento?: string | null;
  obs?: string | null;

  // Pessoa Fisica specific
  cpf?: string | null;

  // Pessoa Juridica specific
  razao_social?: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;

  // Cliente fields
  tipo_pessoa: 1 | 2; // 1 = PF, 2 = PJ
  telefone_1: string;
  telefone_2?: string | null;
  email?: string | null;
  logradouro?: string;
  nr_logradouro?: string;
  compl_logradouro?: string | null;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface IVeiculoPayload {
  id_cliente: number;
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano_modelo: string;
  combustivel: string;
  chassi?: string;
  obs?: string;
}

export interface IClientSearchResult {
  id_cliente: number;
  email: string;
  telefone_1: string;
  pessoa_fisica?: {
    pessoa: { nome: string };
    cpf: string;
  };
  pessoa_juridica?: {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
  };
}
