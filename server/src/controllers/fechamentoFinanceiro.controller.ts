import { Request, Response } from 'express';
import { FechamentoFinanceiroRepository } from '../repositories/fechamentoFinanceiro.repository.js';

const repository = new FechamentoFinanceiroRepository();

export class FechamentoFinanceiroController {
  async create(req: Request, res: Response) {
    try {
      const fechamento = await repository.create(req.body);
      res.status(201).json(fechamento);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Fechamento Financeiro', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const fechamentos = await repository.findAll();
      res.json(fechamentos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Fechamentos Financeiros' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const fechamento = await repository.findById(id);
      if (!fechamento) {
        return res.status(404).json({ error: 'Fechamento Financeiro not found' });
      }
      res.json(fechamento);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Fechamento Financeiro' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const fechamento = await repository.update(id, req.body);
      res.json(fechamento);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Fechamento Financeiro' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Fechamento Financeiro' });
    }
  }
}
