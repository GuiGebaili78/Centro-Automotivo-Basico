import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post("/setup", authController.setupAdmin);
authRoutes.post("/login", authController.login);
authRoutes.post(
  "/change-password",
  authMiddleware,
  authController.changePassword,
);

export { authRoutes };
