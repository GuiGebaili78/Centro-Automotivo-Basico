import { Router } from "express";
import { PagamentoPecaController } from "../controllers/pagamentoPeca.controller.js";

const pagamentoPecaRoutes = Router();
const controller = new PagamentoPecaController();

pagamentoPecaRoutes.post("/", controller.create);
pagamentoPecaRoutes.get("/", controller.findAll);
pagamentoPecaRoutes.get("/:id", controller.findById);
pagamentoPecaRoutes.put("/:id", controller.update);
pagamentoPecaRoutes.post("/baixa", controller.baixa);
pagamentoPecaRoutes.delete("/:id", controller.delete);

export { pagamentoPecaRoutes };
