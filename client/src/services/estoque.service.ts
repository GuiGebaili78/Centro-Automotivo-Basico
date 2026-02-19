import { api } from "./api";
import type {
  IPecasEstoque,
  IEstoqueUpdatePayload,
  IEntradaEstoquePayload,
} from "../types/estoque.types";

export const EstoqueService = {
  getAll: async () => {
    const response = await api.get<IPecasEstoque[]>("/pecas-estoque");
    return response.data;
  },

  update: async (id: number, data: IEstoqueUpdatePayload) => {
    const response = await api.put<IPecasEstoque>(`/pecas-estoque/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/pecas-estoque/${id}`);
  },

  searchParts: async (query: string) => {
    const response = await api.get<IPecasEstoque[]>(
      `/pecas-estoque/search?q=${query}`,
    );
    return response.data;
  },

  createEntry: async (data: IEntradaEstoquePayload) => {
    const response = await api.post("/pecas-estoque/entry", data);
    return response.data;
  },
};
