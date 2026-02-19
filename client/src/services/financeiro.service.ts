import { api } from "./api";
import type { IPagamentoPeca, IPagamentoCliente } from "../types/backend";
import type {
  IPagamentoColaborador,
  IPendenciaColaborador,
  IContaPagar,
} from "../types/financeiro.types";

export class FinanceiroService {
  // --- PEÇAS (Pagamentos a Fornecedores) ---
  static async getPagamentosPeca(): Promise<IPagamentoPeca[]> {
    const response = await api.get("/pagamento-peca");
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

  // --- CLIENTES (Recebimentos) ---
  static async getPagamentosCliente(): Promise<IPagamentoCliente[]> {
    // Note: Verify endpoint availability. Based on FinanceiroPage it was used.
    const response = await api.get("/pagamento-cliente");
    return response.data;
  }

  // --- GERAL (Caixa) ---
  static async getLivroCaixa(filters?: any): Promise<any[]> {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/livro-caixa?${params.toString()}`);
    return response.data;
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
  static async getContasPagar(filters?: any): Promise<IContaPagar[]> {
    const response = await api.get("/contas-pagar", { params: filters });
    return response.data;
  }

  static async createContaPagar(
    data: Partial<IContaPagar>,
  ): Promise<IContaPagar> {
    const response = await api.post("/contas-pagar", data);
    return response.data;
  }

  static async updateContaPagar(
    id: number | string,
    data: Partial<IContaPagar>,
  ): Promise<IContaPagar> {
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
}
