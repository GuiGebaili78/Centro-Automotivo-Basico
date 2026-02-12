import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class PagamentoPecaRepository {
  async create(data: Prisma.PagamentoPecaCreateInput) {
    return await prisma.pagamentoPeca.create({
      data,
    });
  }

  async findAll(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.pagamentoPeca.findMany({
        where: { deleted_at: null },
        skip,
        take: limit,
        orderBy: { data_compra: "desc" },
        select: {
          id_pagamento_peca: true,
          custo_real: true,
          data_compra: true,
          data_pagamento_fornecedor: true,
          pago_ao_fornecedor: true,
          fornecedor: {
            select: {
              id_fornecedor: true,
              nome: true,
              nome_fantasia: true,
            },
          },
          item_os: {
            select: {
              id_os: true,
              descricao: true,
              ordem_de_servico: {
                select: {
                  id_os: true,
                  veiculo: {
                    select: {
                      placa: true,
                      modelo: true,
                      cor: true,
                    },
                  },
                  cliente: {
                    select: {
                      id_cliente: true,
                      pessoa_fisica: {
                        select: {
                          pessoa: { select: { nome: true } },
                        },
                      },
                      pessoa_juridica: {
                        select: { razao_social: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.pagamentoPeca.count({ where: { deleted_at: null } }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
      if (pagamento.pago_ao_fornecedor)
        throw new Error("Pagamento já realizado.");

      // BUSCAR CATEGORIA: Auto Peças > Pg. Fornecedor
      const categoria = await tx.categoriaFinanceira.findFirst({
        where: {
          nome: "Pg. Fornecedor",
          parent: { nome: "Auto Peças" },
        },
      });
      const idCategoria = categoria?.id_categoria;
      const nomeCategoria = categoria?.nome || "Auto Peças";

      // FORMATAR DESCRIÇÃO
      // "Pg. Peças - OS Nº {id} - {fornecedor_fantasia} | {nome_peca}"
      const idOs = pagamento.item_os.ordem_de_servico.id_os;
      const fornecedor =
        pagamento.fornecedor.nome_fantasia || pagamento.fornecedor.nome;
      const nomePeca = pagamento.item_os.descricao;
      const descricao = `Pg. Peças - OS Nº ${idOs} - ${fornecedor} | ${nomePeca}`;

      // 1. Debit Account
      await tx.contaBancaria.update({
        where: { id_conta: accountId },
        data: { saldo_atual: { decrement: pagamento.custo_real } },
      });

      // 2. Create Livro Caixa Entry
      const lc = await tx.livroCaixa.create({
        data: {
          descricao: descricao,
          valor: pagamento.custo_real,
          tipo_movimentacao: "SAIDA",
          categoria: nomeCategoria, // Fallback
          id_categoria: idCategoria ?? null, // Convert undefined to null
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
