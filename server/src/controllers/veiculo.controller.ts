import { Request, Response } from 'express';
import { VeiculoRepository } from '../repositories/veiculo.repository.js';

const repository = new VeiculoRepository();

export class VeiculoController {
  async create(req: Request, res: Response) {
    try {
      const veiculo = await repository.create(req.body);
      res.status(201).json(veiculo);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Veiculo', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const veiculos = await repository.findAll();
      res.json(veiculos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Veiculos' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const veiculo = await repository.findById(id);
      if (!veiculo) {
        return res.status(404).json({ error: 'Veiculo not found' });
      }
      res.json(veiculo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Veiculo' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const veiculo = await repository.update(id, req.body);
      res.json(veiculo);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Veiculo' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Veiculo' });
    }
  }
}
