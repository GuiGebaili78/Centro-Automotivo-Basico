import { Router } from "express";
import * as OperadoraController from "../controllers/operadoraCartao.controller.js";

export const operadoraRoutes = Router();

operadoraRoutes.get("/", OperadoraController.getAll);
operadoraRoutes.post("/", OperadoraController.create);
operadoraRoutes.put("/:id/toggle-status", OperadoraController.toggleStatus);
operadoraRoutes.put("/:id", OperadoraController.update);
