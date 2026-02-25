import { api } from "./api";

export const PessoaService = {
  createPessoa: async (data: any) => {
    const response = await api.post("/pessoa", data);
    return response.data;
  },

  createPessoaFisica: async (data: any) => {
    const response = await api.post("/pessoa-fisica", data);
    return response.data;
  },

  createPessoaJuridica: async (data: any) => {
    const response = await api.post("/pessoa-juridica", data);
    return response.data;
  },

  createTipo: async (data: any) => {
    const response = await api.post("/tipo", data);
    return response.data;
  },
};
