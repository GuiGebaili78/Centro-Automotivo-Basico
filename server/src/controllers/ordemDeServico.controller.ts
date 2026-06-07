import { Request, Response } from "express";
import { OrdemDeServicoService } from "../services/OrdemDeServicoService.js";
import { MensageriaService } from "../services/MensageriaService.js";
import { EmailService } from "../services/email.service.js";

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
      const includeInternal = req.query.includeInternal === "true";
      const os = await service.findById(id, includeInternal);
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

  async reabrir(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const os = await service.reabrirOS(id);
      res.json({ success: true, message: "OS reaberta com sucesso", os });
    } catch (error) {
      console.error("Reopen OS Error:", error);
      res.status(400).json({
        error: "Failed to reopen OS",
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

      // Filename construction
      const clientNameRaw = os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.nome_fantasia || os.cliente?.pessoa_juridica?.razao_social || "Cliente";
      let itemDesc = "Documento";
      
      if (os.veiculo) {
        const marca = os.veiculo.marca || "";
        const modelo = os.veiculo.modelo || "";
        const cor = os.veiculo.cor || "";
        const placa = os.veiculo.placa || "";
        itemDesc = `${marca} ${modelo} ${cor} ${placa}`.trim();
      } else if (os.equipamento) {
        const peca = os.equipamento.nome_peca || "";
        const fabricante = os.equipamento.fabricante || "";
        const numeracao = os.equipamento.numeracao || "";
        itemDesc = `${peca} ${fabricante} ${numeracao}`.trim();
      }
      
      const isOrcamento = os.status !== "FINALIZADA" && os.status !== "PAGA_CLIENTE";
      const docType = isOrcamento ? "Orcamento" : "OS";
      const rawFilename = `${docType}_${os.id_os} - ${itemDesc} - ${clientNameRaw}`;
      const filename = rawFilename.replace(/[/\\?%*:|"<>\s]+/g, " ").trim() + ".pdf";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
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

  async enviarEmail(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { remetenteEmail } = req.body;

      const os = await service.findById(id);
      if (!os) {
        return res.status(404).json({ error: "OS not found" });
      }

      const emailInfo = await EmailService.sendOsEmail(os, remetenteEmail);
      res.json({
        success: true,
        message: "Email enviado com sucesso",
        info: emailInfo,
      });
    } catch (error: any) {
      console.error("Erro ao enviar email da OS:", error);
      res
        .status(500)
        .json({ error: error.message || "Falha ao enviar o email" });
    }
  }
}
