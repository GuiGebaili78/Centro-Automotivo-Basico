import { Request, Response } from "express";
import livroCaixaRepository from "../repositories/livroCaixa.repository.js";

export const getAll = async (req: Request, res: Response) => {
  try {
    const registros = await livroCaixaRepository.getAll();
    res.json(registros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar livro caixa" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const result = await livroCaixaRepository.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar registro" });
  }
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const registro = await livroCaixaRepository.update(Number(id), req.body);
    res.json(registro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar registro" });
  }
};

export const softDelete = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { obs } = req.body;
  try {
    const registro = await livroCaixaRepository.softDelete(Number(id), obs);
    res.json(registro);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Erro ao deletar registro" });
  }
};
