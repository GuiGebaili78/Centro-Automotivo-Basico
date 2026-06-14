import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { UsuarioRepository } from "../repositories/UsuarioRepository.js";

const repository = new UsuarioRepository();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_in_production";
const JWT_EXPIRES_IN = "8h";

// Configure nodemailer transporter
// O usuário pode sobrescrever via variáveis de ambiente
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class AuthService {
  async login(email: string, senha_plana: string) {
    const usuario = await repository.findByEmail(email);
    if (!usuario) {
      throw new Error("Credenciais inválidas");
    }

    const senhaValida = await bcrypt.compare(senha_plana, usuario.senha_hash);
    if (!senhaValida) {
      throw new Error("Credenciais inválidas");
    }

    // JWT Payload Minimalista (Sem PII)
    const payload = {
      sub: usuario.id_usuario,
      role: usuario.perfil,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      must_change_password: usuario.must_change_password,
      usuario: {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  }

  async forgotPassword(email: string) {
    const usuario = await repository.findByEmail(email);
    
    // Privacy Lock: Sempre retorna sucesso sem erro, se não encontrar, retorna vazio.
    if (!usuario) {
      return; 
    }

    // Gerar token puro
    const token = crypto.randomBytes(32).toString("hex");
    
    // Hash do token
    const hashedToken = await bcrypt.hash(token, 10);
    
    // Expiração (15 minutos)
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Salvar o HASH no banco
    await repository.updateResetToken(usuario.id_usuario, hashedToken, expires);

    // Enviar token PURO por e-mail
    // A URL seria configurável no Frontend, ex: https://app.com/reset-password?token=XXX&email=YYY
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await transporter.sendMail({
        from: '"Centro Automotivo" <no-reply@centroautomotivo.com>',
        to: email,
        subject: "Recuperação de Senha",
        text: `Você solicitou a recuperação de senha. Acesse o link a seguir para redefinir sua senha: ${resetUrl}\n\nEste link expira em 15 minutos.`,
        html: `<p>Você solicitou a recuperação de senha.</p><p>Acesse o <a href="${resetUrl}">link</a> a seguir para redefinir sua senha.</p><p>Este link expira em <strong>15 minutos</strong>.</p>`,
      });
    } catch (err) {
      console.error("[AuthService] Falha ao enviar email de reset:", err);
      // Não propagar o erro ao usuário
    }
  }

  async resetPassword(email: string, token: string, nova_senha_plana: string) {
    const usuario = await repository.findByEmail(email);
    if (!usuario) {
      throw new Error("Token inválido ou expirado.");
    }

    // Verificar se existe um token no banco e se não expirou
    if (!usuario.reset_password_token || !usuario.reset_password_expires) {
      throw new Error("Token inválido ou expirado.");
    }

    if (new Date() > usuario.reset_password_expires) {
      throw new Error("Token expirado.");
    }

    // Validar o token recebido com o hash salvo
    const isValid = await bcrypt.compare(token, usuario.reset_password_token);
    if (!isValid) {
      throw new Error("Token inválido ou expirado.");
    }

    // Gerar novo hash de senha
    const newPasswordHash = await bcrypt.hash(nova_senha_plana, 10);

    // Atualizar no banco, e limpar os campos de reset
    await repository.updatePassword(usuario.id_usuario, newPasswordHash);
  }
}
