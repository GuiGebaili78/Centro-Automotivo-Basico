import { Router } from "express";
import { RelatorioController } from "../controllers/RelatorioController.js";

const relatorioRoutes = Router();
const controller = new RelatorioController();

// Rota principal para o relatório completo (KPIs, Gráficos, Rankings)
relatorioRoutes.get(
  "/completo",
  controller.getRelatorioCompleto.bind(controller),
);

export { relatorioRoutes };
