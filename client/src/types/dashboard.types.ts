export interface IDashboardStats {
  osAberta: number;
  contasPagarPending: number;
  contasPagarOverdue: number;
  contasPagarHojeCount?: number;
  contasPagarHojeValor?: number;
  contasPagarAmanhaCount?: number;
  contasPagarAmanhaValor?: number;
  contasPagar7DiasCount?: number;
  contasPagar7DiasValor?: number;
  livroCaixaEntries: number;
  livroCaixaExits: number;
  autoPecasPendentes: number;
  consolidacao: number;
  alertaEstoque: number;
}

export interface IDashboardData {
  stats: IDashboardStats;
  recentOss: any[]; // Using any[] for now as IOs might be complex, but ideally IOs
}

export type FilterPeriod = "HOJE" | "SEMANA" | "MES" | "STATUS";
