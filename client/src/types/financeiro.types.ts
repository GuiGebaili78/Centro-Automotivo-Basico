export type FinanceiroTab = "AUTO_PECAS" | "LIVRO_CAIXA" | "CONTAS_PAGAR";

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
