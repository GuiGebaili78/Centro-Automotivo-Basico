import { Router } from "express";
import { relatoriosController } from "../controllers/RelatoriosController.js";

const relatoriosRoutes = Router();

relatoriosRoutes.get("/resumo", relatoriosController.getResumoFinanceiro);
relatoriosRoutes.get("/equipe", relatoriosController.getPerformanceEquipe);
relatoriosRoutes.get("/operadoras", relatoriosController.getOperadorasCartao);
relatoriosRoutes.get("/evolucao", relatoriosController.getEvolucaoMensal);

export { relatoriosRoutes };
