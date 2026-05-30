import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post("/setup", authController.setupAdmin);
authRoutes.post("/login", authController.login);
authRoutes.get("/time", (req, res) => authController.getServerTime(req, res));
authRoutes.post(
  "/change-password",
  authMiddleware,
  authController.changePassword,
);

export { authRoutes };
