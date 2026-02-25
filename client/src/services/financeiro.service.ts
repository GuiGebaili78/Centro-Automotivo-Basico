import { api } from "./api";
import type {
  IPagamentoPeca,
  IPagamentoCliente,
  IContasPagar,
} from "../types/backend";
import type {
  IPagamentoColaborador,
  IPendenciaColaborador,
} from "../types/financeiro.types";

export class FinanceiroService {
  // --- PEÇAS (Pagamentos a Fornecedores) ---
  static async getPagamentosPeca(): Promise<IPagamentoPeca[]> {
    const response = await api.get("/pagamento-peca");
    // Normalize response: backend returns { data: [], pagination: {} }
    return Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  }

  static async createPagamentoPeca(data: any): Promise<IPagamentoPeca> {
    const response = await api.post("/pagamento-peca", data);
    return response.data;
  }

  static async updatePagamentoPeca(
    id: number | string,
    data: Partial<IPagamentoPeca>,
  ): Promise<IPagamentoPeca> {
    const response = await api.put(`/pagamento-peca/${id}`, data);
    return response.data;
  }

  static async deletePagamentoPeca(id: number | string): Promise<void> {
    await api.delete(`/pagamento-peca/${id}`);
  }

  static async baixaPagamentoPeca(data: {
    ids: number[];
    desconto_total_aplicado: number;
    id_conta_bancaria: number;
    data_pagamento: string;
  }): Promise<void> {
    await api.post("/pagamento-peca/baixa", data);
  }

  // --- CLIENTES (Recebimentos) ---
  static async getPagamentosCliente(): Promise<IPagamentoCliente[]> {
    const response = await api.get("/pagamento-cliente");
    return response.data;
  }

  static async createPagamentoCliente(data: any): Promise<IPagamentoCliente> {
    const response = await api.post("/pagamento-cliente", data);
    return response.data;
  }

  static async updatePagamentoCliente(
    id: number | string,
    data: any,
  ): Promise<IPagamentoCliente> {
    const response = await api.put(`/pagamento-cliente/${id}`, data);
    return response.data;
  }

  static async deletePagamentoCliente(id: number | string): Promise<void> {
    await api.delete(`/pagamento-cliente/${id}`);
  }

  // --- AUXILIARES ---
  static async getOperadorasCartao(): Promise<any[]> {
    const response = await api.get("/operadora-cartao");
    return response.data;
  }

  static async getContasBancarias(): Promise<any[]> {
    const response = await api.get("/conta-bancaria");
    return response.data;
  }

  static async createContaBancaria(data: any): Promise<any> {
    const response = await api.post("/conta-bancaria", data);
    return response.data;
  }

  static async updateContaBancaria(
    id: number | string,
    data: any,
  ): Promise<any> {
    const response = await api.put(`/conta-bancaria/${id}`, data);
    return response.data;
  }

  static async createOperadoraCartao(data: any): Promise<any> {
    const response = await api.post("/operadora-cartao", data);
    return response.data;
  }

  static async updateOperadoraCartao(
    id: number | string,
    data: any,
  ): Promise<any> {
    const response = await api.put(`/operadora-cartao/${id}`, data);
    return response.data;
  }

  static async deleteOperadoraCartao(id: number | string): Promise<void> {
    await api.delete(`/operadora-cartao/${id}`);
  }

  // --- RECEBÍVEIS CARTÃO ---
  static async getRecebiveisCartao(filters?: any): Promise<any[]> {
    const response = await api.get("/recebivel-cartao", { params: filters });
    return response.data;
  }

  static async getRecebiveisCartaoByDateRange(
    start: string,
    end: string,
  ): Promise<any[]> {
    const response = await api.get("/recebivel-cartao/date-range", {
      params: { dataInicio: start, dataFim: end },
    });
    return response.data;
  }

  static async confirmarRecebiveis(ids: number[]): Promise<void> {
    await api.post("/recebivel-cartao/confirmar", { ids });
  }

  // --- CATEGORIAS FINANCEIRAS ---
  static async getCategoriasFinanceiras(): Promise<any[]> {
    const response = await api.get("/categoria-financeira");
    return response.data;
  }

  static async createCategoriaFinanceira(data: any): Promise<any> {
    const response = await api.post("/categoria-financeira", data);
    return response.data;
  }

  static async updateCategoriaFinanceira(
    id: number | string,
    data: any,
  ): Promise<any> {
    const response = await api.put(`/categoria-financeira/${id}`, data);
    return response.data;
  }

  static async deleteCategoriaFinanceira(
    id: number | string,
    extraData?: any,
  ): Promise<void> {
    await api.delete(`/categoria-financeira/${id}`, { data: extraData });
  }

  // --- GERAL (Caixa) ---
  static async getLivroCaixa(filters?: any): Promise<any[]> {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/livro-caixa?${params.toString()}`);
    return response.data;
  }

  static async createLivroCaixa(data: any): Promise<any> {
    const response = await api.post("/livro-caixa", data);
    return response.data;
  }

  static async updateLivroCaixa(id: number | string, data: any): Promise<any> {
    const response = await api.put(`/livro-caixa/${id}`, data);
    return response.data;
  }

  static async deleteLivroCaixa(
    id: number | string,
    obs?: string,
  ): Promise<void> {
    await api.delete(`/livro-caixa/${id}`, { data: { obs } });
  }

  // --- COLABORADORES (Pagamentos & Pendências) ---
  static async getPagamentosColaborador(
    filters?: any,
  ): Promise<IPagamentoColaborador[]> {
    const response = await api.get("/pagamento-equipe", { params: filters });
    return response.data;
  }

  static async getPendenciasColaborador(
    idFuncionario: number | string,
  ): Promise<IPendenciaColaborador[]> {
    const response = await api.get(
      `/pagamento-equipe/pendentes/${idFuncionario}`,
    );
    return response.data;
  }

  static async getValesPendentes(
    idFuncionario: number | string,
  ): Promise<any[]> {
    const response = await api.get(`/pagamento-equipe/vales/${idFuncionario}`);
    return response.data;
  }

  static async createPagamentoColaborador(data: any): Promise<any> {
    const response = await api.post("/pagamento-equipe", data);
    return response.data;
  }

  // --- CONTAS A PAGAR (Despesas Gerais) ---
  static async getContasPagar(filters?: any): Promise<IContasPagar[]> {
    const response = await api.get("/contas-pagar", { params: filters });
    return response.data;
  }

  static async createContaPagar(
    data: Partial<IContasPagar> | any,
  ): Promise<IContasPagar> {
    const response = await api.post("/contas-pagar", data);
    return response.data;
  }

  static async updateContaPagar(
    id: number | string,
    data: Partial<IContasPagar> | any,
  ): Promise<IContasPagar> {
    const response = await api.put(`/contas-pagar/${id}`, data);
    return response.data;
  }

  static async deleteContaPagar(
    id: number | string,
    deleteAllRecurrences = false,
  ): Promise<void> {
    const query = deleteAllRecurrences ? "?deleteAllRecurrences=true" : "";
    await api.delete(`/contas-pagar/${id}${query}`);
  }

  static async getRecurrenceInfo(id: number | string): Promise<any> {
    const response = await api.get(`/contas-pagar/${id}/recurrence-info`);
    return response.data;
  }

  // --- FECHAMENTO & CONSOLIDAÇÃO ---
  static async getFechamentos(): Promise<any[]> {
    const response = await api.get("/fechamento-financeiro");
    return response.data;
  }

  static async deleteFechamento(id: number | string): Promise<void> {
    await api.delete(`/fechamento-financeiro/${id}`);
  }

  static async getSummary(filters: any): Promise<{
    totalInflow: number;
    totalOutflow: number;
    balance: number;
  }> {
    const response = await api.get("/financeiro/summary", { params: filters });
    return response.data;
  }

  static async getKPIs(filters: any): Promise<{
    receita: number;
    despesa: number;
    lucro: number;
    margem: number;
    ticket: number;
  }> {
    const response = await api.get("/financeiro/kpis", { params: filters });
    return response.data;
  }

  static async getEvolution(filters: {
    startDate: string;
    endDate: string;
    groupBy?: "day" | "month";
  }): Promise<any[]> {
    const response = await api.get("/financeiro/evolution", {
      params: filters,
    });
    return response.data;
  }

  static async consolidarFechamento(data: {
    idOs: number;
    custoTotalPecasReal: number;
    itemsPecas?: any[];
  }): Promise<any> {
    const response = await api.post("/fechamento-financeiro/consolidar", data);
    return response.data;
  }

  static async updateFechamento(
    id: number | string,
    data: {
      id_os: number;
      custo_total_pecas_real: number;
      itemsPecas?: any[];
    },
  ): Promise<any> {
    const response = await api.put(`/fechamento-financeiro/${id}`, data);
    return response.data;
  }
}
