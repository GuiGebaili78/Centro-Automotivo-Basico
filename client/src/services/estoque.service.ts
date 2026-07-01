import { api } from "./api";
import type {
  IPecasEstoque,
  IMovimentacaoEstoque,
  IPaginatedResponse,
} from "../types/backend";
import type {
  IEstoqueUpdatePayload,
  IEntradaEstoquePayload,
} from "../types/estoque.types";

export const EstoqueService = {
  /**
   * Busca paginada do catálogo de peças.
   * Retorna { data, total, page, limit } — nunca o catálogo inteiro.
   */
  getAll: async (
    page = 1,
    limit = 25,
    search?: string,
    id_categoria?: number
  ): Promise<IPaginatedResponse<IPecasEstoque>> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      _t: String(Date.now()),
    });
    if (search && search.trim()) params.set("q", search.trim());
    if (id_categoria) params.set("tipo", String(id_categoria));

    const response = await api.get<IPaginatedResponse<IPecasEstoque>>(
      `/pecas-estoque?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Busca uma única peça por ID.
   * Substitui o antipadrão de getAll().find() que trafegava o catálogo inteiro.
   */
  getById: async (id: number): Promise<IPecasEstoque> => {
    const response = await api.get<IPecasEstoque>(`/pecas-estoque/${id}`);
    return response.data;
  },

  update: async (id: number, data: IEstoqueUpdatePayload) => {
    const response = await api.put<IPecasEstoque>(`/pecas-estoque/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/pecas-estoque/${id}`);
    return response.data;
  },

  searchParts: async (query: string, tipo?: number) => {
    const params = new URLSearchParams({ q: query });
    if (tipo) params.set("tipo", String(tipo));
    const response = await api.get<IPecasEstoque[]>(
      `/pecas-estoque/search?${params.toString()}`
    );
    return response.data;
  },

  getSuggestions: async (campo: string, query?: string): Promise<string[]> => {
    const params = new URLSearchParams({ campo });
    if (query) params.set("q", query);
    const response = await api.get<string[]>(`/pecas-estoque/sugestoes?${params.toString()}`);
    return response.data;
  },

  // ── Histórico de Movimentações ──

  /**
   * Retorna o histórico paginado de movimentações de uma peça específica.
   * O histórico é imutável — apenas leitura.
   */
  getHistorico: async (
    id: number,
    page = 1,
    limit = 20
  ): Promise<IPaginatedResponse<IMovimentacaoEstoque>> => {
    const response = await api.get<IPaginatedResponse<IMovimentacaoEstoque>>(
      `/pecas-estoque/${id}/historico?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Registra um estorno compensatório para uma movimentação existente.
   * Nunca deleta registros históricos — apenas cria uma movimentação inversa.
   */
  registrarEstorno: async (id_movimentacao: number) => {
    const response = await api.post<IMovimentacaoEstoque>(
      `/pecas-estoque/movimentacao/${id_movimentacao}/estorno`
    );
    return response.data;
  },

  ajustarSaldo: async (
    id: number,
    payload: { tipo: "ADD" | "REMOVE"; quantidade: number; motivo: string }
  ) => {
    const response = await api.post(`/pecas-estoque/${id}/ajuste`, payload);
    return response.data;
  },

  // ── Entradas de Estoque ──

  createEntry: async (data: IEntradaEstoquePayload) => {
    const response = await api.post("/pecas-estoque/entry", data);
    return response.data;
  },

  getEntry: async (id: number) => {
    const response = await api.get(`/pecas-estoque/entry/${id}`);
    return response.data;
  },

  updateEntry: async (id: number, data: any) => {
    const response = await api.put(`/pecas-estoque/entry/${id}`, data);
    return response.data;
  },

  deleteEntry: async (id: number) => {
    await api.delete(`/pecas-estoque/entry/${id}`);
  },

  create: async (data: any) => {
    const response = await api.post<IPecasEstoque>("/pecas-estoque", data);
    return response.data;
  },
};
