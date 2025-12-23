import { Request, Response } from 'express';
import { ServicoMaoDeObraRepository } from '../repositories/servicoMaoDeObra.repository.js';

const repository = new ServicoMaoDeObraRepository();

export class ServicoMaoDeObraController {
  async create(req: Request, res: Response) {
    try {
      const { id_os, id_funcionario, valor, descricao } = req.body;
      const result = await repository.create({ 
          id_os: Number(id_os), 
          id_funcionario: Number(id_funcionario), 
          valor: Number(valor), 
          descricao 
      });
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add labor service' });
    }
  }

  async index(req: Request, res: Response) {
      try {
          const { id_os } = req.params;
          const result = await repository.findAllByOs(Number(id_os));
          res.json(result);
      } catch (error) {
          res.status(500).json({ error: 'Failed to fetch labor services' });
      }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await repository.update(Number(id), data);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update labor service' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await repository.softDelete(Number(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete labor service' });
    }
  }
}

export const servicoMaoDeObraController = new ServicoMaoDeObraController();
