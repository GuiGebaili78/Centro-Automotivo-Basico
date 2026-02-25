import nodemailer from "nodemailer";
import { ConfiguracaoRepository } from "../repositories/configuracao.repository.js";

/**
 * EmailService
 *
 * Handles sending emails for the automotive center.
 * IMPORTANT: To use Gmail, you must generate an "App Password" (Senha de Aplicativo)
 * in your Google Account security settings.
 */
export const EmailService = {
  /**
   * Gets the SMTP transporter based on workshop configuration
   */
  getTransporter: async () => {
    const config = await ConfiguracaoRepository.get();

    const host = config?.smtpHost || "smtp.gmail.com";
    const port = Number(config?.smtpPort) || 587;
    const user = config?.smtpUser || "guilhermecorretor@gmail.com"; // Fallback for tests
    const pass = config?.smtpPass || ""; // Needs to be configured via UI or Env

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // Helps with some SMTP servers
      },
    });
  },

  /**
   * Sends an email with the Order of Service data
   */
  sendOsEmail: async (osData: any, remetenteEmail: string) => {
    try {
      const transporter = await EmailService.getTransporter();
      const config = await ConfiguracaoRepository.get();

      const workshopName = config?.nomeFantasia || "Centro Automotivo";
      const user = config?.smtpUser || "guilhermecorretor@gmail.com";

      const mailOptions = {
        from: `"${workshopName}" <${user}>`,
        to: osData.cliente.email,
        subject: `Ordem de Serviço #${osData.id_os} - ${workshopName}`,
        html: `
          <h1>Olá, ${osData.cliente.pessoa_fisica?.nome || osData.cliente.pessoa_juridica?.nome_fantasia || "Cliente"}!</h1>
          <p>Segue abaixo os detalhes da sua Ordem de Serviço:</p>
          <hr />
          <p><strong>OS:</strong> #${osData.id_os}</p>
          <p><strong>Veículo:</strong> ${osData.veiculo.marca} ${osData.veiculo.modelo} (${osData.veiculo.placa})</p>
          <p><strong>Status:</strong> ${osData.status}</p>
          <p><strong>Valor Total:</strong> R$ ${Number(osData.valor_final || 0).toFixed(2)}</p>
          <hr />
          <p>Para mais detalhes, entre em contato conosco.</p>
          <p>Atenciosamente,<br /><strong>${workshopName}</strong></p>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email enviado: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      throw new Error("Falha ao enviar o email da OS.");
    }
  },
};
