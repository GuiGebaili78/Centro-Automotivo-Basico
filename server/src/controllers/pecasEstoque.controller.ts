import { Request, Response } from 'express';
import { PecasEstoqueRepository } from '../repositories/pecasEstoque.repository.js';

const repository = new PecasEstoqueRepository();

export class PecasEstoqueController {
  async create(req: Request, res: Response) {
    try {
      const peca = await repository.create(req.body);
      res.status(201).json(peca);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Peca', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pecas = await repository.findAll();
      res.json(pecas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Pecas' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const peca = await repository.findById(id);
      if (!peca) {
        return res.status(404).json({ error: 'Peca not found' });
      }
      res.json(peca);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Peca' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const peca = await repository.update(id, req.body);
      res.json(peca);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Peca' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Peca' });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) return res.json([]);
      const pecas = await repository.search(query);
      res.json(pecas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search Pecas' });
    }
  }
}
