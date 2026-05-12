import { api } from "./api";
import type {
  IFornecedor,
  IFornecedorPayload,
} from "../types/fornecedor.types";

export const FornecedorService = {
  getAll: async () => {
    const response = await api.get<IFornecedor[]>("/fornecedor");
    return response.data;
  },

  create: async (data: IFornecedorPayload) => {
    const response = await api.post<IFornecedor>("/fornecedor", data);
    return response.data;
  },

  update: async (id: number, data: IFornecedorPayload) => {
    const response = await api.put<IFornecedor>(`/fornecedor/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fornecedor/${id}`);
  },
};
