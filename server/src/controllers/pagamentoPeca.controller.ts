import { Request, Response } from 'express';
import { PagamentoPecaRepository } from '../repositories/pagamentoPeca.repository.js';

const repository = new PagamentoPecaRepository();

export class PagamentoPecaController {
  async create(req: Request, res: Response) {
    try {
      const pagamento = await repository.create(req.body);
      res.status(201).json(pagamento);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Pagamento Peca', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pagamentos = await repository.findAll();
      res.json(pagamentos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Pagamentos Peca' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pagamento = await repository.findById(id);
      if (!pagamento) {
        return res.status(404).json({ error: 'Pagamento Peca not found' });
      }
      res.json(pagamento);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Pagamento Peca' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pagamento = await repository.update(id, req.body);
      res.json(pagamento);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Pagamento Peca' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Pagamento Peca' });
    }
  }
}
