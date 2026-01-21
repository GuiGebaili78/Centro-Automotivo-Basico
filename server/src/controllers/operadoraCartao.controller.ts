import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export const getAll = async (req: Request, res: Response) => {
  try {
    const operadoras = await prisma.operadoraCartao.findMany({
      include: { conta_destino: true },
    });
    res.json(operadoras);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar operadoras" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const operadora = await prisma.operadoraCartao.create({ data });
    res.status(201).json(operadora);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar operadora" });
  }
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const data = req.body;
    const operadora = await prisma.operadoraCartao.update({
      where: { id_operadora: Number(id) },
      data,
    });
    res.json(operadora);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar operadora" });
  }
};

export const toggleStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const op = await prisma.operadoraCartao.findUnique({
      where: { id_operadora: Number(id) },
    });
    if (!op) {
      return res.status(404).json({ error: "Operadora não encontrada" });
    }

    const operadora = await prisma.operadoraCartao.update({
      where: { id_operadora: Number(id) },
      data: { ativo: !op.ativo },
    });
    res.json(operadora);
  } catch (error) {
    res.status(500).json({ error: "Erro ao alterar status da operadora" });
  }
};
