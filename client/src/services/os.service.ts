import { api } from "./api";
import type { IOrdemDeServico } from "../types/backend";
import { OsStatus } from "../types/os.types";

export const OsService = {
  getAll: async () => {
    const response = await api.get<IOrdemDeServico[]>("/ordem-de-servico");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<IOrdemDeServico>(`/ordem-de-servico/${id}`);
    return response.data;
  },

  create: async (data: Partial<IOrdemDeServico>) => {
    const response = await api.post<IOrdemDeServico>("/ordem-de-servico", data);
    return response.data;
  },

  update: async (id: number, data: Partial<IOrdemDeServico>) => {
    const response = await api.put<IOrdemDeServico>(
      `/ordem-de-servico/${id}`,
      data,
    );
    return response.data;
  },

  updateStatus: async (id: number, status: OsStatus) => {
    const response = await api.put<IOrdemDeServico>(`/ordem-de-servico/${id}`, {
      status,
    });
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/ordem-de-servico/${id}`);
  },

  // --- Labor Services ---
  addLabor: async (data: any) => {
    const response = await api.post("/servico-mao-de-obra", data);
    return response.data;
  },

  updateLabor: async (id: number | string, data: any) => {
    const response = await api.put(`/servico-mao-de-obra/${id}`, data);
    return response.data;
  },

  deleteLabor: async (id: number | string) => {
    await api.delete(`/servico-mao-de-obra/${id}`);
  },

  // --- Financial ---
  deleteFinancialClosure: async (id: number) => {
    await api.delete(`/fechamento-financeiro/${id}`);
  },
};
