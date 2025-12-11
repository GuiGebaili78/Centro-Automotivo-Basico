import { Request, Response } from 'express';
import { PessoaRepository } from '../repositories/pessoa.repository.js';

const repository = new PessoaRepository();

export class PessoaController {
  async create(req: Request, res: Response) {
    try {
      const pessoa = await repository.create(req.body);
      res.status(201).json(pessoa);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Pessoa', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pessoas = await repository.findAll();
      res.json(pessoas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Pessoas' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pessoa = await repository.findById(id);
      if (!pessoa) {
        return res.status(404).json({ error: 'Pessoa not found' });
      }
      res.json(pessoa);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Pessoa' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pessoa = await repository.update(id, req.body);
      res.json(pessoa);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Pessoa' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Pessoa' });
    }
  }
}
