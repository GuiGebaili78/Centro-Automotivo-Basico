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
  buscarCredor,
  getNfsPendentes,
  getNfSyncStatus,
  getNotasFiscaisCentral
} from "../controllers/contasPagar.controller.js";

const router = Router();

router.post("/", createConta);
router.get("/", getContas);
router.get("/nfs-pendentes", getNfsPendentes);
router.get("/nf-sync-status/:nf_numero", getNfSyncStatus);
router.get("/notas-fiscais", getNotasFiscaisCentral);
router.get("/distinct/:field", getDistinct);
router.get("/buscar-descricao", buscarDescricao);
router.get("/buscar-credor", buscarCredor);
router.get("/:id/recurrence-info", getRecurrenceInfo);
router.get("/:id", getContaById);
router.put("/:id", updateConta);
router.delete("/:id", deleteConta);

export default router;
