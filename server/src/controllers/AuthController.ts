import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UsuarioRepository } from "../repositories/UsuarioRepository.js";

const usuarioRepository = new UsuarioRepository();

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
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res
          .status(400)
          .json({ error: "E-mail e senha são obrigatórios." });
      }

      const usuario = await usuarioRepository.findByEmail(email);

      if (!usuario) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

      if (!senhaValida) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      // Separa a senha do restante dos dados para não retornar no JSON
      const { senha_hash, ...usuarioSemSenha } = usuario;

      const token = jwt.sign(
        { id_usuario: usuario.id_usuario, perfil: usuario.perfil },
        (process.env.JWT_SECRET as string) ||
          "insira_uma_chave_aleatoria_super_segura_aqui",
        { expiresIn: "1d" },
      );

      return res.status(200).json({
        usuario: usuarioSemSenha,
        token,
        must_change_password: usuario.must_change_password,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ error: "Erro interno do servidor." });
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
}
