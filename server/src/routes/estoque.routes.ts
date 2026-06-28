import { Router } from "express";
import { EstoqueController } from "../controllers/estoque.controller.js";

const estoqueRoutes = Router();
const controller = new EstoqueController();

estoqueRoutes.post("/repom", controller.repomEstoque.bind(controller));
estoqueRoutes.post("/sincronizar-nf", controller.sincronizarNotaFiscal.bind(controller));
estoqueRoutes.get("/buscar", controller.buscarGlobal.bind(controller));
estoqueRoutes.get("/nota-fiscal/:numero", controller.buscarPorNotaFiscal.bind(controller));

export { estoqueRoutes };
