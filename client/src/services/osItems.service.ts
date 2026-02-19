import { api } from "./api";
import type { IItensOs } from "../types/backend";

export const OsItemsService = {
  getByOsId: async (osId: number) => {
    const response = await api.get<IItensOs[]>(`/itens-os/os/${osId}`);
    return response.data;
  },

  create: async (data: Partial<IItensOs>) => {
    const response = await api.post<IItensOs>("/itens-os", data);
    return response.data;
  },

  update: async (id: number, data: Partial<IItensOs>) => {
    const response = await api.put<IItensOs>(`/itens-os/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/itens-os/${id}`);
  },

  search: async (query: string) => {
    const response = await api.get<IItensOs[]>(
      `/itens-os/search/desc?q=${query}`,
    );
    return response.data;
  },

  // Also part search from stock?
  searchStock: async (query: string) => {
    const response = await api.get(`/pecas-estoque/search?q=${query}`);
    return response.data;
  },

  checkAvailability: async (stockId: number) => {
    const response = await api.get(`/pecas-estoque/${stockId}/availability`);
    return response.data;
  },
};
