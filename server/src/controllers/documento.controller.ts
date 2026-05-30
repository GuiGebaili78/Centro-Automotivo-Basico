import { Request, Response } from "express";
import { DocumentoService } from "../services/DocumentoService.js";

const service = new DocumentoService();

export class DocumentoController {
  async generatePdf(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const { buffer, filename } = await service.generatePdf(id);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({
        error: "Erro ao gerar PDF",
        details: error.message,
      });
    }
  }

  async sendEmail(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { email } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      const { buffer, filename } = await service.generatePdf(id);
      await service.sendEmail(buffer, email, filename);

      res.json({ success: true, message: "Email enviado com sucesso" });
    } catch (error: any) {
      console.error("Erro ao enviar email:", error);
      res.status(500).json({
        error: "Erro ao enviar email",
        details: error.message,
      });
    }
  }

  async sendTelegram(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { chatId } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      if (!chatId) {
        return res.status(400).json({ error: "Chat ID é obrigatório" });
      }

      const { buffer, filename } = await service.generatePdf(id);
      await service.sendTelegram(buffer, chatId, filename);

      res.json({ success: true, message: "Telegram enviado com sucesso" });
    } catch (error: any) {
      console.error("Erro ao enviar telegram:", error);
      res.status(500).json({
        error: "Erro ao enviar telegram",
        details: error.message,
      });
    }
  }
}
