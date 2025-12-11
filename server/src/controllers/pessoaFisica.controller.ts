import { Request, Response } from 'express';
import { PessoaFisicaRepository } from '../repositories/pessoaFisica.repository.js';

const repository = new PessoaFisicaRepository();

export class PessoaFisicaController {
  async create(req: Request, res: Response) {
    try {
      const pessoaFisica = await repository.create(req.body);
      res.status(201).json(pessoaFisica);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create PessoaFisica', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pessoasFisicas = await repository.findAll();
      res.json(pessoasFisicas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch PessoasFisicas' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pessoaFisica = await repository.findById(id);
      if (!pessoaFisica) {
        return res.status(404).json({ error: 'PessoaFisica not found' });
      }
      res.json(pessoaFisica);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch PessoaFisica' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pessoaFisica = await repository.update(id, req.body);
      res.json(pessoaFisica);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update PessoaFisica' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete PessoaFisica' });
    }
  }
}
