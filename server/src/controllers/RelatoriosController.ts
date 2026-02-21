import { Request, Response } from "express";
import { relatoriosService } from "../services/RelatoriosService.js";

export class RelatoriosController {
  async getResumoFinanceiro(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = await relatoriosService.getResumoFinanceiro(start, end);
      return res.json(data);
    } catch (error) {
      console.error("Error in getResumoFinanceiro:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getPerformanceEquipe(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = await relatoriosService.getPerformanceEquipe(start, end);
      return res.json(data);
    } catch (error) {
      console.error("Error in getPerformanceEquipe:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getOperadorasCartao(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = await relatoriosService.getOperadorasCartao(start, end);
      return res.json(data);
    } catch (error) {
      console.error("Error in getOperadorasCartao:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getEvolucaoMensal(req: Request, res: Response) {
    try {
      const { groupBy, startDate, endDate } = req.query;

      // Datas obrigatórias — fallback para o mês corrente se não informadas
      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate
        ? new Date(endDate as string)
        : new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0,
            23,
            59,
            59,
          );

      const data = await relatoriosService.getEvolucaoMensal(
        start,
        end,
        (groupBy as "month" | "quarter" | "semester" | "year") || "month",
      );
      return res.json(data);
    } catch (error) {
      console.error("Error in getEvolucaoMensal:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getEvolucaoDespesas(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = await relatoriosService.getEvolucaoDespesas(start, end);
      return res.json(data);
    } catch (error) {
      console.error("Error in getEvolucaoDespesas:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getEvolucaoDespesasTemporal(req: Request, res: Response) {
    try {
      const { categoriaFiltro } = req.query;
      const data = await relatoriosService.getEvolucaoDespesasTemporal(
        categoriaFiltro as string | undefined,
      );
      return res.json(data);
    } catch (error) {
      console.error("Error in getEvolucaoDespesasTemporal:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}

export const relatoriosController = new RelatoriosController();
