import { Request, Response } from 'express';
import { FornecedorRepository } from '../repositories/fornecedor.repository.js';

const repository = new FornecedorRepository();

export class FornecedorController {
  async create(req: Request, res: Response) {
    try {
      const fornecedor = await repository.create(req.body);
      res.status(201).json(fornecedor);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Fornecedor', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const fornecedores = await repository.findAll();
      res.json(fornecedores);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Fornecedores' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const fornecedor = await repository.findById(id);
      if (!fornecedor) {
        return res.status(404).json({ error: 'Fornecedor not found' });
      }
      res.json(fornecedor);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Fornecedor' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const fornecedor = await repository.update(id, req.body);
      res.json(fornecedor);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Fornecedor' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Fornecedor' });
    }
  }
}
