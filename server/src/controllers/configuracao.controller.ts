import { Request, Response } from "express";
import { ConfiguracaoRepository } from "../repositories/configuracao.repository.js";
import fs from "fs";
import path from "path";

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
          email: "",
          logoUrl: null,
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
        email: "",
        logoUrl: null,
      });
    }
  },

  upsert: async (req: Request, res: Response) => {
    try {
      const { nomeFantasia, razaoSocial, cnpj, endereco, telefone, email } =
        req.body;
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
        nomeFantasia,
        razaoSocial,
        cnpj,
        endereco,
        telefone,
        email,
      };

      if (logoUrl !== undefined) {
        data.logoUrl = logoUrl;
      }

      const config = await ConfiguracaoRepository.upsert(data);
      return res.json(config);
    } catch (error) {
      console.error("Error saving configuracao:", error);
      return res.status(500).json({ error: "Erro ao salvar configurações" });
    }
  },
};
