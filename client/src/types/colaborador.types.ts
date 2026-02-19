import type { IFuncionario } from "./backend";

export type { IFuncionario };

export interface IFuncionarioPayload {
  // Relation (optional if new)
  id_pessoa_fisica?: number;

  // Fields
  ativo: "S" | "N";
  cargo: string;
  salario?: number | null; // deprecated in favor of valor_pagamento usually
  valor_pagamento?: number | null;
  tipo_pagamento?: string | null;

  comissao?: number | null;
  comissao_pecas?: number | null;

  dt_admissao: string; // ISO Date
  obs?: string | null;

  // MEI
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj_mei?: string | null;
  inscricao_municipal?: string | null;

  // Personal / Address (for creation flow)
  rg?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone_pessoal?: string | null;
  email_pessoal?: string | null;

  especialidade?: string | null;

  // Finance
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  periodicidade_pagamento?: string | null;
  dia_vencimento?: number | null;

  // Docs
  url_ccmei?: string | null;
  url_cnh?: string | null;
  equipamentos_epis?: string | null;
}

export interface IPessoaCreatePayload {
  nome: string;
  genero?: string | null;
  dt_nascimento?: string | null;
}

export interface IPessoaFisicaCreatePayload {
  id_pessoa: number;
  cpf?: string | null;
}
