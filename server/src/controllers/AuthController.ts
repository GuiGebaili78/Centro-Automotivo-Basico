import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UsuarioRepository } from "../repositories/UsuarioRepository.js";
import { AuthService } from "../services/AuthService.js";

const usuarioRepository = new UsuarioRepository();
const authService = new AuthService();

export class AuthController {
  async setupAdmin(req: Request, res: Response): Promise<Response | any> {
    try {
      const { nome, email, senha } = req.body;

      if (!nome || !email || !senha) {
        return res
          .status(400)
          .json({ error: "Nome, e-mail e senha são obrigatórios." });
      }

      // Trava de segurança: Verifica se já existe algum usuário no sistema
      const count = await usuarioRepository.count();
      if (count > 0) {
        return res
          .status(403)
          .json({ error: "Setup inicial já foi realizado. Acesso negado." });
      }

      // Hash da senha usando o bcrypt importado
      const senha_hash = await bcrypt.hash(senha, 10);

      const novoUsuario = await usuarioRepository.create({
        nome,
        email,
        senha_hash,
        perfil: "ADMIN",
      });

      const { senha_hash: _, ...usuarioSemSenha } = novoUsuario;

      return res.status(201).json({
        message: "Administrador criado com sucesso.",
        usuario: usuarioSemSenha,
      });
    } catch (error) {
      console.error("Erro no setup do admin:", error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }

  async login(req: Request, res: Response): Promise<Response | any> {
    try {
      const { email, password } = req.body;
      const senhaFornecida = password || req.body.senha;

      if (!email || !senhaFornecida) {
        return res
          .status(400)
          .json({ error: "E-mail e senha são obrigatórios." });
      }

      const result = await authService.login(email, senhaFornecida);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro no login:", error);
      // Retornar genérico
      return res.status(401).json({ error: "Credenciais inválidas." });
    }
  }

  async changePassword(req: Request, res: Response): Promise<Response | any> {
    try {
      const { senha_atual, nova_senha } = req.body;
      const usuarioAuth = (req as any).usuario as
        | { id_usuario: number }
        | undefined;

      if (!usuarioAuth?.id_usuario) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      if (!senha_atual || !nova_senha) {
        return res
          .status(400)
          .json({ error: "Senha atual e nova senha são obrigatórias." });
      }

      if (typeof nova_senha !== "string" || nova_senha.length < 8) {
        return res
          .status(400)
          .json({ error: "A nova senha deve ter ao menos 8 caracteres." });
      }

      const usuario = await usuarioRepository.findById(usuarioAuth.id_usuario);
      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      const senhaConfere = await bcrypt.compare(senha_atual, usuario.senha_hash);
      if (!senhaConfere) {
        return res.status(401).json({ error: "Senha atual incorreta." });
      }

      if (senha_atual === nova_senha) {
        return res
          .status(400)
          .json({ error: "A nova senha deve ser diferente da atual." });
      }

      const novo_hash = await bcrypt.hash(nova_senha, 10);
      await usuarioRepository.updatePassword(usuario.id_usuario, novo_hash);

      return res
        .status(200)
        .json({ message: "Senha alterada com sucesso." });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
  }

  async getServerTime(req: Request, res: Response): Promise<Response> {
    return res.status(200).json({ serverTime: new Date().toISOString() });
  }

  async forgotPassword(req: Request, res: Response): Promise<Response | any> {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório." });
      }

      await authService.forgotPassword(email);

      // Privacy Lock: Sempre retornar 200 genérico para evitar enumeração de usuário.
      return res.status(200).json({ 
        message: "Se o e-mail estiver cadastrado, um link de recuperação foi enviado." 
      });
    } catch (error) {
      console.error("[AuthController] forgotPassword error:", error);
      return res.status(500).json({ error: "Erro interno ao processar a solicitação." });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response | any> {
    try {
      const { email, token, password } = req.body;
      if (!email || !token || !password) {
        return res.status(400).json({ error: "E-mail, token e nova senha são obrigatórios." });
      }

      await authService.resetPassword(email, token, password);
      return res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Erro ao redefinir a senha." });
    }
  }
}
