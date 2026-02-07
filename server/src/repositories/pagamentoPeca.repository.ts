import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class PagamentoPecaRepository {
  async create(data: Prisma.PagamentoPecaCreateInput) {
    return await prisma.pagamentoPeca.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pagamentoPeca.findMany({
      include: {
        fornecedor: true,
        item_os: {
          include: {
            ordem_de_servico: {
              include: {
                veiculo: true,
                cliente: {
                  include: {
                    pessoa_fisica: { include: { pessoa: true } },
                    pessoa_juridica: { include: { pessoa: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return await prisma.pagamentoPeca.findUnique({
      where: { id_pagamento_peca: id },
      include: { item_os: true, fornecedor: true },
    });
  }

  async findByItemId(itemId: number) {
    return await prisma.pagamentoPeca.findMany({
      where: { id_item_os: itemId },
      include: { fornecedor: true },
    });
  }

  async update(id: number, data: Prisma.PagamentoPecaUpdateInput) {
    return await prisma.pagamentoPeca.update({
      where: { id_pagamento_peca: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pagamentoPeca.update({
      where: { id_pagamento_peca: id },
      data: { deleted_at: new Date() },
    });
  }

  async confirmPayment(id: number, accountId: number, dataPagamento: Date) {
    return await prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamentoPeca.findUnique({
        where: { id_pagamento_peca: id },
        include: {
          fornecedor: true,
          item_os: { include: { ordem_de_servico: true } },
        },
      });

      if (!pagamento) throw new Error("Pagamento não encontrado");
      // If already paid, do nothing or throw. Let's throw to be safe.
      if (pagamento.pago_ao_fornecedor)
        throw new Error("Pagamento já realizado.");

      // 1. Debit Account
      // We can skip checking existence if we trust FK, but logic-wise check saldo is good? No, let it be negative.
      await tx.contaBancaria.update({
        where: { id_conta: accountId },
        data: { saldo_atual: { decrement: pagamento.custo_real } },
      });

      // 2. Create Livro Caixa Entry
      const lc = await tx.livroCaixa.create({
        data: {
          descricao: `Pag. Peça - OS #${pagamento.item_os.ordem_de_servico.id_os} - ${pagamento.fornecedor.nome}`,
          valor: pagamento.custo_real,
          tipo_movimentacao: "SAIDA",
          categoria: "Auto Peças",
          dt_movimentacao: new Date(),
          origem: "AUTOMATICA",
          id_conta_bancaria: accountId,
        },
      });

      // 3. Update Payment
      return await tx.pagamentoPeca.update({
        where: { id_pagamento_peca: id },
        data: {
          pago_ao_fornecedor: true,
          data_pagamento_fornecedor: dataPagamento,
          id_livro_caixa: lc.id_livro_caixa,
        },
      });
    });
  }

  async reversePayment(id: number) {
    return await prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamentoPeca.findUnique({
        where: { id_pagamento_peca: id },
        include: { livro_caixa: true },
      });

      if (!pagamento) throw new Error("Pagamento não encontrado");
      if (!pagamento.pago_ao_fornecedor)
        throw new Error("Pagamento não está pago, impossível estornar.");

      // 1. Restore Account Balance and Delete Livro Caixa
      if (pagamento.id_livro_caixa && pagamento.livro_caixa) {
        if (pagamento.livro_caixa.id_conta_bancaria) {
          await tx.contaBancaria.update({
            where: { id_conta: pagamento.livro_caixa.id_conta_bancaria },
            data: { saldo_atual: { increment: pagamento.livro_caixa.valor } },
          });
        }
        // Soft Delete Livro Caixa (keeps log but marks as deleted)
        await tx.livroCaixa.update({
          where: { id_livro_caixa: pagamento.id_livro_caixa },
          data: { deleted_at: new Date() },
        });
      }

      // 2. Reset Payment Status
      return await tx.pagamentoPeca.update({
        where: { id_pagamento_peca: id },
        data: {
          pago_ao_fornecedor: false,
          data_pagamento_fornecedor: null,
          id_livro_caixa: null,
        },
      });
    });
  }
}
