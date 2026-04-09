import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Formato de token inválido." });
  }

  const token = parts[1] as string;

  try {
    const decoded = jwt.verify(
      token,
      (process.env.JWT_SECRET || "insira_uma_chave_aleatoria_super_segura_aqui") as string,
    );
    // Injeta os dados do usuário na requisição para uso posterior nas rotas protegidas
    (req as any).usuario = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}
