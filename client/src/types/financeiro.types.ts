export type FinanceiroTab =
  | "AUTO_PECAS"
  | "LIVRO_CAIXA"
  | "CONTAS_PAGAR"
  | "COLABORADORES";

export type PaymentStatusFilter = "PENDING" | "PAID" | "ALL";

export interface IFinanceiroStatusMsg {
  type: "success" | "error" | null;
  text: string;
}

export type CashBookEntryType = "IN" | "OUT";

export interface ICashBookEntry {
  id: string;
  date: string;
  description: string;
  type: CashBookEntryType;
  value: number;
  details: string;
}

export interface IPaymentFilters {
  status: PaymentStatusFilter;
  supplier: string;
  plate: string;
  startDate: string;
  endDate: string;
}

export interface ICashBookFilters {
  startDate: string;
  endDate: string;
  search: string;
}

// --- COLLABORATORS (Pagamento Colaborador) ---
export interface IPendenciaColaborador {
  type: "COMISSAO" | "VALE" | "PREMIO" | "SALARIO";
  id: string | number;
  date: string;
  description?: string;
  value: number;
  // Specifics
  ver_os?: number;
  os?: any;
  commissionValue?: number;
  percentage?: number;
  paymentId?: number;
  paymentMethod?: string;
}

export interface IPagamentoColaborador {
  id_pagamento_equipe: number;
  id_funcionario: number;
  dt_pagamento: string;
  valor_total: number;
  obs?: string;
  forma_pagamento?: string;
  tipo_lancamento: "COMISSAO" | "VALE" | "SALARIO" | "PREMIO";
  servicos_pagos?: any[];
  premio_valor?: number;
  premio_descricao?: string;
}

// --- ACCOUNTS PAYABLE (Contas a Pagar) ---
export interface IContaPagar {
  id_conta_pagar: number;
  descricao: string;
  credor?: string;
  categoria?: string;
  id_categoria?: number;
  valor: number;
  dt_emissao?: string;
  dt_vencimento: string;
  dt_pagamento?: string | null;
  num_documento?: string;
  status: "PENDENTE" | "PAGO" | "ATRASADO";
  url_anexo?: string;
  obs?: string;
  dt_cadastro?: string;
  id_recorrencia?: number;
  parcela_atual?: number;
  total_parcelas?: number;
}
