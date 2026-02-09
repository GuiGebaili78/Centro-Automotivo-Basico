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
}
