import { Request, Response } from 'express';
import { FuncionarioRepository } from '../repositories/funcionario.repository.js';

const repository = new FuncionarioRepository();

export class FuncionarioController {
  async create(req: Request, res: Response) {
    try {
      const funcionario = await repository.create(req.body);
      res.status(201).json(funcionario);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create Funcionario', details: error });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const funcionarios = await repository.findAll();
      res.json(funcionarios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Funcionarios' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const funcionario = await repository.findById(id);
      if (!funcionario) {
        return res.status(404).json({ error: 'Funcionario not found' });
      }
      res.json(funcionario);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Funcionario' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const funcionario = await repository.update(id, req.body);
      res.json(funcionario);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update Funcionario' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete Funcionario' });
    }
  }

  // --- DIÁRIAS ---

  async registrarDiarias(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const lote = req.body.lote; // Array<{ data_trabalho, presente, valor_diaria }>
      if (!lote || !Array.isArray(lote)) {
        return res.status(400).json({ error: 'Formato de lote inválido' });
      }
      const resultados = await repository.registrarDiarias(id, lote);
      res.json(resultados);
    } catch (error) {
      res.status(400).json({ error: 'Falha ao registrar diárias', details: error });
    }
  }

  async listarDiarias(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { inicio, fim } = req.query;
      if (!inicio || !fim) {
        return res.status(400).json({ error: 'Período (inicio e fim) é obrigatório' });
      }
      const diarias = await repository.listarDiarias(id, inicio as string, fim as string);
      res.json(diarias);
    } catch (error) {
      res.status(500).json({ error: 'Falha ao buscar diárias', details: error });
    }
  }

  async marcarDiariasComoPagas(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const ids = req.body.ids; // Array<number>
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Formato de ids inválido' });
      }
      const result = await repository.marcarDiariasComoPagas(id, ids);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'Falha ao marcar diárias como pagas', details: error });
    }
  }
}
