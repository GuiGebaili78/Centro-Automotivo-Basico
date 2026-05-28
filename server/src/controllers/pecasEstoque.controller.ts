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

  async createEntry(req: Request, res: Response) {
    try {
        const payload = req.body;
        if (payload && typeof payload.nf_numero === 'string') {
          payload.nf_numero = payload.nf_numero.trim() || null;
        }
        const entry = await repository.createEntry(payload);
        res.status(201).json(entry);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ error: 'Failed to create entry', details: error.message || error });
    }
  }

  async findEntryById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const entry = await repository.findEntryById(id);
      if (!entry) return res.status(404).json({ error: 'Entrada de estoque não encontrada.' });
      res.json(entry);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar entrada de estoque.', details: error.message });
    }
  }

  async updateEntry(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const payload = req.body;
      if (payload && typeof payload.nf_numero === 'string') {
        payload.nf_numero = payload.nf_numero.trim() || null;
      }
      const updated = await repository.updateEntry(id, payload);
      res.json(updated);
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message || 'Erro ao atualizar entrada de estoque.' });
    }
  }

  async deleteEntry(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.deleteEntry(id);
      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message || 'Erro ao deletar entrada de estoque.' });
    }
  }

  async getAvailability(req: Request, res: Response) {
      try {
          const id = Number(req.params.id);
          const result = await repository.getAvailability(id);
          if (!result) return res.status(404).json({error: 'Part not found'});
          res.json(result);
      } catch (error) {
          res.status(500).json({ error: 'Failed to fetch availability' });
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
