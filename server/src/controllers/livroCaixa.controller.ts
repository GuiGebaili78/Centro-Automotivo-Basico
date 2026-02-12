import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export const getAll = async (req: Request, res: Response) => {
  try {
    const registros = await prisma.livroCaixa.findMany({
      include: { conta: true },
      orderBy: { dt_movimentacao: "desc" },
      take: 200, // Limit to last 200 for performance? Or pagination later.
    });
    res.json(registros);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar livro caixa" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const {
      descricao,
      valor,
      tipo_movimentacao,
      categoria,
      id_categoria,
      obs,
      origem,
      id_conta_bancaria,
    } = req.body;

    // Transaction to update balance if account provided
    const result = await prisma.$transaction(async (tx) => {
      const registro = await tx.livroCaixa.create({
        data: {
          descricao,
          valor,
          tipo_movimentacao,
          categoria,
          id_categoria: id_categoria ? Number(id_categoria) : undefined,
          obs,
          origem: origem || "MANUAL",
          id_conta_bancaria: id_conta_bancaria
            ? Number(id_conta_bancaria)
            : null,
        },
      });

      if (id_conta_bancaria) {
        if (tipo_movimentacao === "ENTRADA") {
          await tx.contaBancaria.update({
            where: { id_conta: Number(id_conta_bancaria) },
            data: { saldo_atual: { increment: valor } },
          });
        } else {
          await tx.contaBancaria.update({
            where: { id_conta: Number(id_conta_bancaria) },
            data: { saldo_atual: { decrement: valor } },
          });
        }
      }
      return registro;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar registro" });
  }
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const {
      descricao,
      valor,
      tipo_movimentacao,
      categoria,
      id_categoria,
      obs,
    } = req.body;
    const registro = await prisma.livroCaixa.update({
      where: { id_livro_caixa: Number(id) },
      data: {
        descricao,
        valor,
        tipo_movimentacao,
        categoria,
        id_categoria: id_categoria ? Number(id_categoria) : undefined,
        obs,
      },
    });
    res.json(registro);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar registro" });
  }
};

export const softDelete = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { obs } = req.body;
  try {
    const registro = await prisma.livroCaixa.update({
      where: { id_livro_caixa: Number(id) },
      data: {
        deleted_at: new Date(),
        obs: obs, // Update obs if provided
      },
    });
    res.json(registro);
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar registro" });
  }
};
