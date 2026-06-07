import { Request, Response } from "express";
import { ConfiguracaoRepository } from "../repositories/configuracao.repository.js";
import fs from "fs";
import path from "path";

// Garantia secundária de que o diretório uploads existe (complementa multer.ts)
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[Configuracao] Created uploads directory: ${uploadsDir}`);
}

interface AuthenticatedRequest extends Request {
  file?: Express.Multer.File;
}

export const ConfiguracaoController = {
  get: async (req: Request, res: Response) => {
    try {
      const config = await ConfiguracaoRepository.get();
      // Retorna config ou objeto neutro — NUNCA deixa o frontend sem dados
      return res.json(
        config ?? {
          id: null,
          nomeFantasia: "Oficina",
          razaoSocial: "",
          cnpj: "",
          inscricaoEstadual: "",
          endereco: "",
          telefone: "",
          telefone2: "",
          email: "",
          logoUrl: null,
          logoImpressaoUrl: null,
        },
      );
    } catch (error) {
      // Coluna inexistente no banco ou qualquer erro de runtime → retorna dados
      // neutros para não quebrar a Sidebar / tela de Configurações
      console.error(
        "Error fetching configuracao (retornando fallback):",
        error,
      );
      return res.status(200).json({
        id: null,
        nomeFantasia: "Oficina",
        razaoSocial: "",
        cnpj: "",
        inscricaoEstadual: "",
        endereco: "",
        telefone: "",
        telefone2: "",
        email: "",
        logoUrl: null,
        logoImpressaoUrl: null,
      });
    }
  },

  upsert: async (req: Request, res: Response) => {
    try {
      const {
        nomeFantasia,
        razaoSocial,
        cnpj,
        inscricaoEstadual,
        endereco,
        telefone,
        telefone2,
        email,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
      } = req.body;

      let logoUrl = undefined;

      const request = req as AuthenticatedRequest;

      // Get current config to check for existing logo
      const currentConfig = await ConfiguracaoRepository.get();

      if (request.file) {
        // Construct the URL path for the uploaded file
        logoUrl = `/uploads/${request.file.filename}`;

        // Delete old logo file if it exists
        if (currentConfig?.logoUrl) {
          const oldLogoPath = path.join(
            process.cwd(),
            "uploads",
            path.basename(currentConfig.logoUrl),
          );
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
      } else if (req.body.logoUrl === "" && currentConfig?.logoUrl) {
        // Logo is being removed, delete the file
        const oldLogoPath = path.join(
          process.cwd(),
          "uploads",
          path.basename(currentConfig.logoUrl),
        );
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
        logoUrl = "";
      }

      const data: any = {
        nomeFantasia: nomeFantasia || "Oficina", // NOT NULL guard
        razaoSocial,
        cnpj,
        inscricaoEstadual,
        endereco,
        telefone,
        telefone2,
        email,
        smtpHost,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser,
        smtpPass,
      };

      if (logoUrl !== undefined) {
        data.logoUrl = logoUrl;
      }

      const config = await ConfiguracaoRepository.upsert(data);
      return res.json(config);
    } catch (error) {
      console.error("[CRÍTICO] Falha ao salvar configuração:", error);
      const details = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: "Erro ao salvar configurações", details });
    }
  },

  uploadLogoImpressao: async (req: Request, res: Response) => {
    try {
      const request = req as AuthenticatedRequest;
      if (!request.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      const logoImpressaoUrl = `/uploads/${request.file.filename}`;

      // Get current config to check for existing logo impressao to delete
      const currentConfig = await ConfiguracaoRepository.get();

      if (currentConfig?.logoImpressaoUrl) {
        const oldLogoPath = path.join(
          process.cwd(),
          "uploads",
          path.basename(currentConfig.logoImpressaoUrl)
        );
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      const data: any = {
        logoImpressaoUrl,
      };

      if (!currentConfig) {
        // Se por algum motivo for a primeira inserção da tabela inteira,
        // precisamos de um nome fantasia padrão obrigatório para não violar a restrição de NOT NULL
        data.nomeFantasia = "Oficina";
      }

      const config = await ConfiguracaoRepository.upsert(data);
      return res.json(config);
    } catch (error) {
      console.error("[CRÍTICO] Falha ao salvar configuração (logo impressão):", error);
      const details = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: "Erro ao fazer upload da logo de impressão", details });
    }
  },
};
