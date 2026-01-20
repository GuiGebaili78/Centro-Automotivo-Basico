import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class PecasEstoqueRepository {
  async create(data: Prisma.PecasEstoqueCreateInput) {
    return await prisma.pecasEstoque.create({
      data,
    });
  }

  async findAll() {
    return await prisma.pecasEstoque.findMany({
      include: {
        itens_entrada: {
          take: 1,
          orderBy: { id_item_entrada: "desc" },
          include: {
            entrada: {
              include: { fornecedor: true },
            },
          },
        },
      },
      orderBy: { nome: "asc" },
    });
  }

  async findById(id: number) {
    return await prisma.pecasEstoque.findUnique({
      where: { id_pecas_estoque: id },
    });
  }

  async update(id: number, data: Prisma.PecasEstoqueUpdateInput) {
    return await prisma.pecasEstoque.update({
      where: { id_pecas_estoque: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.pecasEstoque.delete({
      where: { id_pecas_estoque: id },
    });
  }

  async search(query: string) {
    return await prisma.pecasEstoque.findMany({
      where: {
        OR: [
          { nome: { contains: query, mode: "insensitive" } },
          { descricao: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      include: {
        itens_entrada: {
          take: 1,
          orderBy: { id_item_entrada: "desc" },
          include: {
            entrada: {
              include: { fornecedor: true },
            },
          },
        },
      },
    });
  }

  async createEntry(data: {
    id_fornecedor: number;
    nota_fiscal?: string;
    data_compra?: Date;
    obs?: string;
    itens: {
      id_pecas_estoque?: number;
      new_part_data?: any; // Name, Description, etc.
      quantidade: number;
      valor_custo: number;
      valor_venda: number;
      margem_lucro?: number;
      ref_cod?: string;
      obs?: string;
    }[];
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create Entry Header
      const entrada = await tx.entradaEstoque.create({
        data: {
          id_fornecedor: data.id_fornecedor,
          nota_fiscal: data.nota_fiscal || null,
          data_compra: data.data_compra || new Date(),
          valor_total: data.itens.reduce(
            (acc, i) => acc + Number(i.valor_custo) * Number(i.quantidade),
            0,
          ),
          obs: data.obs || null,
        },
      });

      // 2. Process Items
      for (const item of data.itens) {
        let partId = item.id_pecas_estoque;

        // 2a. Create Part if new
        if (!partId && item.new_part_data) {
          const newPart = await tx.pecasEstoque.create({
            data: {
              nome: item.new_part_data.nome,
              descricao:
                item.new_part_data.descricao || item.new_part_data.nome,
              unidade_medida: item.new_part_data.unidade_medida || "UN",
              estoque_atual: 0, // Will act increment below
              valor_custo: item.valor_custo,
              valor_venda: item.valor_venda,
              custo_unitario_padrao: item.valor_custo, // Init standard cost
              fabricante: item.new_part_data.fabricante || null,
            },
          });
          partId = newPart.id_pecas_estoque;
        }

        if (!partId)
          throw new Error("Item sem ID de peça e sem dados para cadastro.");

        // 2b. Create ItemEntrada
        await tx.itemEntrada.create({
          data: {
            id_entrada: entrada.id_entrada,
            id_pecas_estoque: partId,
            quantidade: item.quantidade,
            valor_custo: item.valor_custo,
            valor_venda: item.valor_venda,
            margem_lucro: item.margem_lucro || null,
            ref_cod: item.ref_cod || null,
            obs: item.obs || null,
          },
        });

        // 2c. Update Stock & Price
        await tx.pecasEstoque.update({
          where: { id_pecas_estoque: partId },
          data: {
            estoque_atual: { increment: item.quantidade },
            valor_venda: item.valor_venda, // Always update selling price as requested
            dt_ultima_compra: new Date(),
            // As per request: "sem atualizar o preço de custo das peças compradas anteriormente",
            // but we MUST update standard cost for new parts.
            // For existing parts, we might typically update Average Cost, but ignoring cost update here as strictly requested for existing.
            // NOTE: If it was a NEW part, we already set the cost in creation.
          },
        });
      }

      // 3. Process Financials (Contas a Pagar + Livro Caixa)
      // We check if 'financeiro' data was passed in the 'data' argument (need to update type definition first)
      if ((data as any).financeiro) {
        const fin = (data as any).financeiro;

        const conta = await tx.contasPagar.create({
          data: {
            descricao: fin.descricao,
            valor: fin.valor,
            dt_vencimento: new Date(fin.dt_vencimento),
            dt_pagamento:
              fin.status === "PAGO" ? new Date(fin.dt_pagamento) : null,
            status: fin.status,
            categoria: "PEÇAS",
            obs: `Ref. Entrada Estoque #${entrada.id_entrada}`,
          },
        });

        // If PAID, create Livro Caixa movement
        if (fin.status === "PAGO") {
          await tx.livroCaixa.create({
            data: {
              descricao: `Pagamento Compra Peças - ${fin.descricao}`,
              valor: fin.valor,
              tipo_movimentacao: "SAIDA",
              categoria: "FORNECEDOR",
              origem: "AUTOMATICA",
              dt_movimentacao: new Date(fin.dt_pagamento),
              obs: `Vinculado a Conta Pagar #${conta.id_conta_pagar}`,
            },
          });
        }
      }

      return entrada;
    });
  }

  async getAvailability(id: number) {
    const part = await prisma.pecasEstoque.findUnique({
      where: { id_pecas_estoque: id },
      select: {
        estoque_atual: true,
        nome: true,
        valor_venda: true,
        id_pecas_estoque: true,
      },
    });

    if (!part) return null;

    const reservedItems = await prisma.itensOs.aggregate({
      where: {
        id_pecas_estoque: id,
        deleted_at: null,
        ordem_de_servico: {
          status: {
            notIn: ["FINALIZADA", "PAGA_CLIENTE", "PRONTO PARA FINANCEIRO"],
          }, // Using active statuses
          deleted_at: null,
        },
      },
      _sum: { quantidade: true },
    });

    const reserved = reservedItems._sum.quantidade || 0;

    return {
      ...part,
      reserved,
    };
  }
}
