import { api } from "./api";
import type {
  IFuncionario,
  IFuncionarioPayload,
  IPessoaCreatePayload,
} from "../types/colaborador.types";

export const ColaboradorService = {
  getAll: async () => {
    const response = await api.get<IFuncionario[]>("/funcionario");
    return response.data;
  },

  create: async (
    payload: IFuncionarioPayload,
    pessoaData?: IPessoaCreatePayload,
    cpf?: string,
  ) => {
    // If it's a completely new collaborator, we might need to create Person and PF first.
    // However, the form separates this logic.
    // Ideally, the backend should handle this transactional complexity in a single endpoint /funcionario/full
    // But adhering to the existing logic, we'll keep the orchestration in the service if possible, or support the payload.

    // If payload has ID_PESSOA_FISICA, just create func.
    if (payload.id_pessoa_fisica) {
      const response = await api.post<IFuncionario>("/funcionario", payload);
      return response.data;
    }

    // Otherwise, we perform the chain here (Transactional logic on Client side - legacy pattern)
    if (!pessoaData)
      throw new Error("Dados da pessoa obrigatórios para novo cadastro.");

    const pessoaRes = await api.post("/pessoa", pessoaData);
    const idPessoa = pessoaRes.data.id_pessoa;

    const pfRes = await api.post("/pessoa-fisica", {
      id_pessoa: idPessoa,
      cpf: cpf?.replace(/\D/g, "") || null,
    });
    const idPf = pfRes.data.id_pessoa_fisica;

    const finalPayload = { ...payload, id_pessoa_fisica: idPf };
    const funcRes = await api.post<IFuncionario>("/funcionario", finalPayload);
    return funcRes.data;
  },

  update: async (
    id: number,
    data: IFuncionarioPayload,
    pessoaData?: IPessoaCreatePayload,
    idPessoa?: number,
  ) => {
    const response = await api.put<IFuncionario>(`/funcionario/${id}`, data);

    if (idPessoa && pessoaData) {
      await api.put(`/pessoa/${idPessoa}`, pessoaData).catch(console.warn);
    }
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/funcionario/${id}`);
  },
};
