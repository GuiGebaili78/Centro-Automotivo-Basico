import nodemailer from "nodemailer";
import { Telegraf } from "telegraf";

export class NotificationService {
  private transporter;
  private bot: Telegraf | null = null;

  constructor() {
    // Email Setup
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Telegram Setup
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: any[],
  ) {
    if (!to) throw new Error("Destinatário de email não informado");

    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || "Centro Automotivo"}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments,
      });
      console.log("Email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Falha ao enviar email");
    }
  }

  async sendTelegram(
    chatId: string,
    message: string,
    documentBuffer?: Buffer,
    filename: string = "documento.pdf",
  ) {
    if (!this.bot)
      throw new Error("Telegram Bot não configurado (Token ausente)");
    if (!chatId) throw new Error("Chat ID do Telegram não informado");

    try {
      if (documentBuffer) {
        await this.bot.telegram.sendDocument(
          chatId,
          {
            source: documentBuffer,
            filename: filename,
          },
          { caption: message },
        );
      } else {
        await this.bot.telegram.sendMessage(chatId, message);
      }
      console.log("Telegram message sent to", chatId);
    } catch (error) {
      console.error("Error sending telegram:", error);
      throw new Error("Falha ao enviar mensagem no Telegram");
    }
  }
}
