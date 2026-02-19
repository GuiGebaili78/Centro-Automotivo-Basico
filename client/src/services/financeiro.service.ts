import { api } from "./api";
import type { IPagamentoPeca, IPagamentoCliente } from "../types/backend";

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

  // --- CAIXA / GERAL ---
  // Add other endpoints as needed (e.g. contas-pagar, livro-caixa) when refactoring those specific tabs
}
