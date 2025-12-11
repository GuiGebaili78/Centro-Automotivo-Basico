import { Request, Response } from 'express';
import { PessoaJuridicaRepository } from '../repositories/pessoaJuridica.repository.js';

const repository = new PessoaJuridicaRepository();

export class PessoaJuridicaController {
  async create(req: Request, res: Response) {
    try {
      const pessoaJuridica = await repository.create(req.body);
      res.status(201).json(pessoaJuridica);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create PessoaJuridica', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const pessoasJuridicas = await repository.findAll();
      res.json(pessoasJuridicas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch PessoasJuridicas' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pessoaJuridica = await repository.findById(id);
      if (!pessoaJuridica) {
        return res.status(404).json({ error: 'PessoaJuridica not found' });
      }
      res.json(pessoaJuridica);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch PessoaJuridica' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pessoaJuridica = await repository.update(id, req.body);
      res.json(pessoaJuridica);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update PessoaJuridica' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete PessoaJuridica' });
    }
  }
}
