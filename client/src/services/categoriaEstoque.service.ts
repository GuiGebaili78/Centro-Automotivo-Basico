import { api } from "./api";

export interface ICategoriaEstoque {
  id_categoria: number;
  nome: string;
  ativo: boolean;
}

export const CategoriaEstoqueService = {
  getAll: async () => {
    const response = await api.get<ICategoriaEstoque[]>("/categorias-estoque");
    return response.data;
  },

  create: async (nome: string) => {
    const response = await api.post<ICategoriaEstoque>("/categorias-estoque", { nome });
    return response.data;
  },

  update: async (id: number, nome: string) => {
    const response = await api.put<ICategoriaEstoque>(`/categorias-estoque/${id}`, { nome });
    return response.data;
  },

  delete: async (id: number, replacementCategory?: string) => {
    const response = await api.delete(`/categorias-estoque/${id}`, {
      data: { replacementCategory },
    });
    return response.data;
  },
};
