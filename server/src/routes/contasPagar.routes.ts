import { Router } from "express";
import {
  createConta,
  getContas,
  getContaById,
  getRecurrenceInfo,
  updateConta,
  deleteConta,
  getDistinct,
  buscarDescricao,
  buscarCredor
} from "../controllers/contasPagar.controller.js";

const router = Router();

router.post("/", createConta);
router.get("/", getContas);
router.get("/distinct/:field", getDistinct);
router.get("/buscar-descricao", buscarDescricao);
router.get("/buscar-credor", buscarCredor);
router.get("/:id/recurrence-info", getRecurrenceInfo);
router.get("/:id", getContaById);
router.put("/:id", updateConta);
router.delete("/:id", deleteConta);

export default router;
