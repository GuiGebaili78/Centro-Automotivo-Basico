import { Request, Response } from "express";
import { ConfiguracaoRepository } from "../repositories/configuracao.repository.js";

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

      if (request.file) {
        // Construct the URL path for the uploaded file
        // Assumes static file serving is set up for 'uploads'
        logoUrl = `/uploads/${request.file.filename}`;
      }

      const data: any = {
        nomeFantasia,
        razaoSocial,
        cnpj,
        endereco,
        telefone,
        email,
      };

      if (logoUrl) {
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
