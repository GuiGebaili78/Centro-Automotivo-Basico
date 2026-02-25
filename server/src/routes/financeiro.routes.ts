import { Router } from "express";
import { FinanceiroController } from "../controllers/financeiro.controller.js";

const financeiroRoutes = Router();
const controller = new FinanceiroController();

financeiroRoutes.get("/summary", controller.getGeneralSummary);
financeiroRoutes.get("/kpis", controller.getKPIs);
financeiroRoutes.get("/evolution", controller.getEvolution);

export { financeiroRoutes };
