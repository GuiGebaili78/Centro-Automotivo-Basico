import { Request, Response } from 'express';
import { TipoRepository } from '../repositories/tipo.repository.js';

const repository = new TipoRepository();

export class TipoController {
  async create(req: Request, res: Response) {
    try {
      const tipo = await repository.create(req.body);
      res.status(201).json(tipo);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Tipo', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const tipos = await repository.findAll();
      res.json(tipos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Tipos' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const tipo = await repository.findById(id);
      if (!tipo) {
        return res.status(404).json({ error: 'Tipo not found' });
      }
      res.json(tipo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Tipo' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const tipo = await repository.update(id, req.body);
      res.json(tipo);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Tipo' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Tipo' });
    }
  }
}
