import { Request, Response } from 'express';
import { FinalizacaoRepository } from '../repositories/finalizacao.repository.js';

const repository = new FinalizacaoRepository();

export class FinalizacaoController {
  async create(req: Request, res: Response) {
    try {
      const finalizacao = await repository.create(req.body);
      res.status(201).json(finalizacao);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Finalizacao', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const finalizacoes = await repository.findAll();
      res.json(finalizacoes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Finalizacoes' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const finalizacao = await repository.findById(id);
      if (!finalizacao) {
        return res.status(404).json({ error: 'Finalizacao not found' });
      }
      res.json(finalizacao);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Finalizacao' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const finalizacao = await repository.update(id, req.body);
      res.json(finalizacao);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Finalizacao' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Finalizacao' });
    }
  }
}
