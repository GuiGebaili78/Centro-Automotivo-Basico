import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post("/setup", authController.setupAdmin);
authRoutes.post("/login", authController.login);

export { authRoutes };
