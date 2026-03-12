import { api } from "./api";
import type { IEquipamentoCliente } from "../types/backend";

export const EquipamentoService = {
  getAllByCliente: async (clientId: number) => {
    const response = await api.get<IEquipamentoCliente[]>(`/cliente/${clientId}/equipamento`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<IEquipamentoCliente>(`/equipamento/${id}`);
    return response.data;
  },

  create: async (data: Partial<IEquipamentoCliente>) => {
    const response = await api.post<IEquipamentoCliente>("/equipamento", data);
    return response.data;
  },

  update: async (id: number, data: Partial<IEquipamentoCliente>) => {
    const response = await api.put<IEquipamentoCliente>(`/equipamento/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/equipamento/${id}`);
  },
};
