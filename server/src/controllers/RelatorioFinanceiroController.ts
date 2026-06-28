import { Request, Response } from "express";
import { relatoriosService } from "../services/RelatoriosService.js";
import { dayjs, TIMEZONE, getDayBoundsSP } from "../utils/date.js";

export class RelatorioFinanceiroController {
  async getDashboard(req: Request, res: Response) {
    try {
      const now = dayjs().tz(TIMEZONE);
      const endDate = getDayBoundsSP(now).end;
      const startDate = getDayBoundsSP(now.subtract(30, 'day')).start;

      const data = await relatoriosService.getDashboardFinanceiro(startDate, endDate);
      return res.json(data);
    } catch (error) {
      console.error("Erro no Relatório Financeiro:", error);
      return res
        .status(500)
        .json({ error: "Erro interno ao processar relatório financeiro." });
    }
  }
}
