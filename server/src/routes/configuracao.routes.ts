import { Router } from "express";
import { ConfiguracaoController } from "../controllers/configuracao.controller.js";
import { upload } from "../config/multer.js";

const router = Router();

router.get("/", ConfiguracaoController.get);
router.post("/", upload.single("logo"), ConfiguracaoController.upsert);
router.post("/upload-logo-impressao", upload.single("logoImpressao"), ConfiguracaoController.uploadLogoImpressao);

export default router;
