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
      return res.json(config);
    } catch (error) {
      console.error("Error fetching configuracao:", error);
      return res.status(500).json({ error: "Erro ao buscar configurações" });
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
