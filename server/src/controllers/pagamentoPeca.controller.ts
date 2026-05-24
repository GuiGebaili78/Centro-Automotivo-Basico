import { Request, Response } from "express";
import { PagamentoPecaRepository } from "../repositories/pagamentoPeca.repository.js";

const repository = new PagamentoPecaRepository();

export class PagamentoPecaController {
  async create(req: Request, res: Response) {
    try {
      const { id_item_os, id_pessoa, id_fornecedor, custo_real, pago_ao_fornecedor, data_compra, nf_numero } = req.body;
      
      const parsedIdPessoa = id_pessoa !== undefined && id_pessoa !== null && id_pessoa !== "" ? id_pessoa : id_fornecedor;
      const hasValidFornecedor = parsedIdPessoa !== undefined && parsedIdPessoa !== null && parsedIdPessoa !== "" && !isNaN(Number(parsedIdPessoa)) && Number(parsedIdPessoa) > 0;
      const fornecedorId = hasValidFornecedor ? Number(parsedIdPessoa) : undefined;

      const payload = {
        id_item_os: Number(id_item_os),
        id_pessoa: fornecedorId,
        custo_real: Number(custo_real),
        pago_ao_fornecedor: Boolean(pago_ao_fornecedor),
        data_compra: data_compra ? new Date(data_compra) : new Date(),
        nf_numero: nf_numero || undefined,
      };

      const pagamento = await repository.create(payload as any);
      res.status(201).json(pagamento);
    } catch (error: any) {
      res
        .status(400)
        .json({ error: "Failed to create Pagamento Peca", details: error.message });
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
        id_item_os,
        id_pessoa,
        id_fornecedor,
        custo_real,
        data_compra,
        nf_numero
      } = req.body;

      const parsedIdPessoa = id_pessoa !== undefined && id_pessoa !== null && id_pessoa !== "" ? id_pessoa : id_fornecedor;
      const hasValidFornecedor = parsedIdPessoa !== undefined && parsedIdPessoa !== null && parsedIdPessoa !== "" && !isNaN(Number(parsedIdPessoa)) && Number(parsedIdPessoa) > 0;
      const fornecedorId = hasValidFornecedor ? Number(parsedIdPessoa) : undefined;

      // Check if we are UN-PAYING (reversing)
      if (pago_ao_fornecedor === false) {
        try {
          const result = await repository.reversePayment(id);
          return res.json(result);
        } catch (e: any) {
          console.error("Reverse failed, trying regular update", e);
          
          const payload: any = { pago_ao_fornecedor: false };
          if (id_item_os !== undefined) payload.id_item_os = Number(id_item_os);
          if (parsedIdPessoa !== undefined) payload.id_pessoa = fornecedorId;
          if (custo_real !== undefined) payload.custo_real = Number(custo_real);
          if (data_compra !== undefined) payload.data_compra = new Date(data_compra);
          if (nf_numero !== undefined) payload.nf_numero = nf_numero || null;

          const p = await repository.update(id, payload);
          return res.json(p);
        }
      }

      // Check if we are PAYING (confirming) and have a bank account
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

      // Default generic update
      const payload: any = {};
      if (pago_ao_fornecedor !== undefined) payload.pago_ao_fornecedor = Boolean(pago_ao_fornecedor);
      if (id_item_os !== undefined) payload.id_item_os = Number(id_item_os);
      if (parsedIdPessoa !== undefined) payload.id_pessoa = fornecedorId;
      if (custo_real !== undefined) payload.custo_real = Number(custo_real);
      if (data_compra !== undefined) payload.data_compra = new Date(data_compra);
      if (nf_numero !== undefined) payload.nf_numero = nf_numero || null;

      const pagamento = await repository.update(id, payload);
      res.json(pagamento);
    } catch (error: any) {
      res.status(400).json({ error: "Failed to update Pagamento Peca", details: error.message });
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
