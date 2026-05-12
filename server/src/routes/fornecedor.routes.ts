import { Router } from "express";
import { FornecedorController } from "../controllers/fornecedor.controller.js";

const router = Router();
const controller = new FornecedorController();

router.post("/", controller.create.bind(controller));
router.get("/", controller.findAll.bind(controller));
router.get("/:id", controller.findById.bind(controller));
router.put("/:id", controller.update.bind(controller));
router.delete("/:id", controller.delete.bind(controller));

export { router as fornecedorRoutes };
