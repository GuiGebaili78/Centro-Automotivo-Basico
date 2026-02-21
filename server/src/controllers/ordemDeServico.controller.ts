import { Request, Response } from "express";
import { OrdemDeServicoService } from "../services/OrdemDeServicoService.js";
import { MensageriaService } from "../services/MensageriaService.js";

const service = new OrdemDeServicoService();
const mensageria = new MensageriaService();

export class OrdemDeServicoController {
  async create(req: Request, res: Response) {
    try {
      const os = await service.create(req.body);
      res.status(201).json(os);
    } catch (error) {
      res.status(400).json({
        error: "Failed to create OS",
        details: error instanceof Error ? error.message : error,
      });
    }
  }

  async createUnified(req: Request, res: Response) {
    try {
      const result = await service.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Unified Create Error:", error);
      res.status(400).json({
        error: "Failed to create OS Unified",
        details: error instanceof Error ? error.message : error,
      });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      console.error("OrdemDeServicoController.findAll called");
      const oss = await service.findAll(req.query);
      res.json(oss);
    } catch (error) {
      console.error("OrdemDeServicoController.findAll Error:", error);
      res.status(500).json({ error: "Failed to fetch OSs" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const os = await service.findById(id);
      if (!os) {
        return res.status(404).json({ error: "OS not found" });
      }
      res.json(os);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OS" });
    }
  }

  async findByVehicleId(req: Request, res: Response) {
    try {
      const vehicleId = Number(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ error: "Invalid Vehicle ID" });
      }

      const oss = await service.findByVehicleId(vehicleId);
      res.json(oss);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OSs for vehicle" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const os = await service.update(id, req.body);
      res.json(os);
    } catch (error) {
      console.error("Update OS Error:", error);
      res.status(400).json({
        error: "Failed to update OS",
        details: error instanceof Error ? error.message : error,
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: "Failed to delete OS",
        details: error instanceof Error ? error.message : error,
      });
    }
  }

  async getPdf(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const os = await service.findById(id);
      if (!os) {
        return res.status(404).json({ error: "OS not found" });
      }

      const pdfBuffer = await mensageria.gerarPdfOs(os);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=OS-${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }

  async send(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { method, target } = req.body; // method: "EMAIL" | "TELEGRAM"

      if (!method || !target) {
        return res
          .status(400)
          .json({ error: "Method and target are required" });
      }

      const os = await service.findById(id);
      if (!os) {
        return res.status(404).json({ error: "OS not found" });
      }

      const pdfBuffer = await mensageria.gerarPdfOs(os);

      if (method === "EMAIL") {
        try {
          await mensageria.enviarEmail(target, os, pdfBuffer);
        } catch (e: any) {
          return res.status(500).json({ error: e.message || e });
        }
      } else if (method === "TELEGRAM") {
        await mensageria.enviarTelegram(target, os, pdfBuffer);
      } else {
        return res.status(400).json({ error: "Invalid method" });
      }

      res.json({ success: true, message: `Sent via ${method}` });
    } catch (error: any) {
      console.error("Send Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to send document" });
    }
  }
}
