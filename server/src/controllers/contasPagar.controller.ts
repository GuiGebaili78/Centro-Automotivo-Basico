import { Request, Response } from "express";
import { ContasPagarRepository } from "../repositories/contasPagar.repository.js";
import { startOfDay, endOfDay, parseISO } from "date-fns";

const repository = new ContasPagarRepository();

export const createConta = async (req: Request, res: Response) => {
  try {
    const conta = await repository.create(req.body);
    res.status(201).json(conta);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Erro ao criar conta a pagar" });
  }
};

export const getContas = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate && typeof startDate === "string") {
      const parsedStart = parseISO((startDate.split('T')[0]) || "");
      start = startOfDay(parsedStart);
    }
    
    if (endDate && typeof endDate === "string") {
      const parsedEnd = parseISO((endDate.split('T')[0]) || "");
      end = endOfDay(parsedEnd);
    }

    const contas = await repository.findAll(start, end);
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar contas" });
  }
};

export const getDistinct = async (req: Request, res: Response) => {
  try {
    const field = req.params.field as 'descricao' | 'credor';
    const search = (req.query.q as string) || '';
    if (!['descricao', 'credor'].includes(field)) {
      return res.status(400).json({ error: "Campo inválido para busca" });
    }
    const results = await repository.getDistinct(field, search);
    res.json(results.map(r => r[field]).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar valores distintos" });
  }
};

export const buscarDescricao = async (req: Request, res: Response) => {
  try {
    const termo = (req.query.q as string) || '';
    const resultados = await repository.buscarDescricao(termo);
    res.json(resultados.map(r => r.descricao).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar descrições" });
  }
};

export const buscarCredor = async (req: Request, res: Response) => {
  try {
    const termo = (req.query.q as string) || '';
    const resultados = await repository.buscarCredor(termo);
    res.json(resultados.map(r => r.credor).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar credores" });
  }
};

export const getContaById = async (req: Request, res: Response) => {
  try {
    const conta = await repository.findById(Number(req.params.id));
    if (!conta) return res.status(404).json({ error: "Conta não encontrada" });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conta" });
  }
};

export const getRecurrenceInfo = async (req: Request, res: Response) => {
  try {
    const info = await repository.findRecurrenceInfo(Number(req.params.id));
    res.json(info);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao buscar informações de recorrência" });
  }
};

export const updateConta = async (req: Request, res: Response) => {
  try {
    const { applyToAllRecurrences, ...data } = req.body;
    const conta = await repository.updateRecurrenceSeries(
      Number(req.params.id),
      data,
      applyToAllRecurrences === true,
    );
    res.json(conta);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Erro ao atualizar conta" });
  }
};

export const deleteConta = async (req: Request, res: Response) => {
  try {
    const { deleteAllRecurrences } = req.query;
    await repository.deleteRecurrenceSeries(
      Number(req.params.id),
      deleteAllRecurrences === "true",
    );
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: "Erro ao deletar conta" });
  }
};

export const getNfsPendentes = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const id_fornecedor = req.query.id_fornecedor ? Number(req.query.id_fornecedor) : undefined;

    // Se 'limit' foi explicitamente enviado na query, ativa a paginação. Caso contrário, desativa.
    const hasExplicitLimit = req.query.limit !== undefined;
    const limit = hasExplicitLimit ? parseInt(req.query.limit as string) : undefined;
    const page = hasExplicitLimit ? (parseInt(req.query.page as string) || 1) : undefined;
    const skip = (hasExplicitLimit && page) ? (page - 1) * limit! : undefined;

    const params: any = { search };
    if (id_fornecedor !== undefined) params.id_fornecedor = id_fornecedor;
    if (skip !== undefined) params.skip = skip;
    if (limit !== undefined) params.take = limit;

    const nfs = await repository.findNfsPendentes(params);

    // BLINDAGEM DE CONTRATO (Defesa em profundidade para garantir o formato { data, total })
    if (Array.isArray(nfs)) {
      return res.json({ data: nfs, total: nfs.length });
    }

    return res.json(nfs);
  } catch (error) {
    console.error("Erro em getNfsPendentes:", error);
    res.status(500).json({ error: "Erro ao buscar notas fiscais pendentes" });
  }
};

export const getNfSyncStatus = async (req: Request, res: Response) => {
  try {
    const { nf_numero } = req.params;
    const id_fornecedor = req.query.id_fornecedor ? Number(req.query.id_fornecedor) : undefined;
    
    if (!nf_numero) {
      return res.status(400).json({ error: "Número da NF é obrigatório" });
    }
    const status = await repository.getNfSyncStatus(nf_numero, id_fornecedor);
    res.json(status);
  } catch (error) {
    console.error("Erro ao buscar status de sincronização da NF:", error);
    res.status(500).json({ error: "Erro ao buscar status de sincronização" });
  }
};

export const getNotasFiscaisCentral = async (req: Request, res: Response) => {
  try {
    const list = await repository.getNotasFiscaisCentral();
    res.json(list);
  } catch (error) {
    console.error("Erro no getNotasFiscaisCentral:", error);
    res.status(500).json({ error: "Erro ao carregar a central de notas fiscais" });
  }
};
