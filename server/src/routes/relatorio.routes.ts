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

relatoriosRoutes.get(
  "/despesas-evolucao",
  relatoriosController.getEvolucaoDespesas,
);

// Timeline de 10 meses (6 passados + 4 futuros) com filtro opcional de categoria
relatoriosRoutes.get(
  "/despesas-temporal",
  relatoriosController.getEvolucaoDespesasTemporal,
);

export { relatoriosRoutes };
