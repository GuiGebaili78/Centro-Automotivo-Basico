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
    autoPecas: number;
    estoque: number;
    total: number;
    pecasTerceiros?: number;
    pecasEstoque?: number;
  };
  despesas: {
    maoDeObra: number;
    autoPecas: number;
    oficina: number;
    total: number;
    operacional?: number;
    fornecedor?: number;
  };
  liquida: {
    maoDeObra: number;
    autoPecas: number;
    estoque: number;
    total: number;
    pecasTerceiros?: number;
    pecasEstoque?: number;
  };
  prejuizos?: {
    estoque: number;
    autoPecas: number;
    total: number;
  };
  custos: {
    pecasEstoque: number;
    pecasTerceiros: number;
    equipe: number;
    contas: number;
    total: number;
  };
  medias: {
    receitaBruta: number;
    lucroLiquido: number;
    despesasTotais: number;
  };
  despesasPorCategoria: { categoria: string; valor: number }[];
  indicadores: IndicadoresFinanceiros;
  consumoInterno?: number;
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
  [key: string]: any;
}

export interface TimelineDespesasResponse {
  data: EvolucaoDespesaTemporal[];
  keys: string[];
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
  lucroMaoDeObra?: number;
  lucroEstoque?: number;
  lucroAutoPecas?: number;
}
