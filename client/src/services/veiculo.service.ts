import { api } from "./api";
import type { IVeiculo } from "../types/backend";

export const VeiculoService = {
  getAll: async () => {
    const response = await api.get<IVeiculo[]>("/veiculo");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<IVeiculo>(`/veiculo/${id}`);
    return response.data;
  },

  create: async (data: Partial<IVeiculo>) => {
    const response = await api.post<IVeiculo>("/veiculo", data);
    return response.data;
  },

  update: async (id: number, data: Partial<IVeiculo>) => {
    const response = await api.put<IVeiculo>(`/veiculo/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/veiculo/${id}`);
  },

  search: async (term: string) => {
    const response = await api.get<IVeiculo[]>(`/veiculo/search?q=${term}`);
    return response.data;
  },

  getByClienteId: async (_clienteId: number) => {
    // Assuming backend supports filtering or we misuse getAll for now
    return [];
  },
};
