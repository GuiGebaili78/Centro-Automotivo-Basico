import { api } from "./api";
import type {
  IFornecedor,
  IFornecedorPayload,
} from "../types/fornecedor.types";

export const FornecedorService = {
  getAll: async () => {
    const response = await api.get<IFornecedor[]>("/pessoa?is_fornecedor=true");
    return response.data;
  },

  create: async (data: IFornecedorPayload) => {
    // Inject the flag for backend
    const payload = { ...data, is_fornecedor: true };
    const response = await api.post<IFornecedor>("/pessoa", payload);
    return response.data;
  },

  update: async (id: number, data: IFornecedorPayload) => {
    const response = await api.put<IFornecedor>(`/pessoa/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/pessoa/${id}`);
  },
};
