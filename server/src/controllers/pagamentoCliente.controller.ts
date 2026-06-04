import { Request, Response } from "express";
import { PagamentoClienteRepository } from "../repositories/pagamentoCliente.repository.js";
import { prisma } from "../prisma.js";

const repository = new PagamentoClienteRepository();

export class PagamentoClienteController {
  /**
   * POST /pagamento-cliente
   * Controller limpo: parse de request + delegação ao Repository.
   */
  async create(req: Request, res: Response) {
    try {
      const result = await repository.createWithRecebiveis(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res
        .status(400)
        .json({ error: "Failed to create PagamentoCliente", details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pagamentos = await repository.findAll();
      res.json(pagamentos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch PagamentoClientes" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pagamento = await repository.findById(id);
      if (!pagamento) {
        return res.status(404).json({ error: "PagamentoCliente not found" });
      }
      res.json(pagamento);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch PagamentoCliente" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const data = req.body;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Get original payment to detect changes
        const original = await tx.pagamentoCliente.findUnique({
          where: { id_pagamento_cliente: id },
          include: { ordem_de_servico: true },
        });

        if (!original) throw new Error("Pagamento não encontrado");

        // 2. Update Payment Record
        const pagamento = await tx.pagamentoCliente.update({
          where: { id_pagamento_cliente: id },
          data: {
            ...data,
            id_operadora: data.id_operadora ? Number(data.id_operadora) : null,
            id_conta_bancaria:
              data.id_conta_bancaria && Number(data.id_conta_bancaria) > 0
                ? Number(data.id_conta_bancaria)
                : null,
          } as any,
        });

        // 3. Sync Linked LivroCaixa
        if (original.id_livro_caixa) {
          const valorDiff = Number(data.valor) - Number(original.valor);

          await tx.livroCaixa.update({
            where: { id_livro_caixa: original.id_livro_caixa },
            data: {
              valor: Number(data.valor),
            },
          });

          // Sync Bank Balance if PIX
          if (
            original.metodo_pagamento === "PIX" &&
            data.metodo_pagamento === "PIX" &&
            original.id_conta_bancaria === data.id_conta_bancaria
          ) {
            if (valorDiff !== 0) {
              await tx.contaBancaria.update({
                where: { id_conta: Number(original.id_conta_bancaria) },
                data: { saldo_atual: { increment: valorDiff } },
              });
            }
          } else {
            if (
              original.metodo_pagamento === "PIX" &&
              original.id_conta_bancaria
            ) {
              await tx.contaBancaria.update({
                where: { id_conta: Number(original.id_conta_bancaria) },
                data: { saldo_atual: { decrement: Number(original.valor) } },
              });
            }
            if (data.metodo_pagamento === "PIX" && data.id_conta_bancaria) {
              await tx.contaBancaria.update({
                where: { id_conta: Number(data.id_conta_bancaria) },
                data: { saldo_atual: { increment: Number(data.valor) } },
              });
            }
          }
        }

        // 4. Sync Receivables — clean up old pending receivables
        await tx.recebivelCartao.deleteMany({
          where: {
            id_os: original.id_os,
            id_operadora: original.id_operadora,
            status: "PENDENTE",
            total_parcelas: original.qtd_parcelas || 1,
          },
        });

        return pagamento;
      });
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to update PagamentoCliente" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      await prisma.$transaction(async (tx) => {
        const original = await tx.pagamentoCliente.findUnique({
          where: { id_pagamento_cliente: id },
        });

        if (original) {
          // 1. Soft Delete Payment
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: id },
            data: { deleted_at: new Date() } as any,
          });

          // 2. Soft Delete LivroCaixa
          if (original.id_livro_caixa) {
            await tx.livroCaixa.update({
              where: { id_livro_caixa: original.id_livro_caixa },
              data: { deleted_at: new Date() },
            });

            // Revert Balance if PIX
            if (
              original.metodo_pagamento === "PIX" &&
              original.id_conta_bancaria
            ) {
              await tx.contaBancaria.update({
                where: { id_conta: Number(original.id_conta_bancaria) },
                data: { saldo_atual: { decrement: Number(original.valor) } },
              });
            }
          }

          // 3. Delete Receivables (Sync with Payment Deletion)
          const qtdParcelas = original.qtd_parcelas || 1;

          await tx.recebivelCartao.deleteMany({
            where: {
              id_os: original.id_os,
              id_operadora: original.id_operadora,
              status: "PENDENTE",
              total_parcelas: qtdParcelas,
            },
          });
        }
      });

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete PagamentoCliente" });
    }
  }
}
