import { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { OrdemDeServicoRepository } from "../repositories/ordemDeServico.repository.js";
import { dayjs, TIMEZONE, getDayBoundsSP, getMonthBoundsSP } from "../utils/date.js";

const osRepository = new OrdemDeServicoRepository();

export class DashboardController {
  async getDashboardData(req: Request, res: Response) {
    try {
      const now = dayjs().tz(TIMEZONE);
      const startOfDay = getDayBoundsSP(now).start;
      const endOfDay = getDayBoundsSP(now).end;

      // --- AGGREGATIONS / COUNTS ---

      // 1. Serviços em Aberto
      const osAberta = await prisma.ordemDeServico.count({
        where: {
          status: { in: ["ABERTA", "EM_ANDAMENTO"] },
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

      const tomorrowStart = getDayBoundsSP(now.add(1, 'day')).start;
      const tomorrowEnd = getDayBoundsSP(now.add(1, 'day')).end;

      const next7DaysStart = startOfDay;
      const next7DaysEnd = getDayBoundsSP(now.add(7, 'day')).end;
      
      const endOfMonth = getMonthBoundsSP(now).end;

      const contasPagarHojeList = await prisma.contasPagar.findMany({
        where: { status: "PENDENTE", dt_vencimento: { gte: startOfDay, lte: endOfDay }, deleted_at: null },
      });
      const contasPagarHojeCount = contasPagarHojeList.length;
      const contasPagarHojeValor = contasPagarHojeList.reduce((sum, c) => sum + Number(c.valor), 0);

      const contasPagarAmanhaList = await prisma.contasPagar.findMany({
        where: { status: "PENDENTE", dt_vencimento: { gte: tomorrowStart, lte: tomorrowEnd }, deleted_at: null },
      });
      const contasPagarAmanhaCount = contasPagarAmanhaList.length;
      const contasPagarAmanhaValor = contasPagarAmanhaList.reduce((sum, c) => sum + Number(c.valor), 0);

      const contasPagar7DiasList = await prisma.contasPagar.findMany({
        where: { status: "PENDENTE", dt_vencimento: { gte: next7DaysStart, lte: next7DaysEnd }, deleted_at: null },
      });
      const contasPagar7DiasCount = contasPagar7DiasList.length;
      const contasPagar7DiasValor = contasPagar7DiasList.reduce((sum, c) => sum + Number(c.valor), 0);

      const contasPagarFimMesList = await prisma.contasPagar.findMany({
        where: { status: "PENDENTE", dt_vencimento: { gte: startOfDay, lte: endOfMonth }, deleted_at: null },
      });
      const contasPagarFimMesCount = contasPagarFimMesList.length;
      const contasPagarFimMesValor = contasPagarFimMesList.reduce((sum, c) => sum + Number(c.valor), 0);

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
          fechamento_financeiro: { none: {} },
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
      const recentOss = await osRepository.findRecent(30);

      res.json({
        stats: {
          osAberta,
          contasPagarFimMesCount,
          contasPagarFimMesValor,
          contasPagarOverdue,
          contasPagarHojeCount,
          contasPagarHojeValor,
          contasPagarAmanhaCount,
          contasPagarAmanhaValor,
          contasPagar7DiasCount,
          contasPagar7DiasValor,
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
