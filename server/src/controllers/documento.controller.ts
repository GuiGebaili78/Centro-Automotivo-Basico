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

      const pdfBuffer = await service.generatePdf(id);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=os-${id}.pdf`);
      res.send(pdfBuffer);
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

      const pdfBuffer = await service.generatePdf(id);
      await service.sendEmail(pdfBuffer, email);

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

      const pdfBuffer = await service.generatePdf(id);
      await service.sendTelegram(pdfBuffer, chatId);

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
