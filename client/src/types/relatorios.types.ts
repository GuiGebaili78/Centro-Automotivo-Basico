export interface Periodo {
  start: string;
  end: string;
}

export interface IndicadoresFinanceiros {
  lucroLiquido: number;
  margemLiquida: number;
  pontoEquilibrio: number;
}

export interface ResumoFinanceiro {
  periodo: Periodo;
  bruta: {
    maoDeObra: number;
    pecasTerceiros: number;
    pecasEstoque: number;
    total: number;
  };
  liquida: {
    maoDeObra: number;
    pecasTerceiros: number;
    pecasEstoque: number;
    total: number;
  };
  custos: {
    pecasEstoque: number;
    pecasTerceiros: number;
    equipe: number;
    contas: number;
    total: number;
  };
  despesas: {
    operacional: number;
    fornecedor: number;
    total: number;
  };
  medias: {
    receitaBruta: number;
    lucroLiquido: number;
    despesasTotais: number;
  };
  despesasPorCategoria: { categoria: string; valor: number }[];
  indicadores: IndicadoresFinanceiros;
}

export interface PerformanceFuncionario {
  id: number;
  nome: string;
  maoDeObraBruta: number;
  comissaoPaga: number;
  lucroMaoDeObra: number;
  vendasEstoque: number;
}

export interface EvolucaoDespesaTemporal {
  mes: string;
  realizado: number;
  previsto: number;
}

export interface EvolucaoDespesa {
  categoria: string;
  valorAtual: number;
  valorAnterior: number;
  variacaoPercentual: number;
}

export interface OperadoraStats {
  nome: string;
  totalBruto: number;
  totalTaxas: number;
  totalLiquido: number;
  count: number;
}

export interface EvolucaoMensal {
  label: string;
  receita: number;
  despesa: number;
  lucro: number;
}
