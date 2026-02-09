import { Router } from "express";
import { DocumentoController } from "../controllers/documento.controller.js";

const documentoRoutes = Router();
const controller = new DocumentoController();

documentoRoutes.get("/:id/pdf", controller.generatePdf);

export { documentoRoutes };
