import { Router } from "express";
import { RelatorioFinanceiroController } from "../controllers/RelatorioFinanceiroController.js";

const relatorioRoutes = Router();
const controller = new RelatorioFinanceiroController();

// ATENÇÃO: Verifique se o caminho no frontend bate com este: /relatorios/financeiro/dashboard
relatorioRoutes.get("/financeiro/dashboard", controller.getDashboard);

export { relatorioRoutes };
