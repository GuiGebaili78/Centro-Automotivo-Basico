import { Router } from "express";
import { relatoriosController } from "../controllers/RelatoriosController.js";
import { RelatorioController } from "../controllers/RelatorioController.js"; // Import Class directly if default export isn't there

const relatoriosRoutes = Router();
const legacyController = new RelatorioController(); // Instantiate Legacy Controller

relatoriosRoutes.get("/resumo", relatoriosController.getResumoFinanceiro);
relatoriosRoutes.get("/equipe", relatoriosController.getPerformanceEquipe);
relatoriosRoutes.get("/operadoras", relatoriosController.getOperadorasCartao);
relatoriosRoutes.get("/evolucao", relatoriosController.getEvolucaoMensal);

// Legacy Endpoints (Keep using the Singular Controller for now)
relatoriosRoutes.get("/completo", legacyController.getRelatorioCompleto);
relatoriosRoutes.get("/dashboard", legacyController.getDashboardData);

// Endpoint faltando (Now in Plural Controller)
relatoriosRoutes.get(
  "/despesas-evolucao",
  relatoriosController.getEvolucaoDespesas,
);

export { relatoriosRoutes };
