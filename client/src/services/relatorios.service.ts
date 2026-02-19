import { api } from "./api";
import type {
  ResumoFinanceiro,
  PerformanceFuncionario,
  OperadoraStats,
  EvolucaoMensal,
  EvolucaoDespesa,
} from "../types/relatorios.types";

export const RelatoriosService = {
  getResumoFinanceiro: async (
    startDate: string,
    endDate: string,
  ): Promise<ResumoFinanceiro> => {
    const response = await api.get("/relatorios/resumo", {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPerformanceEquipe: async (
    startDate: string,
    endDate: string,
  ): Promise<PerformanceFuncionario[]> => {
    const response = await api.get("/relatorios/equipe", {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getOperadorasCartao: async (
    startDate: string,
    endDate: string,
  ): Promise<OperadoraStats[]> => {
    const response = await api.get("/relatorios/operadoras", {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getEvolucaoMensal: async (
    groupBy: "month" | "quarter" = "month",
  ): Promise<EvolucaoMensal[]> => {
    const response = await api.get("/relatorios/evolucao", {
      params: { groupBy },
    });
    return response.data;
  },

  getEvolucaoDespesas: async (
    startDate: string,
    endDate: string,
  ): Promise<EvolucaoDespesa[]> => {
    const response = await api.get("/relatorios/despesas-evolucao", {
      params: { startDate, endDate },
    });
    return response.data;
  },
};
