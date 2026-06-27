import { prisma } from "../prisma.js";

export class DashboardRepository {
  async getOsAbertas(): Promise<number> {
    return prisma.ordemDeServico.count({
      where: {
        status: { in: ["ABERTA", "EM_ANDAMENTO"] },
        deleted_at: null,
      },
    });
  }

  async getContasPagarOverdue(startOfDay: Date): Promise<number> {
    return prisma.contasPagar.count({
      where: {
        status: "PENDENTE",
        dt_vencimento: { lt: startOfDay },
        deleted_at: null,
      },
    });
  }

  async getContasPagarPorPeriodo(start: Date, end: Date) {
    return prisma.contasPagar.findMany({
      where: {
        status: "PENDENTE",
        dt_vencimento: { gte: start, lte: end },
        deleted_at: null,
      },
    });
  }

  async getPagamentoClienteEntries(start: Date, end: Date): Promise<number> {
    return prisma.pagamentoCliente.count({
      where: {
        data_pagamento: { gte: start, lte: end },
        deleted_at: null,
      },
    });
  }

  async getLivroCaixaEntries(start: Date, end: Date): Promise<number> {
    return prisma.livroCaixa.count({
      where: {
        dt_movimentacao: { gte: start, lte: end },
        tipo_movimentacao: "ENTRADA",
        deleted_at: null,
        categoria: { not: "CONCILIACAO_CARTAO" },
      },
    });
  }

  async getPagamentoPecaExits(start: Date, end: Date): Promise<number> {
    return prisma.pagamentoPeca.count({
      where: {
        pago_ao_fornecedor: true,
        data_pagamento_fornecedor: { gte: start, lte: end },
        deleted_at: null,
      },
    });
  }

  async getLivroCaixaExits(start: Date, end: Date): Promise<number> {
    return prisma.livroCaixa.count({
      where: {
        dt_movimentacao: { gte: start, lte: end },
        tipo_movimentacao: "SAIDA",
        deleted_at: null,
        categoria: { not: "CONCILIACAO_CARTAO" },
      },
    });
  }

  async getAutoPecasPendentes(): Promise<number> {
    return prisma.pagamentoPeca.count({
      where: {
        pago_ao_fornecedor: false,
        deleted_at: null,
      },
    });
  }

  async getConsolidacao(): Promise<number> {
    return prisma.ordemDeServico.count({
      where: {
        status: { in: ["PRONTO PARA FINANCEIRO", "FINANCEIRO"] },
        fechamento_financeiro: { none: {} },
        deleted_at: null,
      },
    });
  }

  async getPecasComAlerta() {
    const produtos = await prisma.produto.findMany({
      select: {
        id_produto: true,
        saldo_atual: true,
        estoque_minimo: true,
      },
    });
    return produtos.map((p) => ({
      id_pecas_estoque: p.id_produto,
      estoque_atual: p.saldo_atual,
      estoque_minimo: p.estoque_minimo,
    }));
  }
}
