import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface Configuracao {
  id?: string;
  nomeFantasia: string;
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logoUrl?: string; // URL from backend
}

export const ConfiguracaoService = {
  get: async (): Promise<Configuracao | null> => {
    const response = await axios.get(`${API_URL}/api/configuracao`);
    return response.data;
  },

  save: async (formData: FormData): Promise<Configuracao> => {
    const response = await axios.post(`${API_URL}/api/configuracao`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
