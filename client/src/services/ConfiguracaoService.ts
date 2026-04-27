import axios from "axios";
import { API_BASE } from "./api";

export type Configuracao = {
  id?: string;
  nomeFantasia: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logoUrl?: string; // URL from backend
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
};

export const ConfiguracaoService = {
  get: async (): Promise<Configuracao | null> => {
    const response = await axios.get(`${API_BASE}/configuracao`);
    return response.data;
  },

  save: async (formData: FormData): Promise<Configuracao> => {
    const response = await axios.post(`${API_BASE}/configuracao`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
