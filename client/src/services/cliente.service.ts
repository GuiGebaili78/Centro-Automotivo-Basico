import { api } from "./api";
import type { ICliente } from "../types/backend";
import type {
  IClientePayload,
  IClientSearchResult,
} from "../types/cliente.types";
import { formatNameTitleCase } from "../utils/normalize";

export const ClienteService = {
  getAll: async () => {
    const response = await api.get<ICliente[]>("/cliente");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ICliente>(`/cliente/${id}`);
    return response.data;
  },

  search: async (term: string) => {
    const response = await api.get<IClientSearchResult[]>(
      `/cliente/search?name=${term}`,
    );
    return response.data;
  },

  create: async (data: Partial<ICliente>) => {
    const response = await api.post<ICliente>("/cliente", data);
    return response.data;
  },

  createFull: async (payload: IClientePayload) => {
    // 1. Create Pessoa
    const pessoaPayload = {
      nome: formatNameTitleCase(
        payload.tipo_pessoa === 1 ? payload.nome! : payload.razao_social!,
      ), // Use nome or razao_social for base name
      genero: payload.genero,
      dt_nascimento: payload.dt_nascimento,
      obs: payload.obs,
    };
    const pessoaRes = await api.post("/pessoa", pessoaPayload);
    const idPessoa = pessoaRes.data.id_pessoa;

    let fkId = null;
    let fkField = "";

    // 2. Create PF or PJ
    if (payload.tipo_pessoa === 1) {
      const pfPayload = {
        id_pessoa: idPessoa,
        cpf: payload.cpf ? payload.cpf.replace(/\D/g, "") : null,
      };
      const pfRes = await api.post("/pessoa-fisica", pfPayload);
      fkId = pfRes.data.id_pessoa_fisica;
      fkField = "id_pessoa_fisica";
    } else {
      const pjPayload = {
        id_pessoa: idPessoa,
        razao_social: formatNameTitleCase(payload.razao_social!),
        nome_fantasia: payload.nome_fantasia
          ? formatNameTitleCase(payload.nome_fantasia)
          : null,
        cnpj: payload.cnpj ? payload.cnpj.replace(/\D/g, "") : null,
        inscricao_estadual: payload.inscricao_estadual,
      };
      const pjRes = await api.post("/pessoa-juridica", pjPayload);
      fkId = pjRes.data.id_pessoa_juridica;
      fkField = "id_pessoa_juridica";
    }

    // 3. Create Cliente
    const clientePayload = {
      [fkField]: fkId,
      tipo_pessoa: payload.tipo_pessoa,
      telefone_1: payload.telefone_1,
      telefone_2: payload.telefone_2,
      email: payload.email,
      logradouro: payload.logradouro,
      nr_logradouro: payload.nr_logradouro,
      compl_logradouro: payload.compl_logradouro,
      bairro: payload.bairro,
      cidade: payload.cidade,
      estado: payload.estado,
      cep: payload.cep,
    };

    const response = await api.post<ICliente>("/cliente", clientePayload);
    return response.data;
  },

  update: async (id: number, data: Partial<IClientePayload>) => {
    // For now, simpler update since backend might handle joins or we just update direct fields
    // If backend expects specific structure for PF/PJ update, it should be handled here.
    // Assuming /cliente/:id PUT handles these fields or we only update basic info + address/contact here.
    const response = await api.put<ICliente>(`/cliente/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/cliente/${id}`);
  },
};
