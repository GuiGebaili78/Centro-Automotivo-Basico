import { Request, Response } from "express";
import { VeiculoRepository } from "../repositories/veiculo.repository.js";

const repository = new VeiculoRepository();

export class VeiculoController {
  async create(req: Request, res: Response) {
    try {
      const veiculo = await repository.create(req.body);
      res.status(201).json(veiculo);
    } catch (error) {
      res
        .status(400)
        .json({ error: "Failed to create Veiculo", details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const veiculos = await repository.findAll();
      res.json(veiculos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Veiculos" });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const veiculo = await repository.findById(id);
      if (!veiculo) {
        return res.status(404).json({ error: "Veiculo not found" });
      }
      res.json(veiculo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Veiculo" });
    }
  }

  async findByPlaca(req: Request, res: Response) {
    try {
      const placa = req.params.placa as string;
      if (!placa) {
        return res.status(400).json({ error: "Placa required" });
      }
      const veiculo = await repository.findByPlaca(placa);
      // NOTE: We return 404 explicitly if not found to trigger the frontend "Not Found" logic
      if (!veiculo) {
        return res.status(404).json({ error: "Veiculo not found" });
      }
      res.json(veiculo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Veiculo by placa" });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const veiculos = await repository.search(query);
      res.json(veiculos);
    } catch (error) {
      res.status(500).json({ error: "Failed to search Veiculos" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const veiculo = await repository.update(id, req.body);
      res.json(veiculo);
    } catch (error) {
      res.status(400).json({ error: "Failed to update Veiculo" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      // Check if vehicle has service orders
      const veiculoWithOS = await repository.findById(id);
      if (
        veiculoWithOS &&
        veiculoWithOS.ordens_de_servico &&
        veiculoWithOS.ordens_de_servico.length > 0
      ) {
        return res.status(400).json({
          error:
            "Não é possível excluir veículo com ordens de serviço cadastradas.",
          message:
            "Este veículo possui ordens de serviço associadas. Não é possível excluí-lo.",
        });
      }

      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete Veiculo" });
    }
  }
}
