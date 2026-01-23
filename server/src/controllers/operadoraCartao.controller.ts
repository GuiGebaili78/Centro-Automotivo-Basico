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

const getValidData = (body: any) => {
  const allowedFields = [
    "nome",
    "ativo",
    "vincular_caixa",
    "taxa_debito",
    "prazo_debito",
    "taxa_credito_vista",
    "prazo_credito_vista",
    "taxa_credito_parc",
    "prazo_credito_parc",
    "taxa_antecipacao",
    "antecipacao_auto",
    "id_conta_destino",
  ];

  const cleanData: any = {};

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      if (
        [
          "taxa_debito",
          "prazo_debito",
          "taxa_credito_vista",
          "prazo_credito_vista",
          "taxa_credito_parc",
          "prazo_credito_parc",
          "taxa_antecipacao",
          "id_conta_destino",
        ].includes(field)
      ) {
        // Convert to number and check for NaN
        const num = Number(body[field]);
        if (!isNaN(num)) {
          cleanData[field] = num;
        }
      } else {
        cleanData[field] = body[field];
      }
    }
  });

  return cleanData;
};

export const create = async (req: Request, res: Response) => {
  try {
    const data = getValidData(req.body);

    // Validate Account Existence
    if (data.id_conta_destino) {
      if (data.id_conta_destino <= 0) {
        return res
          .status(400)
          .json({ error: "Selecione uma conta bancária válida." });
      }
      const conta = await prisma.contaBancaria.findUnique({
        where: { id_conta: data.id_conta_destino },
      });
      if (!conta) {
        return res
          .status(400)
          .json({ error: "Conta bancária de destino não encontrada." });
      }
    }

    const operadora = await prisma.operadoraCartao.create({ data });
    res.status(201).json(operadora);
  } catch (error: any) {
    console.error("Erro ao criar operadora:", error);
    res.status(500).json({ error: error.message || "Erro ao criar operadora" });
  }
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const idOperadora = Number(id);

  if (isNaN(idOperadora)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const data = getValidData(req.body);

    // Validate Account Existence
    if (data.id_conta_destino) {
      if (data.id_conta_destino <= 0) {
        return res
          .status(400)
          .json({ error: "Selecione uma conta bancária válida." });
      }
      const conta = await prisma.contaBancaria.findUnique({
        where: { id_conta: data.id_conta_destino },
      });
      if (!conta) {
        return res
          .status(400)
          .json({ error: "Conta bancária de destino não encontrada." });
      }
    }

    const operadora = await prisma.operadoraCartao.update({
      where: { id_operadora: idOperadora },
      data,
    });
    res.json(operadora);
  } catch (error: any) {
    console.error("Erro ao atualizar operadora:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro ao atualizar operadora" });
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
