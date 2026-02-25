import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export class DashboardController {
  async getDashboardData(req: Request, res: Response) {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      // Use UTC range for "Today" to match how the frontend was doing it (startsWith todayLocal)
      // or better, use local time range.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // --- AGGREGATIONS / COUNTS ---

      // 1. Serviços em Aberto
      const osAberta = await prisma.ordemDeServico.count({
        where: {
          status: { in: ["ABERTA", "EM_ANDAMENTO"] },
          deleted_at: null,
        },
      });

      // 2. Contas a Pagar (Split)
      // Pending: status PENDENTE and date >= today
      const contasPagarPending = await prisma.contasPagar.count({
        where: {
          status: "PENDENTE",
          dt_vencimento: { gte: startOfDay },
          deleted_at: null,
        },
      });

      // Overdue: status PENDENTE and date < today
      const contasPagarOverdue = await prisma.contasPagar.count({
        where: {
          status: "PENDENTE",
          dt_vencimento: { lt: startOfDay },
          deleted_at: null,
        },
      });

      // 3. Livro Caixa Entries (Today)
      // Matches manual + auto entries
      // Entries = PagamentoCliente (Auto) + LivroCaixa ENTRADA (Manual)
      const autoInflows = await prisma.pagamentoCliente.count({
        where: {
          data_pagamento: { gte: startOfDay, lte: endOfDay },
          deleted_at: null,
        },
      });

      const manualInflows = await prisma.livroCaixa.count({
        where: {
          dt_movimentacao: { gte: startOfDay, lte: endOfDay },
          tipo_movimentacao: "ENTRADA",
          origem: "MANUAL",
          deleted_at: null,
          categoria: { not: "CONCILIACAO_CARTAO" },
        },
      });

      const libroCaixaEntries = autoInflows + manualInflows;

      // 4. Livro Caixa Exits (Today)
      // Exits = PagamentoPeca (Auto) + LivroCaixa SAIDA (Manual/Bills)
      const autoOutflows = await prisma.pagamentoPeca.count({
        where: {
          pago_ao_fornecedor: true, // Only real exits
          data_pagamento_fornecedor: { gte: startOfDay, lte: endOfDay },
          deleted_at: null,
        },
      });

      const manualOutflows = await prisma.livroCaixa.count({
        where: {
          dt_movimentacao: { gte: startOfDay, lte: endOfDay },
          tipo_movimentacao: "SAIDA",
          deleted_at: null,
          categoria: { not: "CONCILIACAO_CARTAO" },
          NOT: {
            AND: [{ origem: "AUTOMATICA" }, { categoria: "Auto Peças" }],
          },
        },
      });

      const libroCaixaExits = autoOutflows + manualOutflows;

      // 5. Auto Peças Pendentes
      const autoPecasPendentes = await prisma.pagamentoPeca.count({
        where: {
          pago_ao_fornecedor: false,
          deleted_at: null,
        },
      });

      // 6. Consolidação (OS Pronta para Financeiro / Financeiro E SEM Fechamento)
      const consolidacao = await prisma.ordemDeServico.count({
        where: {
          status: { in: ["PRONTO PARA FINANCEIRO", "FINANCEIRO"] },
          fechamento_financeiro: null,
          deleted_at: null,
        },
      });

      // 7. Alerta de Estoque
      // Efficiency: We only need the count.
      // prisma.pecasEstoque.findMany is okay if table is small, but let's stick to it for now
      // or use a better way if possible.
      const pecasComAlerta = await prisma.pecasEstoque.findMany({
        select: {
          id_pecas_estoque: true,
          estoque_atual: true,
          estoque_minimo: true,
        },
      });
      const alertaEstoque = pecasComAlerta.filter(
        (p) => Number(p.estoque_atual) <= Number(p.estoque_minimo || 0),
      ).length;

      // 8. Recent OSs (Strict Limit, light includes)
      const recentOss = await prisma.ordemDeServico.findMany({
        take: 30, // Reduced from 100 for dashboard snappiness
        orderBy: { updated_at: "desc" },
        include: {
          veiculo: true,
          cliente: {
            include: {
              pessoa_fisica: { include: { pessoa: true } },
              pessoa_juridica: { include: { pessoa: true } },
            },
          },
        },
      });

      res.json({
        stats: {
          osAberta,
          contasPagarPending,
          contasPagarOverdue,
          livroCaixaEntries: libroCaixaEntries,
          livroCaixaExits: libroCaixaExits,
          autoPecasPendentes,
          consolidacao,
          alertaEstoque,
        },
        recentOss,
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
      res.status(500).json({ error: "Failed to load dashboard data" });
    }
  }
}
