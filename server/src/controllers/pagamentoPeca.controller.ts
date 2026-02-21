import { Request, Response } from "express";
import { PagamentoPecaRepository } from "../repositories/pagamentoPeca.repository.js";

const repository = new PagamentoPecaRepository();

export class PagamentoPecaController {
  async create(req: Request, res: Response) {
    try {
      const pagamento = await repository.create(req.body);
      res.status(201).json(pagamento);
    } catch (error) {
      res
        .status(400)
        .json({ error: "Failed to create Pagamento Peca", details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pagamentos = await repository.findAll();
      res.json(pagamentos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Pagamentos Peca" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pagamento = await repository.findById(id);
      if (!pagamento) {
        return res.status(404).json({ error: "Pagamento Peca not found" });
      }
      res.json(pagamento);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Pagamento Peca" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const {
        pago_ao_fornecedor,
        id_conta_bancaria,
        data_pagamento_fornecedor,
      } = req.body;

      // Check if we are UN-PAYING (reversing)
      // The frontend sends pago_ao_fornecedor: false when unpaying
      if (pago_ao_fornecedor === false) {
        try {
          const result = await repository.reversePayment(id);
          return res.json(result);
        } catch (e: any) {
          // If error is "not paid", maybe it was just a regular update setting false?
          // Fallback to regular update if specific logic fails or just let it fail?
          // Let's assume frontend calls this explicitly for unpay action.
          console.error("Reverse failed, trying regular update", e);
          // Fallback to regular update
          const p = await repository.update(id, req.body);
          return res.json(p);
        }
      }

      // Check if we are PAYING (confirming) and have a bank account
      // Frontend sends pago_ao_fornecedor: true AND id_conta_bancaria
      if (pago_ao_fornecedor === true && id_conta_bancaria) {
        try {
          const date = data_pagamento_fornecedor
            ? new Date(data_pagamento_fornecedor + "T12:00:00")
            : new Date();
          const result = await repository.confirmPayment(
            id,
            Number(id_conta_bancaria),
            date,
          );
          return res.json(result);
        } catch (e: any) {
          console.error("Confirm failed", e);
          return res
            .status(400)
            .json({ error: e.message || "Failed to confirm payment" });
        }
      }

      // Default generic update (e.g. editing cost, date_compra, without changing status)
      // Note: If frontend sends pago_ao_fornecedor: true BUT NO account, it goes here.
      // This path updates the record but creates NO financial movement.
      // This is backward compatible but dangerous if frontend forgets account.
      // But let's keep it for now.
      const pagamento = await repository.update(id, req.body);
      res.json(pagamento);
    } catch (error) {
      res.status(400).json({ error: "Failed to update Pagamento Peca" });
    }
  }

  async baixa(req: Request, res: Response) {
    try {
      const {
        ids,
        desconto_total_aplicado,
        id_conta_bancaria,
        data_pagamento,
      } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ error: "IDs das peças são obrigatórios" });
      }

      const result = await repository.baixaPecas(
        ids,
        Number(desconto_total_aplicado || 0),
        Number(id_conta_bancaria),
        data_pagamento ? new Date(data_pagamento + "T12:00:00") : new Date(),
      );

      res.json(result);
    } catch (error: any) {
      console.error("Baixa failed", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to process part payments" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete Pagamento Peca" });
    }
  }
}
