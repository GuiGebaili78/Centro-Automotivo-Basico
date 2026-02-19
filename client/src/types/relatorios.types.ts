export interface Periodo {
  start: string;
  end: string;
}

export interface IndicadoresFinanceiros {
  lucroLiquido: number;
  pontoEquilibrio: number;
}

export interface ResumoFinanceiro {
  periodo: Periodo;
  bruta: {
    maoDeObra: number;
    pecasFora: number;
    pecasEstoque: number;
    total: number;
  };
  liquida: {
    maoDeObra: number;
    pecasFora: number;
    pecasEstoque: number;
    total: number;
  };
  custos: {
    pecasEstoque: number;
    pecasFora: number;
    equipe: number;
    contas: number;
    total: number;
  };
  despesasPorCategoria: { categoria: string; valor: number }[];
  indicadores: IndicadoresFinanceiros;
}

export interface PerformanceFuncionario {
  id: number;
  nome: string;
  totalProduzido: number;
  custoPeriodo: number;
  roi: number;
}

export interface OperadoraStats {
  nome: string;
  totalBruto: number;
  totalTaxas: number;
  totalLiquido: number;
  count: number;
}

export interface EvolucaoMensal {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
}
