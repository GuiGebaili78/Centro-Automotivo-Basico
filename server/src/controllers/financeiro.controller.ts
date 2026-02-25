import { Request, Response } from "express";
import { prisma } from "../prisma.js";

export class FinanceiroController {
  async getGeneralSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, source, category, search } = req.query;

      const where: any = {
        deleted_at: null,
      };

      if (startDate && endDate) {
        where.dt_movimentacao = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      if (source && source !== "ALL") {
        where.origem = source === "MANUAL" ? "MANUAL" : "AUTOMATICA";
      }

      if (category && category !== "ALL") {
        where.categoria = category;
      }

      if (search) {
        const searchVal = String(search).toLowerCase();
        // search covers description, category, and id
        where.OR = [
          { descricao: { contains: searchVal, mode: "insensitive" } },
          { categoria: { contains: searchVal, mode: "insensitive" } },
          { obs: { contains: searchVal, mode: "insensitive" } },
        ];
        if (!isNaN(Number(searchVal))) {
          where.OR.push({ id_livro_caixa: Number(searchVal) });
          where.OR.push({ valor: Number(searchVal) });
        }
      }

      // Add "NOT CONCILIACAO" globally as it's filtered in the frontend currently
      where.categoria = { ...where.categoria, not: "CONCILIACAO_CARTAO" };

      // 1. Total Inflows (ENTRADA)
      const inflows = await prisma.livroCaixa.aggregate({
        where: { ...where, tipo_movimentacao: "ENTRADA" },
        _sum: { valor: true },
      });

      // 2. Total Outflows (SAIDA)
      const outflows = await prisma.livroCaixa.aggregate({
        where: { ...where, tipo_movimentacao: "SAIDA" },
        _sum: { valor: true },
      });

      const totalInflow = Number(inflows._sum.valor) || 0;
      const totalOutflow = Number(outflows._sum.valor) || 0;

      res.json({
        totalInflow,
        totalOutflow,
        balance: totalInflow - totalOutflow,
      });
    } catch (error) {
      console.error("Financeiro Summary Error:", error);
      res.status(500).json({ error: "Failed to load financial summary" });
    }
  }

  // Optimized KPI for Relatorios
  async getKPIs(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate ? new Date(endDate as string) : new Date();

      // Sum of all REAL inflows (PagamentoCliente or Manual ENTRADA)
      const totalInflow = await prisma.livroCaixa.aggregate({
        where: {
          tipo_movimentacao: "ENTRADA",
          dt_movimentacao: { gte: start, lte: end },
          deleted_at: null,
          NOT: {
            categoria: {
              in: ["CONCILIACAO_CARTAO", "TRANSFERENCIA", "AJUSTE_SALDO"],
            },
          },
        },
        _sum: { valor: true },
      });

      const totalOutflow = await prisma.livroCaixa.aggregate({
        where: {
          tipo_movimentacao: "SAIDA",
          dt_movimentacao: { gte: start, lte: end },
          deleted_at: null,
        },
        _sum: { valor: true },
      });

      const receita = Number(totalInflow._sum.valor) || 0;
      const despesa = Number(totalOutflow._sum.valor) || 0;
      const lucro = receita - despesa;

      // Count OS for average ticket
      const osCount = await prisma.ordemDeServico.count({
        where: {
          status: { in: ["FINALIZADA", "PAGA_CLIENTE", "FINANCEIRO"] },
          dt_entrega: { gte: start, lte: end },
          deleted_at: null,
        },
      });

      res.json({
        receita,
        despesa,
        lucro,
        margem: receita > 0 ? (lucro / receita) * 100 : 0,
        ticket: osCount > 0 ? receita / osCount : 0,
      });
    } catch (error) {
      console.error("Financeiro KPIs Error:", error);
      res.status(500).json({ error: "Failed to load kpis" });
    }
  }

  async getEvolution(req: Request, res: Response) {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const interval = String(groupBy) === "month" ? "month" : "day";

      // Aggregation using UNION ALL for high performance
      // source tables: ordem_de_servico (revenue), contas_pagar (expense), pagamento_equipe (expense)
      const data: any[] = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${interval}, combined.dt) as date,
          SUM(combined.receita)::FLOAT as receitas,
          SUM(combined.despesa)::FLOAT as despesas
        FROM (
          /* 1. Receitas de OS Finalizadas */
          SELECT updated_at as dt, CAST(valor_total_cliente AS DECIMAL) as receita, 0 as despesa 
          FROM "ordem_de_servico" 
          WHERE status IN ('FINALIZADA', 'PAGA_CLIENTE', 'FINANCEIRO') 
            AND deleted_at IS NULL
            AND updated_at BETWEEN ${start} AND ${end}

          UNION ALL

          /* 2. Despesas de Contas Pagas */
          SELECT dt_pagamento as dt, 0 as receita, CAST(valor AS DECIMAL) as despesa 
          FROM "contas_pagar" 
          WHERE status = 'PAGO' 
            AND deleted_at IS NULL
            AND dt_pagamento BETWEEN ${start} AND ${end}

          UNION ALL

          /* 3. Despesas de Equipe */
          SELECT dt_pagamento as dt, 0 as receita, CAST(valor_total AS DECIMAL) as despesa 
          FROM "pagamento_equipe" 
          WHERE deleted_at IS NULL
            AND dt_pagamento BETWEEN ${start} AND ${end}
        ) as combined
        GROUP BY 1
        ORDER BY 1 ASC
      `;

      // Simple mapping to match chart expected format (label + values)
      const result = data.map((row) => ({
        date: row.date,
        Receitas: row.receitas || 0,
        Despesas: row.despesas || 0,
        label:
          interval === "month"
            ? new Date(row.date).toLocaleDateString("pt-BR", {
                month: "short",
                year: "2-digit",
              })
            : new Date(row.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }),
      }));

      res.json(result);
    } catch (error) {
      console.error("Financeiro Evolution Error:", error);
      res.status(500).json({ error: "Failed to load evolution data" });
    }
  }
}
