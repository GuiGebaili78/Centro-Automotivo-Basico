import { Request, Response } from "express";
import { relatoriosService } from "../services/RelatoriosService.js";
import { dayjs, TIMEZONE, getDayBoundsSP, getMonthBoundsSP } from "../utils/date.js";

export class RelatorioController {
  async getRelatorioCompleto(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = getDayBoundsSP(startDate as string).start;
        end = getDayBoundsSP(endDate as string).end;
      } else {
        const bounds = getMonthBoundsSP(dayjs().tz(TIMEZONE));
        start = bounds.start;
        end = bounds.end;
      }

      const data = await relatoriosService.getRelatorioCompleto(start, end);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  }

  async getDashboardData(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const now = new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate
        ? new Date(endDate as string)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const data = await relatoriosService.getDashboardData(start, end);
      return res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao carregar dashboard." });
    }
  }
}
