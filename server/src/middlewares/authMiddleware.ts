import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_in_production";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // BYPASS: Pula a verificação JWT temporariamente
  (req as any).user = {
    id_usuario: 1,
    nome: "Desenvolvedor",
    perfil: "ADMIN"
  };
  return next();
};
