import { api } from "./api";
import type { IFornecedor } from "../types/backend";

export class FornecedorService {
  static async getAll(): Promise<IFornecedor[]> {
    const response = await api.get("/fornecedor");
    return response.data;
  }

  static async getById(id: number | string): Promise<IFornecedor> {
    const response = await api.get(`/fornecedor/${id}`);
    return response.data;
  }

  static async create(data: Partial<IFornecedor>): Promise<IFornecedor> {
    const response = await api.post("/fornecedor", data);
    return response.data;
  }

  static async update(
    id: number | string,
    data: Partial<IFornecedor>,
  ): Promise<IFornecedor> {
    const response = await api.put(`/fornecedor/${id}`, data);
    return response.data;
  }

  static async delete(id: number | string): Promise<void> {
    await api.delete(`/fornecedor/${id}`);
  }
}
