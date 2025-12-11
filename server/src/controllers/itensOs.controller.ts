import { Request, Response } from 'express';
import { ItensOsRepository } from '../repositories/itensOs.repository.js';

const repository = new ItensOsRepository();

export class ItensOsController {
  async create(req: Request, res: Response) {
    try {
      const item = await repository.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Item OS', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const itens = await repository.findAll();
      res.json(itens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Itens OS' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const item = await repository.findById(id);
      if (!item) {
        return res.status(404).json({ error: 'Item OS not found' });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Item OS' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const item = await repository.update(id, req.body);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Item OS' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Item OS' });
    }
  }
}
