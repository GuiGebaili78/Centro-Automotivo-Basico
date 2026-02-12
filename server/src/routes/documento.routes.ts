import { Router } from "express";
import { DocumentoController } from "../controllers/documento.controller.js";

const documentoRoutes = Router();
const controller = new DocumentoController();

documentoRoutes.get("/:id/pdf", controller.generatePdf.bind(controller));
documentoRoutes.post("/:id/email", controller.sendEmail.bind(controller));
documentoRoutes.post("/:id/telegram", controller.sendTelegram.bind(controller));

export { documentoRoutes };
