import { Request, Response } from "express";
import { ContasPagarRepository } from "../repositories/contasPagar.repository.js";

const repository = new ContasPagarRepository();

export const createConta = async (req: Request, res: Response) => {
  try {
    const conta = await repository.create(req.body);
    res.status(201).json(conta);
  } catch (error) {
    res.status(400).json({ error: "Erro ao criar conta a pagar" });
  }
};

export const getContas = async (req: Request, res: Response) => {
  try {
    const contas = await repository.findAll();
    res.json(contas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar contas" });
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
  } catch (error) {
    res.status(400).json({ error: "Erro ao atualizar conta" });
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
